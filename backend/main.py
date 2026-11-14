"""ServerAgent web integration.

The copdash FastAPI app is imported intact so its public endpoints,
validation contracts, engine registry and native OpenAPI stay unchanged.
Only engineering-quality metadata is added for the optional UI panel.
"""
from __future__ import annotations

import json
from urllib.error import URLError
from urllib.request import Request, urlopen

from app.main import app


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
