# ServerAgent — Copdash-powered capacity verdict

A clean web interface for the original [mauikut-com/copdash](https://github.com/mauikut-com/copdash) FastAPI service. This implementation deliberately focuses on the *existing* tools, rather than borrowing feature concepts from another project.

## Source fidelity

The original Python engine registry, Pydantic schemas and FastAPI application are preserved under `backend/app/`.

- **Rules engine:** deterministic resource-demand vs capacity calculations
- **SimPy engine:** discrete-event CPU, RAM, and connection simulation using a repeatable seed
- **Outputs:** `will_survive`, `at_risk`, `will_crash`, heuristic confidence, bottleneck, resource utilization, and human-readable reasons
- **Native API:** `GET /health`, `GET /engines`, `POST /verdict`, `GET /docs`, `GET /openapi.json`

The only additional Python endpoint is `GET /api/v1/quality`, for displaying a real GitHub Actions status (coverage is not fabricated).

## Website features

| Route | Purpose |
| --- | --- |
| `/` | Editorial landing page with a live example that calls the original `/verdict` API |
| `/dashboard` | Live backend health and engine registry, plus latest local evaluation |
| `/simulation` | Input editor for every original schema field, Rules/SimPy selection, verdict breakdown |
| `/compare` | Three independent calls to `/verdict` with 1×, 2× and 3× demand |
| `/reports` | Browser-local run history and CSV export (not a backend database) |
| `/developer` | Original JSON endpoint explorer |
| `/quality` | GitHub Actions workflow status, Pytest/Black/Ruff/TypeScript checks |
| `/methodology` | The original model formulas, assumptions and known simplifications |

**Not implemented by copdash or this site:** actual load generation against servers, Kubernetes/multi-node balancing, incident response orchestration, AI agents, Production telemetry, authenticated release sign-off, or persistent cloud history.

## Development

Python 3.12+ and Node.js 22+.

```bash
cd backend
python -m pip install -r requirements.txt pytest httpx pytest-cov black ruff
uvicorn main:app --port 8000 --reload
```

To run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The production routing is defined in `vercel.json`, using one Vercel Services project. The original API routes are sent to the FastAPI backend and all website pages to Next.js. For same-origin local routing, use `vercel dev` at the repository root or configure an equivalent development proxy.

## Quality

```bash
cd backend
pytest -q --cov=app --cov=main --cov-branch --cov-report=term-missing
black --check app main.py tests
ruff check app main.py tests

cd ../frontend
npm run lint
npm run build
```

100% line and branch coverage remain goals. The UI will not display them as achieved without real reported measurements.

## Provenance

The copdash modules in `backend/app` and source engine tests in `backend/tests` are adapted with source attribution. Confirm redistribution permission/license from the repository author before public redistribution.
