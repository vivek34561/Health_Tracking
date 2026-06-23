import json
from typing import Annotated, List, Dict, Any, Optional
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import AIMessage, ToolMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.core.config import get_settings
from app.services.groq_service import get_groq_client
from app.tools.health_tools import ALL_HEALTH_TOOLS

# ==========================================
# 1. STATE DEFINITION
# ==========================================

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    user_id: int
    jwt_token: str
    intent: str
    confirmation_required: bool
    confirm_action: Optional[Dict[str, Any]]
    reply: Optional[str]
    structured_data: Optional[Dict[str, Any]]
    sources_used: List[str]

# ==========================================
# 2. AGENT NODE
# ==========================================

async def agent_node(state: AgentState) -> Dict[str, Any]:
    settings = get_settings()
    
    # 1. System Prompt construction
    context_parts = []
    sources_used = list(state.get("sources_used", []))
    
    # Dynamically inject health summary for read/analytics intents
    if state["intent"] in ("READ", "ANALYTICS", "HYBRID") and "health_data" not in sources_used:
        try:
            from app.services.health_data_service import fetch_health_data, format_summary_for_prompt
            health_summary = await fetch_health_data(state["jwt_token"])
            health_context = format_summary_for_prompt(health_summary)
            context_parts.append(health_context)
            sources_used.append("health_data")
        except Exception as e:
            print(f"Agent summary fetch error: {e}")
            
    # Base agent persona
    system_prompt = (
        "You are HealthAI, a production-grade AI Health Coach and Agent.\n"
        "You help users manage weight, sleep, water intake, activities, and goals.\n"
        "You perform real-time actions (CRUD) on their health tracking application via tools.\n"
        "Rules:\n"
        "1. You must call tools to Create, Read, Update, or Delete metrics when requested.\n"
        "2. If you need to search medical reports, call search_medical_report.\n"
        "3. You must NEVER write or generate raw SQL queries under any circumstances.\n"
        "4. Keep responses concise, supportive, and practical.\n"
        "5. Never diagnose medical conditions. Refer to medical professionals if needed.\n\n"
    )
    
    if state["intent"] == "GREETING":
        system_prompt += (
            "User has sent a simple greeting. Do NOT execute any tools or actions.\n"
            "Do NOT reference previous conversation tasks like deletions or log updates.\n"
            "Just reply with a friendly, supportive welcome greeting, introduce yourself as HealthAI, "
            "and ask how you can help them track or analyze their health today.\n\n"
        )

    
    if context_parts:
        system_prompt += "\n".join(context_parts) + "\n\n"
        
    messages_to_send = [SystemMessage(content=system_prompt)]
    
    # Map state messages to standard langchain messages
    for msg in state["messages"]:
        if isinstance(msg, dict):
            role = msg.get("role")
            content = msg.get("content", "")
            if role == "user":
                messages_to_send.append(HumanMessage(content=content))
            elif role == "assistant":
                tool_calls = msg.get("tool_calls", [])
                formatted_tc = []
                for tc in tool_calls:
                    if "function" in tc:
                        formatted_tc.append({
                            "name": tc["function"].get("name"),
                            "args": json.loads(tc["function"].get("arguments", "{}")),
                            "id": tc.get("id")
                        })
                    else:
                        formatted_tc.append(tc)
                messages_to_send.append(AIMessage(content=content, tool_calls=formatted_tc))
            elif role == "system":
                messages_to_send.append(SystemMessage(content=content))
            elif role == "tool":
                messages_to_send.append(ToolMessage(
                    content=msg.get("content", ""),
                    name=msg.get("name", ""),
                    tool_call_id=msg.get("tool_call_id", "")
                ))
        else:
            messages_to_send.append(msg)
            
    # Call Groq via LangChain's ChatGroq wrapper (so it logs token usage to LangSmith)
    llm = ChatGroq(
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        temperature=0.0
    )
    llm_with_tools = llm.bind_tools(ALL_HEALTH_TOOLS)
    choice = await llm_with_tools.ainvoke(messages_to_send)
    
    # Intercept delete actions before execution
    if choice.tool_calls:
        for tc in choice.tool_calls:
            tool_name = tc.get("name")
            if tool_name.startswith("delete_"):
                args = tc.get("args", {})
                record_id = args.get("record_id")
                entity = tool_name.replace("delete_", "").replace("_log", "")
                
                reply = f"I found the target {entity} entry (ID: {record_id}). Are you sure you want to delete it?"
                
                # Exit early requiring confirmation
                return {
                    "messages": [AIMessage(content=reply)],
                    "confirmation_required": True,
                    "confirm_action": {
                        "tool": tool_name,
                        "id": record_id
                    },
                    "reply": reply,
                    "structured_data": {
                        "intent": "DELETE",
                        "entity": entity,
                        "id": record_id
                    },
                    "sources_used": sources_used
                }
                
        # Handle non-delete tool calls
        return {
            "messages": [choice],
            "sources_used": sources_used
        }
        
    # Standard text reply
    structured_data = None
    if state["intent"] in ("CREATE", "UPDATE", "DELETE", "READ"):
        # Auto-detect entity if possible
        entity = "general"
        last_user_msg = ""
        for m in reversed(state["messages"]):
            if isinstance(m, HumanMessage) or (isinstance(m, dict) and m.get("role") == "user"):
                last_user_msg = m.content if isinstance(m, HumanMessage) else m.get("content", "")
                break
        
        for kw in ["water", "sleep", "weight", "activity", "goal"]:
            if kw in last_user_msg.lower():
                entity = kw
                break
                
        structured_data = {
            "intent": state["intent"],
            "entity": entity
        }
        
    return {
        "messages": [choice],
        "reply": choice.content,
        "structured_data": structured_data,
        "sources_used": sources_used
    }

