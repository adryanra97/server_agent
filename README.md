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
python -m pip install -r requirements.txt pytest httpx pytest-cov hypothesis black ruff
uvicorn main:app --port 8000 --reload
```

To run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The production routing is defined in `vercel.json`, using one Vercel Services project. The original API routes are sent to the FastAPI backend and all website pages to Next.js. For same-origin local routing, use `vercel dev` at the repository root or configure an equivalent development proxy.

## Property-based testing

The Python test suite also uses Hypothesis to test Rules, SimPy, schema validation,
timeline recording, and quality reporting with generated inputs. Run the full
suite with `pytest` (including the SimPy tests marked `slow`).
CI runs all of these tests as well; the Engineering page reports the actual
JUnit test cases, not the number of generated Hypothesis examples.

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


## TwinPeak guided dashboard (C6, Nov 2026)

The public-facing **TwinPeak** dashboard uses the ServerAgent simulation engine under the hood. Product branding changes do **not** rename existing backend modules, endpoints or Git repository.

- **`/demo`**: guided role entry without a shared password. A first-time **QRIS Payment / Cycle 03** alignment case and related incident are seeded using an **actual SimPy `POST /verdict` response**. Existing reports/decisions are retained; the system never invents a passing result when the endpoint fails. `/login` remains available.
- **Six primary workspace menus**: Overview, Release Alignment, Incident Response, Sign-Off, Report, Access & Roles. Only permitted role-specific menus appear. Additional tools (SimPy Workbench, Compare Loads, Model Methodology, API Explorer, Engineering Quality, LLM Settings) are retained in **Explore**.
- **Alignment**: editable server inputs and a Normal / 2x / 3x what-if evaluation, each in the same session. Valid cases are executed using the unchanged SimPy engine; details are expandable so verdict and the limiting resource appear first.
- **Fourth verdict**: **Tidak Dapat Dinilai** now means an actual SimPy evaluation request failed to produce a result, such as when the evaluation service is unavailable. There is no universal 150 RPS ceiling. Normal/2×/3× scenarios each call the real engine; successful requests retain their computed verdicts, while failures remain unassessable without fabricated resource values.
- **Technical Lead**: one decision control (Return to Dev / Forward for sign-off), mandatory follow-up notes, and confirmation before saving. A high-risk scenario is highlighted, not silently blocked by a new business rule. Manager signs off or rejects the *same* candidate with a reason and timestamp.
- **Incident flow**: Support creates incidents; Integration Engineer evaluates before-and-after SimPy mitigation using the saved case.
- **Reports**: filter records by category, service, cycle and date; download actual browser-generated **PDF** or CSV. PDF creation uses `jspdf`, and includes relevant evaluation evidence, decisions and the interpretation when available.
- **Session-only LLM integration**: `Explore → LLM Settings` provides a per-tab API key, model ID, and endpoint. Credentials are held in browser `sessionStorage`, never in a database or report, and removed by **Clear session**, **Sign out**, or tab close. `POST /api/reasoning` uses a stateless Next.js handler to contact explicitly allowed public OpenAI-compatible Chat Completions endpoints (OpenAI, OpenRouter, Groq, DeepSeek, Together, xAI). Server-side code does not persist the key, follow redirects, or expose provider response bodies. Without a configured key, the user sees clearly marked deterministic guidance. LLM-generated text never overrides a SimPy verdict. Use only a low-privilege, limited-budget API key; browser session storage is vulnerable to any script/XSS running on the site.

Nothing sends load to Production. Guided role permissions and saved release records are browser-local demonstration behavior; they do not constitute backend authorization or shared audit storage. Avoid presenting them as production-ready security controls.

This implementation adapts the C6 PPT's user flows and layout without copying unsupported thread-pool, p95, error-rate, calibration-date or LLM-cost metrics. No domain purchase, DNS change, or engine API contract change was performed.

### Application-specific workload settings

Release Alignment keeps the main inputs (CPU cores, RAM, RPS) concise. **Advanced Settings & Workload Profile** is collapsed initially and exposes CPU time/request, memory/request, concurrent requests, response payload, bandwidth and connection limits. The submitted values feed the existing SimPy engine. Operators can identify the origin as sample assumptions or load-test values; this is not an automated calibration or independent verification of a production workload.

### Ephemeral LLM configuration

- `frontend/lib/llm-session.ts` stores settings in the active tab session, not `localStorage`, cookies, reports, or server storage. The user can explicitly clear the key, and the logout workflow clears it as well.
- `frontend/app/api/reasoning/route.ts` validates the full HTTPS provider endpoint against a fixed list, blocks arbitrary hosts (including localhost/private hosts), sets no-store responses, avoids redirects and does not log credentials in application code. The user's provider may retain prompts or charge for requests according to its own policy.
- `Test connection` performs a real minimal API call using the currently entered credentials.
- `kind='indeterminate'` is called only when an actual SimPy evaluation fails and the user has configured an LLM session; any AI text is an explanation of missing evidence and next steps, not a new capacity verdict.
- `kind='report'` can provide an optional narrative for report/PDF output.
- No configured key → explanatory guidance based on the available evidence, never mislabeled as an LLM response.

**Security:** `sessionStorage` is accessible to scripts in the same origin. This is suitable as an explicitly temporary demo workflow, **not a secure production secrets vault**. Use an expendable limited-budget key and avoid sensitive production prompts.


### Expandable case lists and evidence-rich PDF exports

The Release Alignment, Incident Response, Sign-Off, and Report record lists use native accessible `<details>/<summary>` disclosures: users can open a record to inspect the full verdict, CPU/RAM/network evidence, QA and review notes, incident mitigation, sign-off status, and a real SimPy time-series preview when available. Report history remains searchable and its rows show an explicit expand icon. The Overview workflow list navigates when the whole row is clicked. Each workflow record also provides an individual case PDF.

Report PDFs use jsPDF to render an executive summary, recorded model verdicts and decisions, and up to three line charts per saved real SimPy scenario: **CPU / RAM / network occupancy**, **request arrivals vs completions**, and **average queue length** versus simulated seconds. Chart points come only from recorded SimPy `/api/v1/simpy/inspect` event buckets; browser storage retains at most 150 evenly selected **existing** points for each trace, without interpolating metrics. Both the Workbench and Release Alignment now save compact real timelines alongside the computed verdict. Incident before/after inspections save their separate timelines. An older QRIS sample attempts to backfill the original timeline using the saved request while preserving previously recorded decisions and original verdict, only if the model still returns the same verdict. Older cases with no compatible trace show an explicit note instead of a synthetic plot.

## Cross-stack Engineering Quality (CI)

The production build, Python simulation, frontend behavior, browser journeys and source/dependency security checks are measured by `.github/workflows/quality.yml`. The Engineering Quality page displays actual job outcomes and loads its detailed evidence by commit/run ID from `quality-reports`.

| Quality layer | Tool | Measured evidence |
| --- | --- | --- |
| Simulation and API | Pytest + pytest-cov | Individual tests, durations, line/branch coverage |
| React/TypeScript behavior | Vitest + React Testing Library | Per-case unit/component/API contract outcomes |
| Frontend coverage | Vitest V8 | Lines, branches, functions (targeted modules only) |
| Browser journey | Playwright Chromium | Real UI navigation and response-header checks |
| Frontend typing/build | TypeScript + Next.js | Production build and typecheck status |
| Python quality | Black + Ruff | Formatting and lint gates |
| Python SAST | Bandit | Severity totals and medium+ gate |
| JavaScript dependencies | npm audit | Production dependency findings; high/critical gate |
| Python dependencies | pip-audit | Known dependency vulnerabilities; failing gate |
| Temporary LLM credentials | Vitest regression suite | Session clearing, allowlisted hosts, error redaction, SSRF checks |

The frontend has `npm run test:unit`, `npm run test:coverage`, and `npm run test:e2e`. Vitest uses a browser-like jsdom test environment while Playwright drives a real Chromium browser. CI publishes sanitized JUnit summaries and audit counts without captured secrets or failure log bodies. The displayed count is not synthetic; unreported results remain unavailable, never '0 passed'. Unreviewed application code, runtime authorization, and external penetration testing remain outside these automated tests; passing does not prove complete security.

### Frontend coverage policy (100% targeted gate)

The frontend unit suite now measures **100% lines, statements, branches and functions** in each of the **seven existing explicitly included modules** (`frontend/vitest.config.ts`). Vitest enforces all four metrics at **100% per file** in CI, so new untested paths in those modules fail the quality gate. No source modules or files were removed from the covered set to improve the percentages. The baseline grew from 47 Vitest cases to a broader regression suite exercising API errors, real-model trace contracts, role sessions, QRIS case initialization and migration, malformed data, replay recovery, and LLM security boundaries. The four percentage metrics describe **these seven selected production modules**, not every Next.js page and component; coverage of other frontend areas is a separate expansion of scope.


## Platform Showcase (examiner-facing, not a business use case)

The top-level **Showcase** link opens `/showcase` as an always-visible technical reference for all five browser demo personas. It replaces the old role-dependent **Explore** dropdown.

- Six working demonstrations: SimPy Workbench, Compare Loads, Engineering Quality, API Explorer, Model Methodology and optional LLM Settings.
- Real source links: GitHub Actions workflow executions and YAML definition, published `quality-reports/latest.json`, backend `/api/v1/quality`, Swagger `/docs`, and machine-readable `/openapi.json`.
- Technical showcase routes are available regardless of the selected persona. Role-specific *operational* journeys (QA submission, incident escalation, Technical Lead review, Manager sign-off) keep their distinct UI boundaries to demonstrate the functional model.
- Showcase is **not** a sixth role or an extra UAM-controlled use case. The demo's browser-side role navigation is not backend authorization. All CI, coverage, audit and engine claims continue to be drawn from recorded evidence rather than invented metrics.

