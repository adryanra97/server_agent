"""Per-second traces are derived from actual SimPy timestamps and preserve verdicts."""

from fastapi.testclient import TestClient

from app.engines.timeline import MAX_TIMELINE_SECONDS, TimelineRecorder
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


def test_api_trace_uses_real_simpy_counters():
    response = client.post(
        "/api/v1/simpy/inspect",
        json={"engine": "simpy", "spec": SPEC, "load": LOAD},
    )
    assert response.status_code == 200
    body = response.json()
    trace = body["simulation"]["timeline"]
    assert body["simulation"]["timeline_resolution_seconds"] == 1
    assert body["simulation"]["timeline_limit_seconds"] == MAX_TIMELINE_SECONDS
    assert body["simulation"]["timeline_truncated"] is False
    assert len(trace) >= 29
    assert [point["second"] for point in trace] == list(range(len(trace)))
    assert sum(point["arrivals"] for point in trace) == body["simulation"]["arrived"]
    assert sum(point["completed"] for point in trace) == body["simulation"]["completed"]
    assert trace[-1]["in_flight"] == 0
    assert sum(point["cpu_percent"] for point in trace) > 0
    assert any(point["network_mbps"] > 0 for point in trace)
    assert all(point["queue_avg"] >= 0 for point in trace)


def test_api_trace_reproducible_and_same_original_verdict():
    body = {"engine": "simpy", "spec": SPEC, "load": LOAD}
    original = client.post("/verdict", json=body).json()
    first = client.post("/api/v1/simpy/inspect", json=body).json()
    second = client.post("/api/v1/simpy/inspect", json=body).json()
    assert first["result"] == original == second["result"]
    assert first["simulation"]["timeline"] == second["simulation"]["timeline"]


def test_api_idle_trace_one_zero_bucket():
    result = client.post(
        "/api/v1/simpy/inspect",
        json={"engine": "simpy", "spec": SPEC, "load": {**LOAD, "rps": 0}},
    )
    assert result.status_code == 200
    timeline = result.json()["simulation"]["timeline"]
    assert len(timeline) == 1
    assert timeline[0]["arrivals"] == timeline[0]["completed"] == 0
    assert timeline[0]["cpu_percent"] == 0
    assert timeline[0]["in_flight"] == 0


def test_recorder_integrates_intervals_across_second_boundaries():
    recorder = TimelineRecorder()
    recorder.event("arrivals", 0.1)
    recorder.event("arrivals", 0.4)
    recorder.event("completed", 1.1)
    recorder.event("payload_kb", 1.1, 125)
    recorder.interval("cpu_busy", 0.5, 1.5)
    recorder.interval("ram_busy", 0.5, 1.5, 100)
    recorder.interval("connection_busy", 0.5, 1.5)
    recorder.interval("cpu_wait", 0.0, 1.0)
    recorder.interval("ram_wait", 0.0, 0.5)
    recorder.interval("network_wait", 0.0, 0.25)
    points, truncated = recorder.finish(1.5, 2, 200, 2, 1000)
    assert truncated is False
    assert points[0]["arrivals"] == 2
    assert points[1]["completed"] == 1
    assert points[0]["cpu_percent"] == 25
    assert points[1]["cpu_percent"] == 50
    assert points[0]["ram_percent"] == 25
    assert points[1]["ram_percent"] == 50
    assert points[0]["queue_avg"] == 1.75
    assert points[1]["in_flight"] == 1
    assert points[1]["network_mbps"] == 2


def test_recorder_caps_response_and_ignores_outside_events():
    recorder = TimelineRecorder()
    recorder.event("arrivals", -0.5)
    recorder.event("arrivals", MAX_TIMELINE_SECONDS + 2)
    recorder.event("arrivals", 0.01)
    recorder.interval("cpu_busy", 10, 9)
    recorder.interval("cpu_busy", MAX_TIMELINE_SECONDS + 1, MAX_TIMELINE_SECONDS + 4)
    recorder.interval("cpu_busy", -1, 1, 0)
    recorder.interval("cpu_busy", -1, 1, 1)
    points, truncated = recorder.finish(MAX_TIMELINE_SECONDS + 6, 2, 1024, 100, 1000)
    assert truncated is True
    assert len(points) == MAX_TIMELINE_SECONDS
    assert sum(point["arrivals"] for point in points) == 1
    assert points[0]["cpu_percent"] == 50
    assert points[-1]["arrivals"] == 0
