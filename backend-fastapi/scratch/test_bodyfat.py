import sys
import os

# Ensure parent directory is in sys.path so app.* imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_prediction():
    payload = {
        "density": 1.0708,
        "age": 23,
        "weight": 70.0,  # 70 kg -> ~154.3 lbs
        "height": 172.0, # 172 cm -> ~67.7 inches
        "neck": 36.2,
        "chest": 93.1,
        "abdomen": 85.2,
        "hip": 94.5,
        "thigh": 59.0,
        "knee": 37.3,
        "ankle": 21.9,
        "biceps": 32.0,
        "forearm": 27.4,
        "wrist": 17.1,
        "gender": "male",
        "unit_system": "metric"
    }
    
    print("Sending POST request to /api/predict-bodyfat...")
    response = client.post("/api/predict-bodyfat", json=payload)
    
    print("Response Status Code:", response.status_code)
    print("Response Body:", response.json())
    
    assert response.status_code == 200
    data = response.json()
    assert "predicted_bodyfat" in data
    assert "category" in data
    assert "description" in data
    print("Test passed successfully!")

if __name__ == "__main__":
    try:
        test_prediction()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Test failed:", str(e))
