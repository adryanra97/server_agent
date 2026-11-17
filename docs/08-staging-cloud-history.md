# TwinPeak staging: persistent shared demo history

## Scope

Changes in `feat/staging-backtop-persistence` target `staging` only. The existing `main` production branch is not changed.

A Neon integration being installed in Vercel does **not** mean a database is attached to project `server-agent`. At audit time the integration had 0 connected projects and the Vercel project had 0 environment variables. No database contents or schema could be verified.

## Activation checklist (required for actual cloud persistence)

1. In Vercel Storage, provision a dedicated **TwinPeak** Neon project for **project `server-agent`**. Create a staging branch alongside production. Never reuse the `mti-akpsi-task` Neon project or generic database credentials, even if Vercel offers them automatically.
2. In Neon's SQL Editor, execute `frontend/db/001_workspace.sql` once per TwinPeak database branch (staging and production); verify both schema instances separately. The migration adds the records table and audit-event table with status and service indexes.
3. Set the dedicated server-side `TWINPEAK_DATABASE_URL` (never fall back to shared `DATABASE_URL` or `POSTGRES_URL`) and a high-entropy `TWINPEAK_SESSION_SECRET` (32+ random bytes) for **Preview / staging** only. Do not expose these variables via `NEXT_PUBLIC_`. Optionally set `TWINPEAK_DEMO_PASSWORD` and update the login experience if you do.
4. Redeploy `staging`, visit /login, and confirm the indicator says **Cloud history active**; a 503 or missing database table keeps the UI in a clearly labeled local-only mode.
5. Validate with two browsers: submit a new QA simulation and release alignment; switch to Lead to record the technical decision, then Manager for sign-off. Confirm both browsers show the same records under Dashboard and Reports. Also record an incident as Support and resolve it as Engineer. Download a PDF and confirm its export manifest appears in Reports.
6. Verify the SQL audit table records role, previous status and new status. Verify the production `main` deployment and its environment remain unchanged.

## Storage behaviour

- The server authoritatively stores simulation input and output, alignment, incidents, sign-off transitions, and report-export **metadata** in PostgreSQL. Reports are still generated/downloaded as PDF in the browser; the PDF binary itself is **not** archived in Neon.
- Server transactions enforce demo role transitions and append audit events atomically. Simulation evidence is immutable after first write.
- Existing browser-only history is not silently imported into a shared database. Local history remains as fallback if the database is not connected. The workspace indicator shows the storage mode and failures.
- Shared report history is refreshed when entering workspace routes or refocusing the tab. The demo session expires after 12 hours.
- The application includes a **public, shared demo password** and is not real user authentication. Use synthetic data only. Before connecting real company data, replace the demo identity model with secure authentication and per-service authorization.
- This first implementation limits list reads to 1000 records, JSON submissions to 1 MB, and keeps 50 recent simulations in browser-local fallback. For sustained production traffic, add pagination and retention policies.

## Quality checks

Tests cover the Back to Top interaction and reduced motion, role-based workflow restrictions, immutable simulations, and PostgreSQL-backed storage contract helpers. CI remains the source of truth for actual executed test counts.

The production branch is intentionally unaffected.

## Explicit database isolation guard

The app reads `TWINPEAK_DATABASE_URL` only, **not** Neon integration-generated `DATABASE_URL` or `POSTGRES_URL`. This prevents TwinPeak from accidentally querying another connected Vercel app's database. Assign `TWINPEAK_DATABASE_URL` to the staging branch (Preview git branch `staging`) and the production branch (Production target) using distinct connection strings. The shared public demo login is **not** suitable for confidential real production data. Do not enable cloud writes on the public production domain until authentication is hardened.
