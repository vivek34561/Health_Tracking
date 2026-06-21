import urllib.request
import json

data = json.dumps({
    "message": "How was my sleep last week?",
    "conversation_history": [],
    "user_id": 1
}).encode()

req = urllib.request.Request(
    "http://localhost:8000/api/chat",
    data=data,
    headers={"Content-Type": "application/json"}
)

try:
    response = urllib.request.urlopen(req, timeout=30)
    result = json.loads(response.read().decode())
    print("SUCCESS!")
    print(f"Intent: {result.get('intent')}")
    print(f"Sources: {result.get('sources_used')}")
    print(f"Reply: {result.get('reply', '')[:300]}")
except Exception as e:
    print(f"ERROR: {e}")
