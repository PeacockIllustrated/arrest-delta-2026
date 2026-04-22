-- ============================================================================
-- Portal Demo RLS — anon-key read access for live-demo walkthrough
-- ============================================================================
-- The scraper's 001_ingestion_schema.sql enables RLS on `audit_log`,
-- `pipeline_runs`, `evidence_snapshots`, `candidate_records`, `enriched_records`,
-- `charges`, `county_sources` but never creates SELECT policies AND never
-- grants SELECT to anon/authenticated. Two things are needed for anon to read:
--   1. A policy permitting SELECT   (CREATE POLICY ... FOR SELECT USING true)
--   2. Table-level grant to the role (GRANT SELECT ON <table> TO anon, authenticated)
--
-- Without (2), PostgREST fails the grant check before even evaluating the policy.
-- The first pass of this migration only added policies; this version adds grants.
--
-- WARNING: this exposes ingested data (names, charges, mugshot URLs) to the
-- anon key. Fine for a demo; flip off via `REVOKE SELECT ON <table> FROM anon`
-- before shipping to end users.
-- ============================================================================

-- helper macro isn't available in plain SQL, so we repeat the pattern per table.
-- Order is idempotent — safe to re-run.

-- audit_log
DROP POLICY IF EXISTS portal_demo_read_audit_log ON public.audit_log;
CREATE POLICY portal_demo_read_audit_log ON public.audit_log
    FOR SELECT USING (true);
GRANT SELECT ON public.audit_log TO anon, authenticated;

-- pipeline_runs
DROP POLICY IF EXISTS portal_demo_read_pipeline_runs ON public.pipeline_runs;
CREATE POLICY portal_demo_read_pipeline_runs ON public.pipeline_runs
    FOR SELECT USING (true);
GRANT SELECT ON public.pipeline_runs TO anon, authenticated;

-- evidence_snapshots
DROP POLICY IF EXISTS portal_demo_read_evidence_snapshots ON public.evidence_snapshots;
CREATE POLICY portal_demo_read_evidence_snapshots ON public.evidence_snapshots
    FOR SELECT USING (true);
GRANT SELECT ON public.evidence_snapshots TO anon, authenticated;

-- candidate_records
DROP POLICY IF EXISTS portal_demo_read_candidate_records ON public.candidate_records;
CREATE POLICY portal_demo_read_candidate_records ON public.candidate_records
    FOR SELECT USING (true);
GRANT SELECT ON public.candidate_records TO anon, authenticated;

-- enriched_records
DROP POLICY IF EXISTS portal_demo_read_enriched_records ON public.enriched_records;
CREATE POLICY portal_demo_read_enriched_records ON public.enriched_records
    FOR SELECT USING (true);
GRANT SELECT ON public.enriched_records TO anon, authenticated;

-- charges
DROP POLICY IF EXISTS portal_demo_read_charges ON public.charges;
CREATE POLICY portal_demo_read_charges ON public.charges
    FOR SELECT USING (true);
GRANT SELECT ON public.charges TO anon, authenticated;

-- county_sources
DROP POLICY IF EXISTS portal_demo_read_county_sources ON public.county_sources;
CREATE POLICY portal_demo_read_county_sources ON public.county_sources
    FOR SELECT USING (true);
GRANT SELECT ON public.county_sources TO anon, authenticated;

-- error_codes (reference data; not sensitive)
DROP POLICY IF EXISTS portal_demo_read_error_codes ON public.error_codes;
CREATE POLICY portal_demo_read_error_codes ON public.error_codes
    FOR SELECT USING (true);
GRANT SELECT ON public.error_codes TO anon, authenticated;

-- error_events
DROP POLICY IF EXISTS portal_demo_read_error_events ON public.error_events;
CREATE POLICY portal_demo_read_error_events ON public.error_events
    FOR SELECT USING (true);
GRANT SELECT ON public.error_events TO anon, authenticated;

-- Materialized views powering useDashboardStats (reads fail silently right now)
-- These don't have RLS (mvs don't support it) but DO need the grant for anon.
GRANT SELECT ON public.mv_daily_county_stats      TO anon, authenticated;
GRANT SELECT ON public.mv_hourly_ingestion        TO anon, authenticated;
GRANT SELECT ON public.mv_charge_analysis         TO anon, authenticated;
GRANT SELECT ON public.mv_demographics            TO anon, authenticated;
GRANT SELECT ON public.mv_pipeline_health         TO anon, authenticated;
GRANT SELECT ON public.mv_error_summary           TO anon, authenticated;
GRANT SELECT ON public.mv_source_reliability      TO anon, authenticated;

-- Nudge PostgREST to reload its schema cache so the new grants take effect
-- immediately rather than on next deploy.
NOTIFY pgrst, 'reload schema';
