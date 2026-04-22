// =============================================================================
// PORTAL DATA ABSTRACTION - Zero-regression demo vs live switch
// =============================================================================

import { useDemoSim } from '../context/DemoSimContext';
import { useSupabasePortal } from './useSupabasePortal';

/**
 * Portal Mode - read from environment variable
 * 'demo' = Use simulation data (useDemoSim)
 * 'live' = Use real Supabase data (useSupabasePortal)
 */
export type PortalMode = 'demo' | 'live';

/**
 * Get the current portal mode from environment
 */
export function getPortalMode(): PortalMode {
    const mode = import.meta.env.VITE_PORTAL_MODE;
    if (mode === 'live') return 'live';
    return 'demo'; // Default to demo for safety
}

/**
 * Check if we are in live mode
 */
export function isLiveMode(): boolean {
    return getPortalMode() === 'live';
}

/**
 * Check if we are in demo mode
 */
export function isDemoMode(): boolean {
    return getPortalMode() === 'demo';
}

/**
 * Live-demo bypass: in live mode but with VITE_ALLOW_LIVE_DEMO=true, the auth
 * wall is waived so the portal can be walked through without signing in.
 * Real Supabase reads still happen — only the guard is bypassed.
 */
export function isLiveDemoBypass(): boolean {
    return getPortalMode() === 'live' && import.meta.env.VITE_ALLOW_LIVE_DEMO === 'true';
}

// =============================================================================
// VIEW-MODELS - UI-facing data structures (adapter output)
// These are consumed by UI components, never raw payload JSON.
// =============================================================================

/**
 * Subject identity for display in alert cards and detail views
 */
export interface SubjectIdentity {
    subjectName: string;
    dobYear: number | null;
    mugshotUrl: string | null; // Signed URL or null if not available
}

/**
 * Single charge entry
 */
export interface ChargeEntry {
    description: string;
    severity: 'felony' | 'misdemeanor' | 'infraction' | 'unknown';
}

/**
 * Biometric verification result
 */
export interface BiometricResult {
    verified: boolean;
    confidence: number; // 0-100
    method: 'face_match' | 'fingerprint' | 'manual' | 'none';
}

/**
 * Evidence artifact reference (for verification)
 */
export interface EvidenceArtifact {
    artifactId: string;
    artifactType: 'mugshot' | 'page_snapshot' | 'pdf_report';
    storagePath: string;
    sha256: string | null; // null if not hashed (verification unavailable)
    signedUrl: string | null; // null until fetched
}

/**
 * AlertCardModel - Used in the Dashboard feed and Alerts list
 */
export interface AlertCardModel {
    escalationKey: string;
    createdAt: string; // ISO timestamp
    subject: SubjectIdentity;
    jurisdictionId: string;
    jurisdictionLabel: string;
    severityScore: number; // 0-100
    confidenceScore: number; // 0-100
    topCharge: string | null;
    chargeCount: number;
    status: 'new' | 'reviewed' | 'escalated';
    runId: string;
}

/**
 * EscalationDetailModel - Full payload for the EscalationDetail page
 */
export interface EscalationDetailModel extends AlertCardModel {
    charges: ChargeEntry[];
    biometric: BiometricResult;
    evidence: EvidenceArtifact[];
    bookingId: string | null;
    bookingDate: string | null;
    rawPayloadPreview: string; // Truncated JSON for debugging
}

/**
 * AuditLogEntryModel - Normalized audit log entry for the Audit trail
 */
export interface AuditLogEntryModel {
    auditId: string;
    runId: string;
    escalationKey: string | null;
    eventType: string;
    createdAt: string; // ISO timestamp
    detailsSummary: string;
    actor: 'system' | 'human';
}

/**
 * PipelineRunModel - Status of a scraper execution
 */
export interface PipelineRunModel {
    runId: string;
    status: 'running' | 'completed' | 'failed';
    startedAt: string; // ISO timestamp
    finishedAt: string | null;
    escalationCount: number;
    auditEventCount: number;
}

// =============================================================================
// PORTAL DATA RETURN TYPE
// This is the unified interface consumed by all portal UI components.
// =============================================================================

/**
 * Coverage data for a jurisdiction (for KPI cards)
 */
export interface CoverageModel {
    jurisdictionId: string;
    displayName: string;
    monitoredCount: number;
}

/**
 * County health status (for map overlays)
 */
export interface CountyHealthModel {
    jurisdictionId: string;
    state: 'healthy' | 'degraded' | 'down';
    lastSuccessfulScanAtISO: string;
    latencyMs: number;
    parserVersionLabel: string;
}

/**
 * Input for appending an audit entry (demo mode only)
 */
export interface AuditEntryInput {
    actor: { actorType: 'system' | 'human'; actorId: string; actorLabel: string };
    action: { actionType: string; actionLabel: string };
    jurisdictionId: string;
    eventId?: string;
    personId?: string;
    summary: string;
    metadata?: Record<string, string | number | boolean>;
}

