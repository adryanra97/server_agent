"""Property tests for the GitHub quality telemetry parsing.

The ``/api/v1/quality`` endpoint derives coverage/bandit metrics from CI step
names and must never crash or invent a non-float/non-int metric no matter how
malformed those names are. The fetcher also hard-restricts itself to the fixed
GitHub API host.
"""

import pytest
from fastapi.testclient import TestClient
from hypothesis import assume, given
from hypothesis import strategies as st

import main
from tests.strategies import FAST

client = TestClient(main.app)

RUN = {
    "workflow_runs": [{"id": 1, "status": "completed", "conclusion": "success", "head_sha": "abc"}]
}


def _jobs(step_name: str) -> dict:
    return {
        "jobs": [
            {
                "name": "job",
                "status": "completed",
                "conclusion": "success",
                "steps": [{"name": step_name, "status": "completed", "conclusion": "success"}],
            }
        ]
    }


@given(url=st.text(max_size=200))
@FAST
def test_fetch_rejects_non_github_api_urls(url):
    assume(not url.startswith(main.QUALITY_ROOT + "/actions/"))
    with pytest.raises(ValueError, match="Unexpected quality API URL"):
        main._fetch_github_json(url)


@given(step_name=st.text(max_size=200))
@FAST
def test_quality_survives_arbitrary_step_names(monkeypatch, step_name):
    monkeypatch.setattr(
        main,
        "_fetch_github_json",
        lambda url: _jobs(step_name) if "/jobs?" in url else RUN,
    )
    response = client.get("/api/v1/quality")
    assert response.status_code == 200
    data = response.json()

    assert data["coverage"] is None or isinstance(data["coverage"], float)
    assert data["coverage_line"] is None or isinstance(data["coverage_line"], float)
    assert data["coverage_branch"] is None or isinstance(data["coverage_branch"], float)
    for level in ("high", "medium", "low"):
        value = data["bandit"][level]
        assert value is None or (isinstance(value, int) and value >= 0)
    assert data["data_status"] in {"live", "run-only", "no-runs", "unavailable"}
