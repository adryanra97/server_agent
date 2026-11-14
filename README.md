# ServerAgent

An AI-powered digital twin foundation for server capacity modeling and release intelligence, built from the [copdash](https://github.com/mauikut-com/copdash) Rules and SimPy engines with a visual Next.js workspace.

**Status:** engineering preview. Real capacity verdicts and topology calculations are available through FastAPI. Release workflow, secure history, production calibration, and AI orchestration are staged capabilities, not represented as finished.

## Architecture

- **Frontend:** Next.js 16, React, TypeScript, enterprise-blue design system, interactive visualizations.
- **Backend:** FastAPI with preserved copdash `app/` engines and versioned `/api/v1` endpoints.
- **Deployment:** one Vercel Services project with Next.js and Python FastAPI.
- **Data:** local browser history for the preview; optional private Neon PostgreSQL API behind `DATA_API_KEY`.
- **Quality:** GitHub Actions for Pytest/coverage, Black, Ruff, TypeScript, and Next.js build.

## Routes

| UI route | Purpose |
| --- | --- |
| `/` | Landing page and animated topology demo |
| `/dashboard` | Workspace overview |
| `/simulation` | Interactive Rules or SimPy capacity modeling and scenario comparison |
| `/topology` | Multi-node traffic distribution & offline-node assessment |
| `/incidents` | Synthetic incident diagnosis and mitigation comparison |
| `/reports` | Browser-local simulation history and CSV export |
| `/signoff` | Browser-local demonstration sign-off flow (not operational approval) |
| `/developer` | Live JSON request playground |
| `/quality` | GitHub Actions status and quality gate registry |
| `/api/docs` | FastAPI Swagger UI |
| `/api/openapi.json` | OpenAPI document |

## Local development

Prerequisites: Node.js 22+, Python 3.12+.

```bash
# Shell 1 — FastAPI
cd backend
pip install -r requirements.txt pytest httpx
uvicorn main:app --port 8000 --reload

# Shell 2 — Next.js
cd frontend
npm install
npm run dev
```

For local development using one origin and full Vercel Services routing, run `vercel dev -L` from the repository root instead. Next.js standalone mode assumes that `/api/` is routed to FastAPI by Vercel Services.

## Deployment on Vercel

1. Create a Vercel project connected to this GitHub repository.
2. Select **Services** as the project framework (not just Next.js).
3. Keep the project root at the repository root; `vercel.json` defines both services.
4. Vercel routes `/api/*` to FastAPI and other paths to Next.js on the same domain.
5. Optionally attach a Neon PostgreSQL integration and set `DATABASE_URL`; `DATA_API_KEY` is required for private history access.

`/api/v1/private/runs` is intentionally inaccessible without a private server credential. Do not place `DATA_API_KEY` in browser JavaScript or a `NEXT_PUBLIC_*` variable. Authentication and role-based access are required before enabling cloud history through the UI.

## Original engine attribution

The `backend/app/` core engine modules and `backend/tests/test_verdict.py`, `backend/tests/test_simpy.py` and `backend/tests/conftest.py` are copied from the [mauikut-com/copdash](https://github.com/mauikut-com/copdash) repository for adaptation with the source owner's permission. Check with the author regarding a redistribution license before publishing downstream copies.

## Validation

```bash
cd backend
pytest -q --cov=app --cov=main --cov-branch --cov-report=term-missing
black --check app main.py tests
ruff check app main.py tests

cd ../frontend
npm run lint
npm run build
```

100% line and branch coverage are **targets**, not claims of currently achieved coverage. The Engineering Quality page does not fabricate coverage results.

## Scope and safety

All models are hypothetical. No production workload is generated. SimPy uses a fixed seed and finite arrival horizon. The multi-node API independently evaluates assigned traffic on identical node specifications; it is not yet a calibrated load balancer simulation. External LLM orchestration, ELK ingestion, sign-off role controls and immutable reports are future milestones mapped to the AKPSI system proposal.
