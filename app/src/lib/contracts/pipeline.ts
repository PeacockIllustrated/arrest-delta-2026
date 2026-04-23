// =============================================================================
// PIPELINE CONTRACTS - Single source of truth for data flow
// =============================================================================

/**
 * Reference to a data source (jail roster page, PDF, etc.)
 */
export interface SourceRef {
    sourceId: string;
    jurisdictionId: string; // County FIPS id used by the map (e.g., "c12086")
    label: string;
    sourceType: 'html' | 'pdf' | 'json' | 'js';
    canonicalUrl: string;
}

/**
 * A point-in-time capture of source content
 */
export interface Snapshot {
    snapshotId: string;
    source: SourceRef;
    capturedAtISO: string;
    contentType: string;
    fingerprintHash: string;
    rawPreview: string; // Short, human-readable preview (not full payload)
    parserVersion: string;
}

/**
 * A parsed record extracted from a snapshot
 */
export interface ParsedRecord {
    recordId: string;
    snapshotId: string;
    jurisdictionId: string;
    observedAtISO: string;
    bookingRef: string;
    person: {
        personId: string;
        displayName: string; // Synthetic name
        dobYear: number;
        /** Optional mugshot URL — only set when the roster entry maps to a real photo. */
        mugshotUrl?: string;
    };
    charges: string[];
    custodyStatus: 'in_custody' | 'released' | 'unknown';
    match: {
        matchConfidence: number; // 0-100
        matchReasons: string[];
    };
}

/**
 * Difference between two snapshots
 */
export interface Diff {
    diffId: string;
    jurisdictionId: string;
    beforeSnapshotId: string;
    afterSnapshotId: string;
    highlight: string;
    changedFields: Array<{ field: string; before: string; after: string }>;
}

/**
 * A change event emitted by the pipeline
 */
export interface ChangeEvent {
    eventId: string;
    createdAtISO: string;
    jurisdictionId: string;
    eventType: 'booking_created' | 'charge_updated' | 'custody_status_changed' | 'release_detected';
    personId: string;
    confidence: number; // 0-100
    confidenceReasons: string[];
    evidence: {
        source: SourceRef;
        snapshotBefore: Snapshot;
        snapshotAfter: Snapshot;
        recordBefore: ParsedRecord;
        recordAfter: ParsedRecord;
        diff: Diff;
    };
    status: 'new' | 'reviewed' | 'escalated';
}

/**
 * Health status for a county source
 */
export interface CountyHealth {
    jurisdictionId: string;
    state: 'healthy' | 'degraded' | 'down';
    lastSuccessfulScanAtISO: string;
    lastAttemptAtISO: string;
    latencyMs: number;
    parserVersionLabel: string; // e.g., "v4.2 (Verified)"
}

// =============================================================================
// AUDIT TRAIL CONTRACTS - Phase 4 "Black Box" flight recorder
// =============================================================================

/**
 * Who performed the action
 */
export interface AuditActor {
    actorType: 'system' | 'human';
    actorId: string;      // 'system' or 'demo_user'
    actorLabel: string;   // 'System' or 'Safety Ops'
}

/**
 * System action types
 */
export type SystemActionType =
    | 'snapshot_captured'
    | 'record_parsed'
    | 'diff_computed'
    | 'confidence_scored'
    | 'event_emitted';

/**
 * Human action types
 */
export type HumanActionType =
    | 'viewed'
    | 'reviewed'
    | 'escalated';

/**
 * Combined action type
 */
export type AuditActionType = SystemActionType | HumanActionType;

/**
 * What action was taken
 */
export interface AuditAction {
    actionType: AuditActionType;
    actionLabel: string; // Human-readable label
}

/**
 * Integrity chain for append-only behaviour
 */
export interface AuditIntegrity {
    chainPrevHash?: string; // undefined for GENESIS
    chainHash: string;
}

/**
 * Full audit record with integrity chain
 */
export interface AuditEntry {
    auditId: string;
    atISO: string;
    actor: AuditActor;
    action: AuditAction;
    jurisdictionId: string;
    eventId?: string;
    personId?: string;
    summary: string;
    metadata?: Record<string, string | number | boolean>;
    integrity: AuditIntegrity;
}

/**
 * Input for creating an audit entry (before auditId, atISO, integrity)
 */
export type AuditEntryInput = Omit<AuditEntry, 'auditId' | 'atISO' | 'integrity'>;

