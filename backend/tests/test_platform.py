"""Web integration checks — original copdash routes remain the public API."""

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


def test_original_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_original_engine_registry():
    response = client.get("/engines")
    assert response.status_code == 200
    assert response.json() == {"engines": ["rules", "simpy"]}


def test_original_rules_engine():
    response = client.post("/verdict", json={"engine": "rules", "spec": SPEC, "load": LOAD})
    assert response.status_code == 200
    assert response.json()["engine"] == "rules"
    assert response.json()["verdict"] == "will_survive"


def test_original_simpy_engine():
    response = client.post("/verdict", json={"engine": "simpy", "spec": SPEC, "load": LOAD})
    assert response.status_code == 200
    assert response.json()["engine"] == "simpy"


def test_original_openapi_document():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    assert "/verdict" in response.json()["paths"]


def test_original_schema_validation():
    response = client.post(
        "/verdict",
        json={
            "engine": "rules",
            "spec": {**SPEC, "cpu": {"cores": 0, "clock_ghz": 2.5}},
            "load": LOAD,
        },
    )
    assert response.status_code == 422


def test_quality_does_not_fabricate_coverage(monkeypatch):
    import main

    def unavailable(*args, **kwargs):
        raise URLError("offline")

    from urllib.error import URLError

    monkeypatch.setattr(main, "urlopen", unavailable)
    response = client.get("/api/v1/quality")
    assert response.status_code == 200
    assert response.json()["coverage"] is None
    assert response.json()["status"] == "unavailable"


def test_quality_reports_latest_run(monkeypatch):
    import io

    import main

    class FakeResponse:
        def __enter__(self):
            return io.BytesIO(
                b'{"workflow_runs":[{"status":"completed","conclusion":"success","id":42,"html_url":"https://github.com/example/run"}]}'
            )

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(main, "urlopen", lambda *args, **kwargs: FakeResponse())
    response = client.get("/api/v1/quality")
    assert response.status_code == 200
    assert response.json()["run_id"] == 42
    assert response.json()["conclusion"] == "success"


def test_quality_empty_runs(monkeypatch):
    import io

    import main

    class FakeResponse:
        def __enter__(self):
            return io.BytesIO(b'{"workflow_runs":[]}')

        def __exit__(self, *args):
            return False

    monkeypatch.setattr(main, "urlopen", lambda *args, **kwargs: FakeResponse())
    assert client.get("/api/v1/quality").json()["status"] == "not-run"
