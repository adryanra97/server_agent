"""ServerAgent web integration.

The copdash FastAPI app is imported intact so its public endpoints,
validation contracts, engine registry and native OpenAPI stay unchanged.
Only engineering-quality metadata is added for the optional UI panel.
"""

from __future__ import annotations

import json
import re
import time
from urllib.error import URLError
from urllib.request import Request, urlopen

from fastapi import Depends, HTTPException
from pydantic import BaseModel

from app.engines.simpy import SimPyEngine
from app.main import app, require_api_key
from app.schemas import EvaluationInput, VerdictRequest, VerdictResponse

QUALITY_REPO = "adryanra97/server_agent"
QUALITY_BRANCH = "main"
QUALITY_ROOT = f"https://api.github.com/repos/{QUALITY_REPO}"


def _fetch_github_json(url: str) -> dict:
    """Fetch only the fixed GitHub API host; never accept a user-supplied URL."""
    if not url.startswith(QUALITY_ROOT + "/actions/"):
        raise ValueError("Unexpected quality API URL")
    request = Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "ServerAgent-Quality",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    # This request is restricted to the fixed HTTPS GitHub API host above.
    with urlopen(request, timeout=4) as response:  # nosec B310
        return json.load(response)


@app.get("/api/v1/quality", tags=["Engineering"])
def quality() -> dict:
    """Current GitHub Actions evidence; absent metrics remain null, never 0."""
    value = {
        "source": "GitHub Actions",
        "repository": QUALITY_REPO,
        "branch": QUALITY_BRANCH,
        "status": "unavailable",
        "conclusion": None,
        "url": f"https://github.com/{QUALITY_REPO}/actions/workflows/quality.yml",
        "run_id": None,
        "commit_sha": None,
        "run_started_at": None,
        "run_updated_at": None,
        "coverage": None,
        "coverage_line": None,
        "coverage_branch": None,
        "coverage_status": "not-reported",
        "bandit": {"high": None, "medium": None, "low": None, "status": "not-reported"},
        "jobs": [],
        "data_status": "unavailable",
    }
    try:
        payload = _fetch_github_json(
            f"{QUALITY_ROOT}/actions/workflows/quality.yml/runs"
            f"?branch={QUALITY_BRANCH}&per_page=1"
        )
        runs = payload.get("workflow_runs", [])
        if not runs:
            value.update(status="not-run", data_status="no-runs")
            return value

        run = runs[0]
        run_id = int(run["id"])
        value.update(
            status=run.get("status", "unknown"),
            conclusion=run.get("conclusion"),
            run_id=run_id,
            commit_sha=run.get("head_sha"),
            run_started_at=run.get("run_started_at"),
            run_updated_at=run.get("updated_at"),
            url=f"https://github.com/{QUALITY_REPO}/actions/runs/{run_id}",
            data_status="run-only",
        )
        try:
            jobs_payload = _fetch_github_json(
                f"{QUALITY_ROOT}/actions/runs/{run_id}/jobs?per_page=100"
            )
            value["jobs"] = [
                {
                    "name": job.get("name", ""),
                    "status": job.get("status", "unknown"),
                    "conclusion": job.get("conclusion"),
                    "url": job.get("html_url"),
                    "steps": [
                        {
                            "name": step.get("name", ""),
                            "status": step.get("status", "unknown"),
                            "conclusion": step.get("conclusion"),
                        }
                        for step in job.get("steps", [])
                    ],
                }
                for job in jobs_payload.get("jobs", [])
            ]
            value["data_status"] = "live"
            for job in value["jobs"]:
                for step in job["steps"]:
                    coverage_match = re.search(
                        r"Coverage report:\s*([0-9.]+)% line,\s*([0-9.]+)% branch",
                        step["name"],
                    )
                    if coverage_match:
                        value["coverage_line"] = float(coverage_match.group(1))
                        value["coverage_branch"] = float(coverage_match.group(2))
                        value["coverage"] = value["coverage_line"]
                        value["coverage_status"] = "reported"
                    bandit_match = re.search(
                        r"Bandit findings:\s*H(\d+)\s+M(\d+)\s+L(\d+)",
                        step["name"],
                    )
                    if bandit_match:
                        value["bandit"] = {
                            "high": int(bandit_match.group(1)),
                            "medium": int(bandit_match.group(2)),
                            "low": int(bandit_match.group(3)),
                            "status": "reported",
                        }
        except (URLError, OSError, ValueError, KeyError, TypeError):
            value["data_status"] = "run-only"
    except (URLError, OSError, ValueError, KeyError, TypeError):
        value["data_status"] = "unavailable"
    return value


