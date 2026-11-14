"""ServerAgent web integration.

The copdash FastAPI app is imported intact so its public endpoints,
validation contracts, engine registry and native OpenAPI stay unchanged.
Only engineering-quality metadata is added for the optional UI panel.
"""

from __future__ import annotations

import json
import time
from urllib.error import URLError
from urllib.request import Request, urlopen

from fastapi import Depends, HTTPException
from pydantic import BaseModel

from app.engines.simpy import SimPyEngine
from app.main import app, require_api_key
from app.schemas import EvaluationInput, VerdictRequest, VerdictResponse


@app.get("/api/v1/quality", tags=["Engineering"])
def quality():
    """Latest reported GitHub workflow state, not an invented test result."""
    value = {
        "source": "GitHub Actions",
        "repository": "adryanra97/server_agent",
        "status": "unavailable",
        "conclusion": None,
        "url": "https://github.com/adryanra97/server_agent/actions",
        "run_id": None,
        "coverage": None,
        "coverage_status": "not-reported",
    }
    try:
        request = Request(
            "https://api.github.com/repos/adryanra97/server_agent/actions/"
            "workflows/quality.yml/runs?per_page=1",
            headers={"Accept": "application/vnd.github+json", "User-Agent": "ServerAgent"},
        )
        with urlopen(request, timeout=3) as response:
            payload = json.load(response)
        runs = payload.get("workflow_runs", [])
        if runs:
            run = runs[0]
            value.update(
                status=run.get("status"),
                conclusion=run.get("conclusion"),
                run_id=run.get("id"),
                url=run.get("html_url"),
            )
        else:
            value["status"] = "not-run"
    except (URLError, OSError, ValueError, KeyError):
        pass
    return value

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
        EvaluationInput(spec=request.spec, load=request.load)
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