export interface PortalDataState {
    isOn: boolean; // Simulator running (demo) or realtime connected (live)
    alerts: AlertCardModel[]; // Escalations mapped to AlertCardModel
    auditEntries: AuditLogEntryModel[];
    pipelineRuns: PipelineRunModel[];
    activePulse: { jurisdictionId: string; atISO: string } | null;
    connectionStatus: 'connected' | 'polling' | 'disconnected';

    // Dashboard-specific (Full Abstraction)
    coverageByCounty: CoverageModel[];
    countyHealth: Record<string, CountyHealthModel>;
}

export interface PortalDataActions {
    start: () => void;
    stop: () => void;
    reset: () => void;
    pulse: (jurisdictionId: string) => void;
    markStatus: (escalationKey: string, status: 'reviewed' | 'escalated') => void;
    refreshAlerts: () => Promise<void>;

    // Audit action (demo mode only - no-op in live mode)
    appendAudit: (entry: AuditEntryInput) => void;
}

export type UsePortalDataReturn = PortalDataState & PortalDataActions;

// =============================================================================
// usePortalData HOOK - The single entry point for portal data
// =============================================================================

/**
 * Main hook for consuming portal data.
 * Delegates to useDemoSim (demo mode) or useSupabasePortal (live mode).
 * 
 * INVARIANT: UI components MUST use this hook, never the underlying implementations.
 */
export function usePortalData(): UsePortalDataReturn {
    const mode = getPortalMode();

    // Live mode - delegate to useSupabasePortal
    if (mode === 'live') {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useSupabasePortal();
    }

    // Demo mode - delegate to useDemoSim with adapter mapping
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sim = useDemoSim();

    // Map simulator events to AlertCardModel
    const alerts: AlertCardModel[] = sim.events.map((event) => ({
        escalationKey: `${event.personId}|${event.evidence.recordAfter.bookingRef}`,
        createdAt: event.createdAtISO,
        subject: {
            subjectName: event.evidence.recordAfter.person.displayName,
            dobYear: event.evidence.recordAfter.person.dobYear,
            mugshotUrl: null, // Demo mode has no real mugshots
        },
        jurisdictionId: event.jurisdictionId,
        jurisdictionLabel: event.evidence.source.label,
        severityScore: event.confidence, // Demo maps confidence to severity
        confidenceScore: event.confidence,
        topCharge: event.evidence.recordAfter.charges[0] || null,
        chargeCount: event.evidence.recordAfter.charges.length,
        status: event.status,
        runId: `demo-run-${event.eventId.split('-')[1]}`,
    }));

    // Map simulator audit to AuditLogEntryModel
    const auditEntries: AuditLogEntryModel[] = sim.audit.map((entry) => ({
        auditId: entry.auditId,
        runId: 'demo-run',
        escalationKey: entry.eventId ? `demo-${entry.eventId}` : null,
        eventType: entry.action.actionType,
        createdAt: entry.atISO,
        detailsSummary: entry.summary,
        actor: entry.actor.actorType,
    }));

    // Demo mode has no pipeline runs
    const pipelineRuns: PipelineRunModel[] = [];

    return {
        isOn: sim.isOn,
        alerts,
        auditEntries,
        pipelineRuns,
        activePulse: sim.activePulse,
        connectionStatus: sim.isOn ? 'connected' : 'disconnected',

        // Dashboard-specific (mapped from demo sim)
        coverageByCounty: sim.coverageByCounty.map((c) => ({
            jurisdictionId: c.jurisdictionId,
            displayName: c.displayName,
            monitoredCount: c.monitoredCount,
        })),
        countyHealth: Object.fromEntries(
            Object.entries(sim.countyHealth).map(([id, health]) => [
                id,
                {
                    jurisdictionId: health.jurisdictionId,
                    state: health.state,
                    lastSuccessfulScanAtISO: health.lastSuccessfulScanAtISO,
                    latencyMs: health.latencyMs,
                    parserVersionLabel: health.parserVersionLabel,
                },
            ])
        ),

        // Actions
        start: sim.start,
        stop: sim.stop,
        reset: sim.reset,
        pulse: sim.pulse,
        markStatus: (escalationKey: string, status: 'reviewed' | 'escalated') => {
            // In demo mode, we need to find the eventId from the escalationKey
            const event = sim.events.find(
                (e) => `${e.personId}|${e.evidence.recordAfter.bookingRef}` === escalationKey
            );
            if (event) {
                sim.markStatus(event.eventId, status);
            }
        },
        refreshAlerts: async () => {
            // Demo mode doesn't need refresh - data is in memory
            return Promise.resolve();
        },
        appendAudit: (entry: AuditEntryInput) => {
            // In demo mode, delegate to sim.appendAudit with proper type coercion
            sim.appendAudit({
                actor: entry.actor as { actorType: 'system' | 'human'; actorId: string; actorLabel: string },
                action: entry.action as { actionType: 'viewed' | 'reviewed' | 'escalated'; actionLabel: string },
                jurisdictionId: entry.jurisdictionId,
                eventId: entry.eventId,
                personId: entry.personId,
                summary: entry.summary,
                metadata: entry.metadata,
            });
        },
    };
}

export default usePortalData;
