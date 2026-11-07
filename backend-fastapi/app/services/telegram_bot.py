import asyncio
import json
import logging
import httpx
from typing import Dict, List, Any, Optional

from app.core.config import get_settings
from app.services.intent_service import classify_intent
from app.services.agent_service import run_agent
from app.tools.health_tools import (
    delete_water_log,
    delete_weight_log,
    delete_sleep_log,
    delete_activity,
    delete_goal,
    delete_food_log
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory storage for user session state
# Key: chat_id -> List of message dicts (limit to last 10 messages)
chat_histories: Dict[int, List[Dict[str, str]]] = {}

# Key: chat_id -> dict with details of pending confirmation (tool, id)
pending_confirmations: Dict[int, Dict[str, Any]] = {}


async def start_telegram_bot():
    """Main startup point for the Telegram Bot background task."""
    settings = get_settings()
    token = settings.telegram_bot_token

    if not token or token == "YOUR_TELEGRAM_BOT_TOKEN_HERE":
        logger.warning("Telegram Bot Token not configured. Telegram bot service will not start.")
        return

    logger.info("Starting Telegram Bot long-polling loop...")
    offset = None
    
    async with httpx.AsyncClient(timeout=35.0) as client:
        while True:
            try:
                # Poll for updates
                url = f"https://api.telegram.org/bot{token}/getUpdates"
                params = {"timeout": 30}
                if offset is not None:
                    params["offset"] = offset

                response = await client.get(url, params=params)
                if response.status_code != 200:
                    logger.error(f"Telegram getUpdates API returned status {response.status_code}")
                    await asyncio.sleep(5)
                    continue

                data = response.json()
                if not data.get("ok"):
                    logger.error(f"Telegram API error: {data.get('description')}")
                    await asyncio.sleep(5)
                    continue

                updates = data.get("result", [])
                for update in updates:
                    offset = update["update_id"] + 1
                    await handle_update(client, token, settings, update)

            except asyncio.CancelledError:
                logger.info("Telegram Bot loop stopped (Task Cancelled).")
                break
            except Exception as e:
                logger.exception(f"Unexpected error in Telegram Bot loop: {str(e)}")
                await asyncio.sleep(5)


async def handle_update(client: httpx.AsyncClient, token: str, settings: Any, update: Dict[str, Any]):
    """Router for Telegram update events (messages, callback queries)."""
    # 1. Handle Inline Button Clicks (Callback Queries)
    if "callback_query" in update:
        await handle_callback_query(client, token, settings, update["callback_query"])
        return

    # 2. Handle Text Messages
    if "message" not in update or "text" not in update["message"]:
        return

    message = update["message"]
    chat_id = message["chat"]["id"]
    text = message["text"].strip()

    # Handle Command: /start
    if text.startswith("/start"):
        welcome_text = (
            "🤖 **Welcome to HealthAI Bot!** 🩺📊\n\n"
            "I am your personal AI Health Coach. I can help you monitor and log your daily vital metrics: "
            "weight, water intake, sleep, physical activity, nutrition, and goals.\n\n"
            "🔑 **Account Linking**:\n"
            "Before we begin, you must link this Telegram chat with your HealthAI account.\n\n"
            "Please log in by typing:\n"
            "`/login <email> <password>`\n\n"
            "If you do not have an account, please register on the HealthAI website first."
        )
        await send_telegram_message(client, token, chat_id, welcome_text)
        return

    # Handle Command: /login <email> <password>
    if text.startswith("/login"):
        parts = text.split(maxsplit=2)
        if len(parts) < 3:
            await send_telegram_message(
                client, token, chat_id, 
                "❌ **Invalid Format**\nUse: `/login <email> <password>`"
            )
            return
        
        email = parts[1].strip()
        password = parts[2].strip()
        await handle_login(client, token, settings, chat_id, email, password)
        return

    # Handle Normal Chat Conversation
    await handle_chat_message(client, token, settings, chat_id, text)


async def handle_login(client: httpx.AsyncClient, token: str, settings: Any, chat_id: int, email: str, password: str):
    """Authenticate credentials against Express and save the link."""
    await send_telegram_message(client, token, chat_id, "⏳ Logging you in, please wait...")
    
    express_url = settings.express_api_url
    login_payload = {"email": email, "password": password}

    try:
        # 1. Call core login API
        login_res = await client.post(f"{express_url}/api/auth/login", json=login_payload)
        if login_res.status_code != 200:
            err_msg = "Invalid email or password."
            try:
                err_msg = login_res.json().get("message", err_msg)
            except Exception:
                pass
            await send_telegram_message(client, token, chat_id, f"❌ **Login Failed**:\n{err_msg}")
            return

        user_data = login_res.json()
        jwt_token = user_data["token"]
        user_name = user_data.get("user", {}).get("name", "User")

        # 2. Call link-telegram API
        headers = {"Authorization": f"Bearer {jwt_token}"}
        link_payload = {"telegram_chat_id": str(chat_id)}
        link_res = await client.post(f"{express_url}/api/auth/link-telegram", json=link_payload, headers=headers)

        if link_res.status_code != 200:
            err_msg = "Could not associate Telegram account."
            try:
                err_msg = link_res.json().get("message", err_msg)
            except Exception:
                pass
            await send_telegram_message(client, token, chat_id, f"❌ **Linking Failed**:\n{err_msg}")
            return

        success_text = (
            f"🎉 **Success!** Hello {user_name}.\n\n"
            "Your Telegram account is now securely linked to your HealthAI profile!\n"
            "You can start chatting with me directly to record metrics, query stats, or get health tips.\n\n"
            "Try asking: _'how much water did I drink today?'_ or logging weight: _'log weight 75kg'_."
        )
        await send_telegram_message(client, token, chat_id, success_text)

    except Exception as e:
        logger.exception(f"Error during login flow: {str(e)}")
        await send_telegram_message(client, token, chat_id, f"⚠️ An error occurred: {str(e)}")


async def handle_chat_message(client: httpx.AsyncClient, token: str, settings: Any, chat_id: int, text: str):
    """Process incoming chat messages, authenticate user, and query LLM agent."""
    express_url = settings.express_api_url
    secret = settings.telegram_secret

    # 1. Fetch user authentication via Telegram Chat ID
    try:
        login_res = await client.post(
            f"{express_url}/api/auth/telegram-login", 
            json={"telegram_chat_id": str(chat_id), "telegram_secret": secret}
        )
        if login_res.status_code == 404:
            await send_telegram_message(
                client, token, chat_id, 
                "🔒 **Account Not Linked**\nYour Telegram is not linked to any HealthAI profile.\n\n"
                "Please run: `/login <email> <password>` to get started."
            )
            return
        elif login_res.status_code != 200:
            await send_telegram_message(client, token, chat_id, "⚠️ Authentication issue. Please try again later.")
            return
        
        login_data = login_res.json()
        jwt_token = login_data["token"]
        user_id = login_data["user"]["id"]

    except Exception as e:
        logger.exception(f"Express auth lookup failed for chat {chat_id}: {str(e)}")
        await send_telegram_message(client, token, chat_id, "⚠️ Backend communication error. Please try again.")
        return

    # 2. Check for Pending Confirmation Responses (text confirmation bypass)
    if chat_id in pending_confirmations:
        action = pending_confirmations[chat_id]
        normalized_text = text.lower().strip()
        if normalized_text in ("yes", "y", "confirm", "ok", "yes, delete"):
            await execute_confirmed_action(client, token, chat_id, user_id, jwt_token, action)
            return
        elif normalized_text in ("no", "n", "cancel"):
            del pending_confirmations[chat_id]
            await send_telegram_message(client, token, chat_id, "❌ Action cancelled.")
            return

    # 3. Process LLM message
    await send_telegram_typing(client, token, chat_id)
    
    intent, confidence = classify_intent(text)
    
    # Format & fetch conversation history
    history = chat_histories.get(chat_id, [])
    
    try:
        agent_result = await run_agent(
            message=text,
            history=history,
            user_id=user_id,
            jwt_token=jwt_token,
            intent=intent.value
        )

        reply = agent_result.get("reply", "Sorry, I couldn't formulate a response.")
        
        # Save history (Limit to 10)
        history.append({"role": "user", "content": text})
        history.append({"role": "assistant", "content": reply})
        chat_histories[chat_id] = history[-10:]

        # Handle confirmations
        if agent_result.get("confirmation_required"):
            pending_confirmations[chat_id] = agent_result["confirm_action"]
            
            # Send message with quick buttons
            keyboard = {
                "inline_keyboard": [
                    [
                        {"text": "✅ Confirm", "callback_data": "confirm_yes"},
                        {"text": "❌ Cancel", "callback_data": "confirm_no"}
                    ]
                ]
            }
            await send_telegram_message(client, token, chat_id, reply, keyboard)
        else:
            await send_telegram_message(client, token, chat_id, reply)

    except Exception as e:
        logger.exception(f"Error executing agent workflow: {str(e)}")
        await send_telegram_message(client, token, chat_id, f"⚠️ Failed to process AI response: {str(e)}")


async def handle_callback_query(client: httpx.AsyncClient, token: str, settings: Any, callback: Dict[str, Any]):
    """Handle interactive inline keyboard response callbacks."""
    chat_id = callback["message"]["chat"]["id"]
    callback_query_id = callback["id"]
    data = callback.get("data")

    # Acknowledge the callback immediately
    await client.post(
        f"https://api.telegram.org/bot{token}/answerCallbackQuery",
        json={"callback_query_id": callback_query_id}
    )

    if chat_id not in pending_confirmations:
        await send_telegram_message(client, token, chat_id, "⚠️ No pending action found.")
        return

    action = pending_confirmations[chat_id]

    if data == "confirm_no":
        del pending_confirmations[chat_id]
        await send_telegram_message(client, token, chat_id, "❌ Action cancelled.")
        return

    if data == "confirm_yes":
        # 1. Fetch user credentials again to run the action tool
        express_url = settings.express_api_url
        secret = settings.telegram_secret

        try:
            login_res = await client.post(
                f"{express_url}/api/auth/telegram-login", 
                json={"telegram_chat_id": str(chat_id), "telegram_secret": secret}
            )
            if login_res.status_code != 200:
                await send_telegram_message(client, token, chat_id, "⚠️ Authentication expired. Action aborted.")
                return
            
            login_data = login_res.json()
            jwt_token = login_data["token"]
            user_id = login_data["user"]["id"]

            await execute_confirmed_action(client, token, chat_id, user_id, jwt_token, action)
        except Exception as e:
            logger.exception(f"Failed to authenticate for callback action: {str(e)}")
            await send_telegram_message(client, token, chat_id, f"⚠️ Communication error: {str(e)}")


async def execute_confirmed_action(client: httpx.AsyncClient, token: str, chat_id: int, user_id: int, jwt_token: str, action: Dict[str, Any]):
    """Execute confirmed tool actions directly (bypassing model loop)."""
    tool_map = {
        "delete_water_log": delete_water_log,
        "delete_weight_log": delete_weight_log,
        "delete_sleep_log": delete_sleep_log,
        "delete_activity": delete_activity,
        "delete_goal": delete_goal,
        "delete_food_log": delete_food_log
    }

    tool_name = action.get("tool")
    record_id = action.get("id")

    tool = tool_map.get(tool_name)
    if not tool:
        await send_telegram_message(client, token, chat_id, f"❌ Unsupported action: {tool_name}")
        if chat_id in pending_confirmations:
            del pending_confirmations[chat_id]
        return

    try:
        config = {"configurable": {"jwt_token": jwt_token, "user_id": user_id}}
        result = await tool.ainvoke({"record_id": record_id}, config=config)
        
        # Success message
        await send_telegram_message(client, token, chat_id, f"✅ **Completed**:\n{str(result)}")
    except Exception as e:
        logger.exception(f"Confirmed tool execution failed: {str(e)}")
        await send_telegram_message(client, token, chat_id, f"❌ Tool execution failed: {str(e)}")
    finally:
        if chat_id in pending_confirmations:
            del pending_confirmations[chat_id]


async def send_telegram_message(client: httpx.AsyncClient, token: str, chat_id: int, text: str, reply_markup: Optional[Dict[str, Any]] = None):
    """Helper method to send a text message using the Telegram Bot API."""
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
        
    try:
        await client.post(url, json=payload)
    except Exception as e:
        logger.error(f"Failed to send Telegram message to chat {chat_id}: {str(e)}")


async def send_telegram_typing(client: httpx.AsyncClient, token: str, chat_id: int):
    """Send typing bubble state indicator to user."""
    url = f"https://api.telegram.org/bot{token}/sendChatAction"
    payload = {
        "chat_id": chat_id,
        "action": "typing"
    }
    try:
        await client.post(url, json=payload)
    except Exception:
        pass
