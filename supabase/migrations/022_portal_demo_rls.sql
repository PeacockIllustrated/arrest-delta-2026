-- ============================================================================
-- Portal Demo RLS — anon-key read access for live-demo walkthrough
-- ============================================================================
-- The scraper's 001_ingestion_schema.sql enables RLS on `audit_log`,
-- `pipeline_runs`, `evidence_snapshots`, `candidate_records`, `enriched_records`,
-- `charges` but never creates SELECT policies. That means the anon key the
-- frontend uses can only read the 3 tables someone already opened up
-- (`escalations`, `counties`, `sources`).
--
-- This migration adds a narrow set of SELECT policies so the live demo can
-- render the Audit, Pipeline Health, Record Search, and Source Evidence pages.
-- Writes remain gated by RLS (only service role can insert/update/delete).
--
-- WARNING: this exposes ingested data (person names, charges, mugshot URLs) to
-- the anon key. Fine for a demo with non-public anon key, NOT for a customer-
-- facing portal where random visitors load the page. Flip these policies off
-- before shipping to end users.
-- ============================================================================

-- audit_log — portal Audit page
DROP POLICY IF EXISTS portal_demo_read_audit_log ON public.audit_log;
CREATE POLICY portal_demo_read_audit_log ON public.audit_log
    FOR SELECT USING (true);

-- pipeline_runs — portal Pipeline Health page
DROP POLICY IF EXISTS portal_demo_read_pipeline_runs ON public.pipeline_runs;
CREATE POLICY portal_demo_read_pipeline_runs ON public.pipeline_runs
    FOR SELECT USING (true);

-- evidence_snapshots — portal Escalation Detail / Source Evidence
DROP POLICY IF EXISTS portal_demo_read_evidence_snapshots ON public.evidence_snapshots;
CREATE POLICY portal_demo_read_evidence_snapshots ON public.evidence_snapshots
    FOR SELECT USING (true);

-- candidate_records — portal Record Search + Roster
DROP POLICY IF EXISTS portal_demo_read_candidate_records ON public.candidate_records;
CREATE POLICY portal_demo_read_candidate_records ON public.candidate_records
    FOR SELECT USING (true);

-- enriched_records — portal Record Search (detail view)
DROP POLICY IF EXISTS portal_demo_read_enriched_records ON public.enriched_records;
CREATE POLICY portal_demo_read_enriched_records ON public.enriched_records
    FOR SELECT USING (true);

-- charges — portal Record detail (charge breakdown)
DROP POLICY IF EXISTS portal_demo_read_charges ON public.charges;
CREATE POLICY portal_demo_read_charges ON public.charges
    FOR SELECT USING (true);

-- county_sources — portal Source Health map
DROP POLICY IF EXISTS portal_demo_read_county_sources ON public.county_sources;
CREATE POLICY portal_demo_read_county_sources ON public.county_sources
    FOR SELECT USING (true);

-- error_codes / error_events — portal Pipeline Health
DROP POLICY IF EXISTS portal_demo_read_error_codes ON public.error_codes;
CREATE POLICY portal_demo_read_error_codes ON public.error_codes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS portal_demo_read_error_events ON public.error_events;
CREATE POLICY portal_demo_read_error_events ON public.error_events
    FOR SELECT USING (true);
