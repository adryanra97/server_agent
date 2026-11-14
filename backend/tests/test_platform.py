"""Additional contract tests for the platform API."""
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)
SPEC = {
    "cpu": {"cores": 4, "clock_ghz": 2.5},
    "ram": {"total_mb": 8192},
    "network": {"bandwidth_mbps": 1000, "max_connections": 10000},
}
LOAD = {
    "rps": 100,
    "avg_cpu_ms_per_req": 10,
    "avg_mem_mb_per_req": 5,
    "concurrent_connections": 100,
    "payload_kb": 10,
}

def test_platform_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["engine_count"] == 2

def test_platform_openapi():
    response = client.get("/api/openapi.json")
    assert response.status_code == 200
    assert "/api/v1/verdict" in response.json()["paths"]

def test_platform_engines():
    response = client.get("/api/v1/engines")
    assert response.status_code == 200
    assert [engine["id"] for engine in response.json()["engines"]] == ["rules", "simpy"]

def test_platform_verdict():
    response = client.post("/api/v1/verdict", json={"engine": "rules", "spec": SPEC, "load": LOAD})
    assert response.status_code == 200
    assert response.json()["verdict"] == "will_survive"

def test_platform_simulation_creates_response():
    response = client.post("/api/v1/simulations", json={"engine": "rules", "spec": SPEC, "load": LOAD, "label": "Test"})
    assert response.status_code == 200
    assert response.json()["saved"] is False
    assert response.json()["result"]["engine"] == "rules"

def test_platform_scenario_comparison():
    response = client.post("/api/v1/scenarios/compare", json={
        "engine": "rules", "spec": SPEC, "load": LOAD,
        "scenarios": [{"name": "Normal", "multiplier": 1}, {"name": "Stress", "multiplier": 10}]
    })
    assert response.status_code == 200
    outcomes = response.json()["scenarios"]
    assert outcomes[0]["result"]["verdict"] == "will_survive"
    assert outcomes[1]["result"]["verdict"] == "will_crash"

def test_platform_topology_node_failure():
    response = client.post("/api/v1/topology/evaluate", json={
        "engine": "rules", "spec": SPEC, "load": LOAD,
        "nodes": [{"id": "a", "name": "A", "online": True}, {"id": "b", "name": "B", "online": False}]
    })
    assert response.status_code == 200
    assert response.json()["nodes"][0]["traffic_share"] == 1
    assert response.json()["nodes"][1]["result"] is None

def test_platform_topology_empty_capacity():
    response = client.post("/api/v1/topology/evaluate", json={
        "spec": SPEC, "load": LOAD, "nodes": [{"id": "a", "name": "A", "online": False}]
    })
    assert response.json()["verdict"] == "no_capacity"

def test_platform_unknown_engine():
    response = client.post("/api/v1/verdict", json={"engine": "not-found", "spec": SPEC, "load": LOAD})
    assert response.status_code == 422

def test_platform_simpy_memory_request_limit():
    response = client.post("/api/v1/verdict", json={
        "engine": "simpy", "spec": SPEC, "load": {**LOAD, "avg_mem_mb_per_req": 9000}
    })
    assert response.status_code == 422

def test_platform_simpy_zero_memory_limit():
    response = client.post("/api/v1/verdict", json={
        "engine": "simpy", "spec": SPEC, "load": {**LOAD, "avg_mem_mb_per_req": 0}
    })
    assert response.status_code == 422

def test_private_history_requires_credentials():
    response = client.get("/api/v1/private/runs")
    assert response.status_code == 403
