from fastapi.testclient import TestClient
from backend.main_core import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "service": "Core Service",
        "status": "running",
        "version": "3.0.0"
    }

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
