"""Detailed Pytest API shows real JUnit-derived reports without inventing outcomes."""

import io
from urllib.error import URLError

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


class ReadableReport:
    def __init__(self, payload: bytes):
        self.payload = payload

    def __enter__(self):
        return io.BytesIO(self.payload)

    def __exit__(self, *args):
        return False


REPORT = (
    b'{"schema_version":1,"run_id":123,"commit_sha":"abc","summary":'
    b'{"total":2,"passed":1,"failed":1,"skipped":0,"errors":0,'
    b'"duration_seconds":0.22},"tests":[{"name":"test_a","status":"passed"},'
    b'{"name":"test_b","status":"failed"}]}'
)


def test_quality_tests_delivers_real_report(monkeypatch):
    requested = []

    def open_report(request, timeout):
        requested.append((request.full_url, timeout))
        return ReadableReport(REPORT)

    monkeypatch.setattr(main, "urlopen", open_report)
    result = client.get("/api/v1/quality/tests?run_id=123")
    assert result.status_code == 200
    assert result.json()["summary"]["total"] == 2
    assert result.json()["tests"][1]["status"] == "failed"
    assert requested == [(main.QUALITY_REPORT_ROOT + "/runs/123.json", 5)]


def test_quality_tests_default_reads_latest(monkeypatch):
    requested = []

    def open_report(request, timeout):
        requested.append(request.full_url)
        return ReadableReport(REPORT)

    monkeypatch.setattr(main, "urlopen", open_report)
    assert client.get("/api/v1/quality/tests").json()["run_id"] == 123
    assert requested[0].endswith("/quality-reports/latest.json")


def test_quality_tests_rejects_invalid_run():
    assert client.get("/api/v1/quality/tests?run_id=-3").status_code == 422


def test_quality_tests_does_not_claim_unavailable_evidence(monkeypatch):
    def fail(*args, **kwargs):
        raise URLError("offline")

    monkeypatch.setattr(main, "urlopen", fail)
    result = client.get("/api/v1/quality/tests?run_id=123")
    assert result.status_code == 503
    assert "not yet available" in result.json()["detail"]


def test_quality_tests_rejects_wrong_report_run(monkeypatch):
    monkeypatch.setattr(main, "urlopen", lambda *args, **kwargs: ReadableReport(REPORT))
    response = client.get("/api/v1/quality/tests?run_id=124")
    assert response.status_code == 503


def test_quality_tests_rejects_invalid_schema(monkeypatch):
    monkeypatch.setattr(
        main, "urlopen", lambda *args, **kwargs: ReadableReport(b'{"schema_version":2}')
    )
    assert client.get("/api/v1/quality/tests").status_code == 503