# ==========================================
# 3. TOOLS EXECUTION NODE
# ==========================================

async def tools_node(state: AgentState) -> Dict[str, Any]:
    messages = state["messages"]
    last_message = messages[-1]
    
    tool_outputs = []
    config = {"configurable": {"jwt_token": state["jwt_token"], "user_id": state["user_id"]}}
    tool_map = {t.name: t for t in ALL_HEALTH_TOOLS}
    
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        for tc in last_message.tool_calls:
            tool_name = tc.get("name")
            tool_args = tc.get("args")
            tool_id = tc.get("id")
            
            tool_func = tool_map.get(tool_name)
            if tool_func:
                try:
                    result = await tool_func.ainvoke(tool_args, config=config)
                    tool_outputs.append(ToolMessage(
                        content=str(result),
                        name=tool_name,
                        tool_call_id=tool_id
                    ))
                except Exception as e:
                    tool_outputs.append(ToolMessage(
                        content=f"Error executing tool: {str(e)}",
                        name=tool_name,
                        tool_call_id=tool_id
                    ))
                    
    return {"messages": tool_outputs}

# ==========================================
# 4. CONDITIONAL ROUTING
# ==========================================

def should_continue(state: AgentState) -> str:
    messages = state["messages"]
    last_message = messages[-1]
    
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        # Confirm we aren't executing delete tools (should have been intercepted already)
        for tc in last_message.tool_calls:
            if tc.get("name", "").startswith("delete_"):
                return "end"
        return "continue"
        
    return "end"

# ==========================================
# 5. GRAPH BUILDING
# ==========================================

workflow = StateGraph(AgentState)

workflow.add_node("agent", agent_node)
workflow.add_node("tools", tools_node)

workflow.set_entry_point("agent")

workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "continue": "tools",
        "end": END
    }
)

workflow.add_edge("tools", "agent")

compiled_agent = workflow.compile()

try:
    print("\n--- LangGraph Workflow Architecture ---")
    compiled_agent.get_graph().print_ascii()
    print("---------------------------------------\n")
