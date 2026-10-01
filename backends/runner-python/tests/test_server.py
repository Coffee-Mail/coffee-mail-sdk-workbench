from fastapi.testclient import TestClient
from server import app

client = TestClient(app)


def test_runner_info() -> None:
    response = client.get("/api/v1/runner/info")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["runner"]["language"] == "python"
    assert json_data["runner"]["status"] == "online"
    assert json_data["runner"]["sdkVersion"] == "0.1.0"


def test_introspect_missing_key() -> None:
    response = client.post("/api/v1/client/introspect")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["data"]["valid"] is False
    assert json_data["data"]["environment"] == "sandbox"
