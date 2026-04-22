# ArrestWatch — Demo Runbook

Portal runs in **demo mode by default**: no Supabase project, no credentials, no setup. The in-memory simulator streams synthetic-but-realistic arrest events continuously, and the portal auth wall is bypassed so the full UI is reachable.

## Start the demo

```bash
cd app
npm install   # first run only
npm run dev
```

Open `http://localhost:5173/portal/dashboard`.

The simulator auto-starts on mount and seeds 5 events in the first 400 ms so the UI looks populated the instant you arrive. New events arrive every 3.5–6 s after that.

## Demo walkthrough (suggested order)

1. **Dashboard** `/portal/dashboard` — the headline page. KPIs (individuals monitored, alerts generated, confidence bands), top coverage counties, and a live US map that pulses on each new event.
2. **Alerts** `/portal/alerts` — streaming feed with Live Stream badge, filters (severity / status / search), and per-row Escalate action. Tallies refresh as events arrive.
3. **Incidents** `/portal/incidents` — same feed re-shaped as incidents with List / Map / Timeline views. The Map view shows a live heatmap by jurisdiction; Timeline stacks the newest 20.
4. **Audit trail** `/portal/audit` — append-only ledger with cryptographic chain-hash linkage between entries. Every simulator tick emits five system entries (snapshot captured → record parsed → diff computed → confidence scored → event emitted). Human actions (viewing / reviewing / escalating) also append here.
5. **Source health / Pipeline health** `/portal/source-health`, `/portal/pipeline-health` — shows per-county latency and parser versions; counties randomly drift between healthy / degraded / down and self-heal.

## Switching to live Supabase

The portal's live feed is designed to read directly from the ingestion tables
written by the ArrestDelta scraper repo (`api-repo-fl-wokring`). No extra
migrations are needed in this repo — the scraper defines the required tables
and the portal's `escalationAdapter.ts` is already shaped for its payload.

**Step 1 — apply the two schema sets to a single Supabase project:**

From **this repo** (`arrest-watch-landing`), run migrations at
`supabase/migrations/001_portal_schema.sql` through `019_portal_data_purge.sql`
(plus `20260115_uber_demo_checklist.sql`). These define the customer-facing
Phase 1 tables: `organisations`, `profiles`, `watchlists`, `entities`,
`alerts`, `audit_logs`, admin/deck tables, etc.

From the **scraper repo** (`api-repo-fl-wokring/supabase/migrations/`), run:
- `001_ingestion_schema.sql` — `pipeline_runs`, `escalations`, `audit_log`, `evidence_snapshots`
- `002_dashboard_schema.sql` — reference tables, `candidate_records`, `enriched_records`, `charges`
- `003_materialized_views.sql` — aggregate views for dashboards
- `004_seed_data.sql` — counties / sources / error_codes reference data
- `005`–`008` as needed for image storage, biometric testing, multi-tenant

The two sets don't conflict: the portal uses `alerts`/`audit_logs` for user
watchlist actions; the scraper writes to `escalations`/`audit_log` for ingested
arrests. The portal's live hook (`useSupabasePortal.ts`) queries the scraper's
tables directly.

**Step 2 — point the portal at that project:**

```env
VITE_PORTAL_MODE=live
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Restart the dev server.

**Step 3 — run the scraper:**

Set the same project's `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_ANON_KEY` in the scraper's `.env`, then `npm run pipeline` (or
`pipeline:demo` for seeded demo data). The publisher writes escalations +
audit events; the portal's realtime subscription picks them up.

In live mode the portal auth wall is restored — you'll need a user row in
`profiles` with `role='super_admin'` to reach the portal.

## What's not real (yet)

- No arrest-data ingestion pipeline — simulator only.
- Pages outside the streamed feed (Employees, Watchlists, Cases, Risk Assessment, Reports, Record Search, Mugshot Search) still render from static mock data. They look fine in a walkthrough but won't update live.
- `useSupabasePortal` covers dashboard/alerts/audit/pipeline in live mode; the other pages are demo-only for now.

## Known quirks

- Large `index-*.js` chunk (~610 kB) — Vite warns at 500 kB. Not blocking; worth code-splitting before production.
- `ids.txt` at repo root is a dead 2 MB artifact — safe to delete.
- `react-router` 7.10.1 has known CVEs; not exploitable for SPA routing but worth upgrading before production.