QUALITY_REPORT_ROOT = "https://raw.githubusercontent.com/adryanra97/server_agent/" "quality-reports"


@app.get("/api/v1/quality/tests", tags=["Engineering"])
def quality_tests(run_id: int | None = None) -> dict:
    """Serve a sanitized JUnit-derived report published by GitHub Actions.

    The report is tied to a specific run; its test statuses are not inferred
    from the overall workflow conclusion.
    """
    if run_id is not None and run_id <= 0:
        raise HTTPException(status_code=422, detail="Run ID must be positive.")
    path = f"runs/{run_id}.json" if run_id is not None else "latest.json"
    request = Request(
        f"{QUALITY_REPORT_ROOT}/{path}",
        headers={
            "Accept": "application/json",
            "User-Agent": "ServerAgent-Test-Evidence",
        },
    )
    try:
        # Fixed HTTPS host and integer-only report path.
        with urlopen(request, timeout=5) as response:  # nosec B310
            payload = json.load(response)
        if not isinstance(payload, dict) or payload.get("schema_version") != 1:
            raise ValueError("Invalid test report format")
        if run_id is not None and payload.get("run_id") != run_id:
            raise ValueError("The report run does not match the selected execution")
        return payload
    except (URLError, OSError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Detailed test evidence is not yet available for this execution.",
        ) from exc


class TimelineSecond(BaseModel):
    """A one-second bucket derived from SimPy events, not synthetic chart points."""

    second: int
    duration_seconds: float
    arrivals: int
    completed: int
    in_flight: int
    cpu_percent: float
    ram_percent: float
    connection_percent: float
    network_mbps: float
    network_percent: float
    queue_avg: float
    cpu_queue_avg: float


class SimPyDiagnostics(BaseModel):
    """Structured evidence from the original copdash discrete-event engine."""

    arrival_process: str
    seed: int
    arrival_window_seconds: float
    arrival_cap: int
    planned_arrivals: int
    arrived: int
    completed: int
    simulated_elapsed_seconds: float
    cpu_slots: int
    timeline_resolution_seconds: int
    timeline_limit_seconds: int
    timeline_truncated: bool
    timeline: list[TimelineSecond]
    measured_utilization: dict[str, float]
    offered_utilization: dict[str, float]


class SimPyInspectionResponse(BaseModel):
    engine: str
    result: VerdictResponse
    simulation: SimPyDiagnostics
    execution_ms: float
    note: str


@app.post(
    "/api/v1/simpy/inspect",
    response_model=SimPyInspectionResponse,
    tags=["SimPy inspection"],
    dependencies=[Depends(require_api_key)],
)
def inspect_simpy(request: VerdictRequest) -> SimPyInspectionResponse:
    """Inspect real SimPy statistics while preserving POST /verdict unchanged."""
    if request.engine != "simpy":
        raise HTTPException(status_code=422, detail="Select engine='simpy' for inspection.")
    if request.load.rps > 0 and request.load.avg_mem_mb_per_req > request.spec.ram.total_mb:
        raise HTTPException(
            status_code=422,
            detail="SimPy cannot allocate more RAM to a request than the server has.",
        )
    start = time.perf_counter()
    result, diagnostics = SimPyEngine().inspect(
        EvaluationInput(spec=request.spec, load=request.load),
        collect_timeline=True,
    )
    execution_ms = (time.perf_counter() - start) * 1000
    return SimPyInspectionResponse(
        engine="simpy",
        result=VerdictResponse(**result.model_dump(), engine="simpy"),
        simulation=SimPyDiagnostics.model_validate(diagnostics),
        execution_ms=round(execution_ms, 2),
        note=(
            "Measured utilization is simulated time-average. Values above 100% "
            "use the original engine's offered-demand fallback. This is not live telemetry."
        ),
    )
