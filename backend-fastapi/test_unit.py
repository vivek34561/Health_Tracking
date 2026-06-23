import unittest
from fastapi.testclient import TestClient
from app.main import app

class TestHealthAI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create a TestClient instance
        cls.client = TestClient(app)

    def test_root_endpoint(self):
        """Test the root endpoint / returns correct metadata"""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "running")
        self.assertEqual(data.get("service"), "HealthAI — AI Service")
        self.assertIn("endpoints", data)

    def test_health_check_endpoint(self):
        """Test the health check endpoint /health returns status ok"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_chat_empty_message(self):
        """Test that /api/chat fails if message is empty"""
        response = self.client.post("/api/chat", json={"message": ""})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("detail"), "Message cannot be empty")

if __name__ == "__main__":
    unittest.main()