except Exception as e:
    print(f"Could not print LangGraph structure: {e}")



# ==========================================
# 6. EXECUTION HELPER
# ==========================================

async def run_agent(
    message: str,
    history: List[Dict[str, str]],
    user_id: int,
    jwt_token: str,
    intent: str
) -> Dict[str, Any]:
    """Execute the LangGraph workflow and return the final state."""
    
    # Reconstruct message history
    formatted_messages = []
    for msg in history:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "user":
            formatted_messages.append(HumanMessage(content=content))
        elif role == "assistant":
            formatted_messages.append(AIMessage(content=content))
            
    # Add latest user message
    formatted_messages.append(HumanMessage(content=message))
    
    # Initialize state
    initial_state: AgentState = {
        "messages": formatted_messages,
        "user_id": user_id,
        "jwt_token": jwt_token,
        "intent": intent,
        "confirmation_required": False,
        "confirm_action": None,
        "reply": None,
        "structured_data": None,
        "sources_used": []
    }
    
    # Execute graph
    final_state = await compiled_agent.ainvoke(initial_state)
    
    # Extract response metrics
    reply = final_state.get("reply")
    if not reply and final_state["messages"]:
        last_msg = final_state["messages"][-1]
        reply = last_msg.content if hasattr(last_msg, "content") else str(last_msg)
        
    return {
        "reply": reply,
        "intent": final_state.get("intent"),
        "confirmation_required": final_state.get("confirmation_required", False),
        "confirm_action": final_state.get("confirm_action"),
        "structured_data": final_state.get("structured_data"),
        "sources_used": final_state.get("sources_used", [])
    }


async def run_agent_stream(
    message: str,
    history: List[Dict[str, str]],
    user_id: int,
    jwt_token: str,
    intent: str
):
    """Execute the LangGraph workflow and yield token events and final metadata."""
    
    # Reconstruct message history
    formatted_messages = []
    for msg in history:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "user":
            formatted_messages.append(HumanMessage(content=content))
        elif role == "assistant":
            formatted_messages.append(AIMessage(content=content))
            
    # Add latest user message
    formatted_messages.append(HumanMessage(content=message))
    
    # Initialize state
    initial_state: AgentState = {
        "messages": formatted_messages,
        "user_id": user_id,
        "jwt_token": jwt_token,
        "intent": intent,
        "confirmation_required": False,
        "confirm_action": None,
        "reply": None,
        "structured_data": None,
        "sources_used": []
    }
    
    final_state = None
    
    # Use astream_events (v2) to capture real-time tokens as they generate
    async for event in compiled_agent.astream_events(initial_state, version="v2"):
        kind = event.get("event")
        
        # 1. Stream the text tokens
        if kind == "on_chat_model_stream":
            chunk = event.get("data", {}).get("chunk")
            if chunk and hasattr(chunk, "content") and chunk.content:
                # Do not stream tool execution chunks
                if not getattr(chunk, "tool_call_chunks", None):
                    yield f"event: token\ndata: {chunk.content}\n\n"
                    
        # 2. Capture the final Graph output state
        elif kind == "on_chain_end":
            output = event.get("data", {}).get("output")
            if isinstance(output, dict) and "messages" in output:
                final_state = output
                
    # 3. Yield the final metadata payload
    if final_state:
        reply = final_state.get("reply")
        if not reply and final_state.get("messages"):
            last_msg = final_state["messages"][-1]
            reply = last_msg.content if hasattr(last_msg, "content") else str(last_msg)
            
        metadata = {
            "reply": reply,
            "intent": final_state.get("intent"),
            "confirmation_required": final_state.get("confirmation_required", False),
            "confirm_action": final_state.get("confirm_action"),
            "structured_data": final_state.get("structured_data"),
            "sources_used": final_state.get("sources_used", [])
        }
        yield f"event: metadata\ndata: {json.dumps(metadata)}\n\n"
