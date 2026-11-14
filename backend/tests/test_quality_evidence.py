"""Quality telemetry comes from measured GitHub workflow jobs, not defaults."""

from io import BytesIO
from urllib.error import URLError

import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)

RUN = {
    "workflow_runs": [
        {
            "id": 123,
            "status": "completed",
            "conclusion": "success",
            "head_sha": "a123456",
            "run_started_at": "2026-11-14T12:00:00Z",
            "updated_at": "2026-11-14T12:02:00Z",
        }
    ]
}
JOBS = {
    "jobs": [
        {
            "name": "Backend tests & coverage",
            "status": "completed",
            "conclusion": "success",
            "html_url": "https://github.com/adryanra97/server_agent/actions/jobs/1",
            "steps": [
                {
                    "name": "Coverage report: 98.2% line, 94.1% branch",
                    "status": "completed",
                    "conclusion": "success",
                }
            ],
        },
        {
            "name": "Bandit security analysis",
            "status": "completed",
            "conclusion": "success",
            "steps": [
                {
                    "name": "Bandit findings: H0 M1 L2",
                    "status": "completed",
                    "conclusion": "success",
                }
            ],
        },
    ]
}


def test_quality_returns_measured_jobs_and_metrics(monkeypatch):
    requested = []

    def get(url):
        requested.append(url)
        return JOBS if "/jobs?" in url else RUN

    monkeypatch.setattr(main, "_fetch_github_json", get)
    response = client.get("/api/v1/quality")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["run_id"] == 123
    assert data["commit_sha"] == "a123456"
    assert data["coverage_line"] == 98.2
    assert data["coverage_branch"] == 94.1
    assert data["coverage_status"] == "reported"
    assert data["bandit"] == {"high": 0, "medium": 1, "low": 2, "status": "reported"}
    assert len(data["jobs"]) == 2
    assert data["data_status"] == "live"
    assert "branch=feat/serveragent-platform" in requested[0]
    assert "/actions/runs/123/jobs" in requested[1]


def test_quality_missing_metric_is_not_zero(monkeypatch):
    monkeypatch.setattr(
        main,
        "_fetch_github_json",
        lambda url: {"jobs": []} if "/jobs?" in url else RUN,
    )
    result = client.get("/api/v1/quality").json()
    assert result["coverage"] is None
    assert result["coverage_branch"] is None
    assert result["bandit"]["high"] is None
    assert result["data_status"] == "live"


def test_quality_job_api_failure_retains_run_status(monkeypatch):
    def fetch(url):
        if "/jobs?" in url:
            raise URLError("job API offline")
        return RUN

    monkeypatch.setattr(main, "_fetch_github_json", fetch)
    result = client.get("/api/v1/quality").json()
    assert result["status"] == "completed"
    assert result["run_id"] == 123
    assert result["data_status"] == "run-only"


def test_quality_missing_run_fields_are_reported_unavailable(monkeypatch):
    monkeypatch.setattr(main, "_fetch_github_json", lambda url: {"workflow_runs": [{}]})
    result = client.get("/api/v1/quality").json()
    assert result["status"] == "unavailable"
    assert result["run_id"] is None


def test_github_quality_url_is_not_dynamic(monkeypatch):
    with pytest.raises(ValueError, match="Unexpected quality API URL"):
        main._fetch_github_json("http://example.org/actions/test")


def test_quality_fetch_restricts_to_api_github(monkeypatch):
    requests = []

    class Response:
        def __enter__(self):
            return BytesIO(b'{"workflow_runs":[]}')

        def __exit__(self, *args):
            return False

    def fake_open(request, timeout):
        requests.append((request.full_url, timeout))
        return Response()

    monkeypatch.setattr(main, "urlopen", fake_open)
    data = main._fetch_github_json(
        "https://api.github.com/repos/adryanra97/server_agent/actions/workflows/quality.yml/runs"
    )
    assert data == {"workflow_runs": []}
    assert requests[0][0].startswith("https://api.github.com/")
    assert requests[0][1] == 4
