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

## Demo login and AKPSI role workflow (browser-local prototype)

Open `/login`, select a **fictional** persona from the dropdown, and enter the shared demo password `demo123`. No cloud database or account registration is required.

The role names and user responsibilities are sourced from the **Functional Model, section 8.1.2 / Table 8.2** of `AKPSI.docx`, and the four primary use cases from **Table 8.3**. Persona *names* are fictional examples, not names from the document.

| Demo user | Responsibility in this prototype |
|---|---|
| Nadia Putri / QA-Performance Tester | Run SimPy, compare workloads, submit real model evidence into a release alignment record |
| Raka Pratama / Technical Lead | Review QA evidence and decide to progress toward manager sign-off or return to Dev |
| Dina Maharani / Integration Engineer | Evaluate incident reproduction and a CPU mitigation using the original SimPy model |
| Alya Wibowo / Project-Technical Manager | Approve or reject sign-off and record a version/date in demo history |
| Bima Santoso / Support-Monitoring | Log an incident escalation and export demo workflow history as CSV |

Try the handoff by following these steps **in the same browser**:

1. Sign in as QA, execute a SimPy scenario, then submit an Alignment record.
2. Switch to Technical Lead, review the submission and forward for sign-off.
3. Switch to Project Manager to approve/reject the sign-off.
4. Switch to Support, create a synthetic incident, then switch to Integration Engineer to run SimPy reproduction and a CPU mitigation comparison.
5. Switch back to Support to view records and export CSV.

Role switching persists the workflow records in browser `localStorage`; the selected account is in tab-scoped `sessionStorage`. Existing SimPy model history is also browser-local. A fresh browser/device will not see these demo records.

**Important:** This login and these role-based menu restrictions are a *UX prototype only*: the shared password is intentionally visible in client-side code, no server-issued session exists, and the original FastAPI endpoints are not protected by this role selector. It is not safe for real customer data or authorization. Before deploying a production version, replace this with server-side authentication and authorization, per-role API permissions, a central database, real immutable approval/audit records, and document-level access control. The demo sign-off does not trigger real deployment.

The original copdash API and SimPy calculations remain source-compatible. Features specified in AKPSI such as ELK ingestion, LLM orchestration, calibrated four-state verdicts, PDF sign-off, and shared audit trails remain future work; the UI never presents these as implemented.

## QA workbench redesign (current feature branch)

The updated QA experience includes:

- Desktop-first, single-viewport role selection and password entry when the available viewport height allows it; small viewports scroll normally so fields remain reachable.
- A simplified SimPy configuration layout: aligned editable fields for CPU, RAM, network, and workload; `clock_ghz` is displayed as a fixed, unused model attribute rather than a misleading tuning knob.
- Full-width, event-driven replay that visually separates the network path and server chassis. CPU and RAM occupancy bars and the memory-bank graphic reflect time-integrated SimPy samples. There is no GPU resource in the current model.
- Four focused time-series views (compute, network, request activity, queue), with thresholds and a short evidence-based interpretation.
- Three independently configurable what-if profiles (request multiplier plus CPU, RAM, bandwidth and connection limits); the common workload can also be edited. Comparison requests execute the selected original model and are saved in the QA's browser-local evaluation history for alignment submissions.
- An API directory with **all five original copdash routes** (`/health`, `/engines`, `/verdict`, `/docs`, `/openapi.json`) plus two ServerAgent additions (`/api/v1/simpy/inspect`, `/api/v1/quality`). Documentation pages are opened as references, not falsely presented as JSON responses.

The UI uses professional copy such as *Engine Online*, *Capacity Planning*, *Evaluation Result*, and *API Reference*. Backend implementation names remain in source code and technical documentation only.

Usability checks follow the Nielsen Norman Group's principles: show status and feedback, match users' real-world concepts, give them control, use consistent visual hierarchy, prevent errors, reduce memorization, and present only essential information first. This is a qualitative, code-based pass and **not a substitute for observational usability testing on browsers and viewports**.


## Verified engineering quality dashboard and Bandit

The **Engineering Quality** page now queries the latest `feat/serveragent-platform` GitHub Actions run, including individual step outcomes rather than static "CI CHECK" labels. `/api/v1/quality` returns workflow metadata, job/step statuses, measured line and branch coverage, and Bandit severity counts. If the hosted backend cannot reach GitHub, the browser attempts the public GitHub Actions API directly; when neither source is available, the UI shows "Not reported" instead of fabricated values.

`.github/workflows/quality.yml` runs these six quality checks:

- Pytest, including branch-aware coverage
- Black formatting
- Ruff lint
- TypeScript typecheck
- Next.js production build
- **Bandit** Python SAST: scan `backend/app` and `backend/main.py`, publish JSON report as an Actions artifact, and fail on findings of medium severity **and** medium confidence or higher (lower severity findings still appear in counts)

Coverage is read from the real CI-generated `coverage.xml` and exposed as a labeled GitHub Actions step. Bandit JSON counts are likewise emitted as a labeled step, allowing status retrieval through the public GitHub Jobs API without a private token or a database. Counts are tied to the displayed commit SHA and CI run; neither a completed pipeline nor a zero issue count implies a security guarantee. The dashboard provides direct links to the run and jobs for verification.

## Browser-based per-test Pytest reporting

Engineering Quality now displays test cases, not only an overall workflow badge. In CI, Pytest creates `backend/pytest-results.xml` with `--junitxml`. A standard-library exporter converts the exact recorded cases into a privacy-minimized JSON report containing **test identifier, source module, outcome, execution time, aggregate counts, run ID and commit SHA**. Captured exception text and stdout are excluded.

GitHub Actions uploads the JUnit XML and JSON as the `pytest-detailed-results` artifact, then on trusted push/dispatch executions publishes a compact report to the `quality-reports` branch as `runs/<run_id>.json` and `latest.json`. A dedicated `GET /api/v1/quality/tests?run_id=<integer>` endpoint reads the corresponding public report. The browser can retrieve the same published report directly if the app service cannot access it. A report must match the selected CI run and commit before it is displayed. Unavailable results are explicitly marked as pending; no test is presumed successful from a passing workflow badge.

The UI supports per-status counts, outcome distribution, search, filter, expand-by-module, per-test execution duration, and links to the exact source file at the tested commit. Test details are expandable to keep the page readable. This is reporting on tests already run by CI, not arbitrary on-demand code execution from the website.

The `quality-reports` branch is intended to contain only sanitized public test metadata. Repository owners must allow the backend CI job to push this report branch with its scoped `contents: write` GitHub Actions permission for publication to work. Full failures and their diagnostic traces remain in authenticated GitHub CI artifacts/logs.
