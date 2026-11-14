# ServerAgent — Copdash-powered capacity verdict

A clean web interface for the original [mauikut-com/copdash](https://github.com/mauikut-com/copdash) FastAPI service. This implementation deliberately focuses on the *existing* tools, rather than borrowing feature concepts from another project.

## Source fidelity

The original Python engine registry, Pydantic schemas and FastAPI application are preserved under `backend/app/`.

- **Rules engine:** deterministic resource-demand vs capacity calculations
- **SimPy engine:** discrete-event CPU, RAM, and connection simulation using a repeatable seed
- **Outputs:** `will_survive`, `at_risk`, `will_crash`, heuristic confidence, bottleneck, resource utilization, and human-readable reasons
- **Native API:** `GET /health`, `GET /engines`, `POST /verdict`, `GET /docs`, `GET /openapi.json`

Two additive engineering endpoints extend the original API without changing its request/response contract:\n\n- `POST /api/v1/simpy/inspect`: execute the **same** SimPy model and return the original verdict plus structured arrival counts, measured/offered resource utilization, fixed-seed metadata, and execution time.\n- `GET /api/v1/quality`: live GitHub Actions status; never fabricated coverage.

## Website features

| Route | Purpose |
| --- | --- |
| `/` | Editorial landing page with a live example that calls the original `/verdict` API |
| `/dashboard` | Live backend health and engine registry, plus latest local evaluation |
| `/simulation` | SimPy-first experiment workbench; all original schema fields, execution statistics, verdict breakdown and optional Rules comparison |
| `/compare` | Three independent calls to `/verdict` with 1×, 2× and 3× demand |
| `/reports` | Browser-local run history and CSV export (not a backend database) |
| `/developer` | Original JSON endpoints and additive SimPy inspection explorer |
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

## SimPy inspector (current development focus)

```bash
curl -s -X POST http://localhost:8000/api/v1/simpy/inspect \\
  -H 'Content-Type: application/json' \\
  -d '{"engine":"simpy","spec":{"cpu":{"cores":4,"clock_ghz":2.5},"ram":{"total_mb":8192},"network":{"bandwidth_mbps":1000,"max_connections":10000}},"load":{"rps":100,"avg_cpu_ms_per_req":10,"avg_mem_mb_per_req":5,"concurrent_connections":100,"payload_kb":10}}'
```

The additional endpoint invokes the same copdash `SimPyEngine` as `/verdict` and returns the identical `VerdictResponse`, plus actual arrived/completed counters, measured utilization, offered demand, fixed seed and simulated elapsed time. The original `/verdict`, `/engines`, `/health`, OpenAPI and all original tests are retained.

Edge case: for any nonzero RPS, a single request's RAM allocation cannot exceed the configured server RAM; the API rejects that impossible reservation with a 422 response. Zero-memory requests are supported.

UI design is editorial and information-first. The process-flow animation explains **model mechanics**, not per-request playback. Analyzed numbers and verdicts come from actual Python simulation, not generated frontend data.

## Event-derived time-series replay

ServerAgent's `POST /api/v1/simpy/inspect` now additionally returns a one-second `simulation.timeline[]` built from the original SimPy event timestamps. Each sample reports:

- arrivals and completions within the second, and requests still in-flight at its end;
- time-integrated CPU, RAM, and active connection utilization;
- completed payload throughput (Mbps) and percent of configured bandwidth;
- average pending requests across network, RAM and CPU queues, plus CPU queue average.

The trace is deterministic for a given request and seed. Time-series collection is enabled **only for the inspection endpoint**; the original `/verdict` contract stays unchanged. Traces are capped at 240 one-second buckets to bound response size; `timeline_truncated` explains if the simulation ran longer.

The UI exposes interactive replay, chart tabs, per-second seeking, speed controls and CSV export. The animated request path is a **visualization of the pipeline**, not a recording of individual SimPy entities. Chart numbers are calculated from actual simulation events, never fabricated frontend series.

### Interface layout

The workspace uses top navigation rather than a sidebar, with enlarged editorial typography, a responsive menu, and direct access to the SimPy Workbench. Future user roles and application workflows will be addressed separately.
