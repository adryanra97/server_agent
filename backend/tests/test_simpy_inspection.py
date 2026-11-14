"""SimPy inspection is faithful to the copdash engine, with explicit evidence."""

import pytest
from fastapi.testclient import TestClient

from app.engines.simpy import SimPyEngine
from app.schemas import EvaluationInput, Load, ServerSpec
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


def inspect(spec=SPEC, load=LOAD, engine="simpy"):
    return client.post(
        "/api/v1/simpy/inspect",
        json={"engine": engine, "spec": spec, "load": load},
    )


def test_inspection_matches_original_verdict():
    body = {"engine": "simpy", "spec": SPEC, "load": LOAD}
    original = client.post("/verdict", json=body)
    examined = inspect()
    assert original.status_code == examined.status_code == 200
    assert examined.json()["result"] == original.json()
    assert examined.json()["simulation"]["arrived"] == 3000
    assert examined.json()["simulation"]["completed"] == 3000
    assert examined.json()["simulation"]["seed"] == 0
    assert examined.json()["simulation"]["arrival_window_seconds"] == 30.0
    assert examined.json()["simulation"]["arrival_cap"] == 20000


def test_simpy_diagnostics_are_repeatable():
    first = inspect().json()
    second = inspect().json()
    assert first["result"] == second["result"]
    assert first["simulation"] == second["simulation"]
    assert first["execution_ms"] >= 0


def test_simpy_idle_includes_zero_arrivals():
    load = {**LOAD, "rps": 0, "avg_mem_mb_per_req": 0}
    result = inspect(load=load)
    assert result.status_code == 200
    assert result.json()["simulation"]["arrived"] == 0
    assert result.json()["simulation"]["completed"] == 0
    assert result.json()["result"]["bottleneck"] is None


def test_simpy_zero_memory_is_a_valid_workload():
    load = {**LOAD, "rps": 1, "avg_mem_mb_per_req": 0}
    original = client.post("/verdict", json={"engine": "simpy", "spec": SPEC, "load": load})
    observed = inspect(load=load)
    assert original.status_code == 200
    assert observed.status_code == 200
    assert observed.json()["simulation"]["arrived"] == 30
    assert observed.json()["result"]["resources"]["ram"]["utilization"] == 0


def test_oversized_memory_rejected_in_both_endpoints():
    load = {**LOAD, "avg_mem_mb_per_req": 9000}
    assert inspect(load=load).status_code == 422
    assert (
        client.post("/verdict", json={"engine": "simpy", "spec": SPEC, "load": load}).status_code
        == 422
    )


def test_simpy_inspection_requires_simpy_engine():
    response = inspect(engine="rules")
    assert response.status_code == 422


def test_simpy_inspection_obeys_api_key(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-only-key")
    response = inspect()
    assert response.status_code == 401
    response = client.post(
        "/api/v1/simpy/inspect",
        json={"engine": "simpy", "spec": SPEC, "load": LOAD},
        headers={"Authorization": "Bearer test-only-key"},
    )
    assert response.status_code == 200


def test_simpy_inspection_exposes_offered_and_measured():
    load = {**LOAD, "rps": 2000, "avg_cpu_ms_per_req": 3}
    result = inspect(load=load)
    assert result.status_code == 200
    body = result.json()
    assert body["simulation"]["planned_arrivals"] == 20000
    assert body["simulation"]["offered_utilization"]["cpu"] == 1.5
    assert body["result"]["verdict"] == "will_crash"
    assert body["simulation"]["completed"] == body["simulation"]["arrived"]

def test_simpy_direct_engine_blocks_unfulfillable_allocation():
    """Protect direct engine callers, not only the FastAPI input boundary."""
    model = EvaluationInput(
        spec=ServerSpec.model_validate(SPEC),
        load=Load.model_validate({**LOAD, "avg_mem_mb_per_req": 9000}),
    )
    with pytest.raises(ValueError, match="Memory per request"):
        SimPyEngine().inspect(model)
