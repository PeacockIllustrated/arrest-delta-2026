import { useState, useCallback, useRef, useEffect } from 'react';
import type { SourceRef, Snapshot, ParsedRecord, Diff, ChangeEvent, CountyHealth, AuditEntry, AuditEntryInput, SystemActionType } from '../lib/contracts/pipeline';
import { DEMO_JURISDICTIONS, JURISDICTION_MAP } from '../lib/demo/demoJurisdictions';
import { getRandomPersonFromJurisdiction, getRosterByJurisdiction } from '../lib/demo/demoRoster';
import { buildAuditChainHash } from '../lib/utils/hash';

// =============================================================================
// DEMO SIMULATOR HOOK
// =============================================================================

const PARSER_VERSION = 'v4.2';
const MAX_EVENTS = 50;
const MAX_AUDIT_ENTRIES = 200;
const GENESIS_HASH = 'GENESIS';

// Charge pools for variety
const CHARGE_POOLS = {
    booking_created: [
        ['Driving Under Influence', 'Reckless Driving'],
        ['Possession - Controlled Substance'],
        ['Disorderly Conduct', 'Resisting Arrest'],
        ['Petit Theft'],
        ['Assault - Simple'],
        ['Trespassing'],
    ],
    charge_updated: [
        ['Aggravated Assault'],
        ['Grand Theft'],
        ['DUI - Second Offence'],
        ['Battery'],
    ],
};

// Generate unique IDs
function uid(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Generate a hash-like string
function fakeHash(): string {
    return Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14);
}

// Format ISO timestamp
function nowISO(): string {
    return new Date().toISOString();
}

// Random integer in range
function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick random from array
function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export interface DemoSimulatorState {
    isOn: boolean;
    events: ChangeEvent[];
    coverageByCounty: Array<{ jurisdictionId: string; monitoredCount: number; displayName: string }>;
    countyHealth: Record<string, CountyHealth>;
    activePulse: { jurisdictionId: string; atISO: string } | null;
    audit: AuditEntry[];  // Newest first, capped at MAX_AUDIT_ENTRIES
}

export interface DemoSimulatorActions {
    start: () => void;
    stop: () => void;
    reset: () => void;
    pulse: (jurisdictionId: string) => void;
    markStatus: (eventId: string, status: 'new' | 'reviewed' | 'escalated') => void;
    appendAudit: (entry: AuditEntryInput) => AuditEntry;
}

export type UseDemoSimulatorReturn = DemoSimulatorState & DemoSimulatorActions;

/**
 * Core demo simulator hook - emits evidence-backed ChangeEvents
 */
export function useDemoSimulator(): UseDemoSimulatorReturn {
    const [isOn, setIsOn] = useState(false);
    const [events, setEvents] = useState<ChangeEvent[]>([]);
    const [countyHealth, setCountyHealth] = useState<Record<string, CountyHealth>>(() => {
        const initial: Record<string, CountyHealth> = {};
        const now = nowISO();
        DEMO_JURISDICTIONS.forEach((j) => {
            initial[j.jurisdictionId] = {
                jurisdictionId: j.jurisdictionId,
                state: j.defaultHealth,
                lastSuccessfulScanAtISO: now,
                lastAttemptAtISO: now,
                latencyMs: randInt(80, 200),
                parserVersionLabel: `${PARSER_VERSION} (Verified)`,
            };
        });
        return initial;
    });
    const [activePulse, setActivePulse] = useState<{ jurisdictionId: string; atISO: string } | null>(null);
    const [audit, setAudit] = useState<AuditEntry[]>([]);

    const intervalRef = useRef<number | null>(null);
    const healthDriftRef = useRef<number | null>(null);

    // System action labels for audit trail
    const SYSTEM_ACTION_LABELS: Record<SystemActionType, string> = {
        snapshot_captured: 'Snapshot captured',
        record_parsed: 'Record parsed',
        diff_computed: 'Diff computed',
        confidence_scored: 'Confidence scored',
        event_emitted: 'Event emitted',
    };

    // Append audit entry with chain hash
    const appendAudit = useCallback((input: AuditEntryInput): AuditEntry => {
        const auditId = `AUD-${uid()}`;
        const atISO = nowISO();

        let entry: AuditEntry;
        setAudit((prev) => {
            const prevHash = prev.length > 0 ? prev[0].integrity.chainHash : undefined;
            const chainHash = buildAuditChainHash(
                prevHash || GENESIS_HASH,
                { ...input, auditId, atISO }
            );
            entry = {
                ...input,
                auditId,
                atISO,
                integrity: {
                    chainPrevHash: prevHash,
                    chainHash,
                },
            };
            return [entry, ...prev].slice(0, MAX_AUDIT_ENTRIES);
        });

        // Return a placeholder entry - the actual entry is in state
        return entry!;
    }, []);

    // Append system audit entries for an event
    const appendSystemAuditEntries = useCallback((event: ChangeEvent) => {
        const systemActor = {
            actorType: 'system' as const,
            actorId: 'system',
            actorLabel: 'System',
        };
        const health = countyHealth[event.jurisdictionId];
        const latencyMs = health?.latencyMs || 100;

        const systemActions: Array<{ type: SystemActionType; summary: string; metadata?: Record<string, string | number | boolean> }> = [
            {
                type: 'snapshot_captured',
                summary: `Captured snapshot from ${event.evidence.source.label}`,
                metadata: { fingerprintHash: event.evidence.snapshotAfter.fingerprintHash.slice(0, 10), latencyMs },
            },
            {
                type: 'record_parsed',
                summary: `Parsed record for ${event.evidence.recordAfter.person.displayName}`,
                metadata: { parserVersion: PARSER_VERSION, bookingRef: event.evidence.recordAfter.bookingRef || 'N/A' },
            },
            {
                type: 'diff_computed',
                summary: `Computed diff: ${event.evidence.diff.highlight}`,
                metadata: { changedFieldsCount: event.evidence.diff.changedFields.length },
            },
            {
                type: 'confidence_scored',
                summary: `Confidence scored at ${event.confidence}%`,
                metadata: { confidence: event.confidence, reasonsCount: event.confidenceReasons.length },
            },
            {
                type: 'event_emitted',
                summary: `Event emitted: ${event.eventType.replace(/_/g, ' ')}`,
                metadata: { eventType: event.eventType },
            },
        ];

        // Use batch update to add all entries at once
        setAudit((prev) => {
            const newEntries: AuditEntry[] = [];
            let currentPrev = prev;

            for (const action of systemActions) {
                const auditId = `AUD-${uid()}`;
                const atISO = nowISO();
                const prevHash = currentPrev.length > 0 ? currentPrev[0].integrity.chainHash : undefined;
                const input: AuditEntryInput = {
                    actor: systemActor,
                    action: {
                        actionType: action.type,
                        actionLabel: SYSTEM_ACTION_LABELS[action.type],
                    },
                    jurisdictionId: event.jurisdictionId,
                    eventId: event.eventId,
                    personId: event.personId,
                    summary: action.summary,
                    metadata: action.metadata,
                };
                const chainHash = buildAuditChainHash(
                    prevHash || GENESIS_HASH,
                    { ...input, auditId, atISO }
                );
                const entry: AuditEntry = {
                    ...input,
                    auditId,
                    atISO,
                    integrity: {
                        chainPrevHash: prevHash,
                        chainHash,
                    },
                };
                newEntries.push(entry);
                currentPrev = [entry, ...currentPrev];
            }

            return [...newEntries, ...prev].slice(0, MAX_AUDIT_ENTRIES);
        });
    }, [countyHealth]);

    // Coverage by county (static based on roster)
    const coverageByCounty = DEMO_JURISDICTIONS.map((j) => ({
        jurisdictionId: j.jurisdictionId,
        displayName: j.displayName,
        monitoredCount: getRosterByJurisdiction(j.jurisdictionId).length,
    }));

    // Weighted county selection based on health + roster size
    const selectWeightedCounty = useCallback((): string => {
        const weights: { id: string; weight: number }[] = [];
        DEMO_JURISDICTIONS.forEach((j) => {
            const health = countyHealth[j.jurisdictionId];
            let healthWeight = 1.0;
            if (health?.state === 'degraded') healthWeight = 0.5;
            if (health?.state === 'down') healthWeight = 0.0;
            const rosterSize = getRosterByJurisdiction(j.jurisdictionId).length;
            weights.push({ id: j.jurisdictionId, weight: rosterSize * healthWeight });
        });

        const total = weights.reduce((sum, w) => sum + w.weight, 0);
        if (total === 0) return DEMO_JURISDICTIONS[0].jurisdictionId;

        let r = Math.random() * total;
        for (const w of weights) {
            r -= w.weight;
            if (r <= 0) return w.id;
        }
        return weights[weights.length - 1].id;
    }, [countyHealth]);

    // Compute confidence based on deterministic factors
    const computeConfidence = useCallback((
        person: { displayName: string; dobYear: number },
        bookingRef: string,
        health: CountyHealth
    ): { confidence: number; reasons: string[] } => {
        let score = 0;
        const reasons: string[] = [];

        // +35 bookingRef present and stable
        if (bookingRef) {
            score += 35;
            reasons.push('Booking reference matched');
        }

        // +25 displayName match
        if (person.displayName) {
            score += 25;
            reasons.push('Full name matched');
        }

        // +15 dobYear match
        if (person.dobYear) {
            score += 15;
            reasons.push('Year of birth matched');
        }

        // Health penalties
        if (health.state === 'degraded') {
            score -= 20;
            reasons.push('Source degraded - reduced confidence');
        } else if (health.state === 'down') {
            score -= 40;
            reasons.push('Source down - significant uncertainty');
        }

        // Add some variance
        score += randInt(-5, 10);

        return {
            confidence: Math.max(0, Math.min(100, score)),
            reasons: reasons.slice(0, 3),
        };
    }, []);

    // Generate a ChangeEvent with full evidence bundle
    const generateEvent = useCallback((): ChangeEvent | null => {
        const jurisdictionId = selectWeightedCounty();
        const jurisdiction = JURISDICTION_MAP[jurisdictionId];
        if (!jurisdiction) return null;

        const person = getRandomPersonFromJurisdiction(jurisdictionId);
        if (!person) return null;

        const health = countyHealth[jurisdictionId];
        const now = nowISO();
        const bookingRef = `BK-${jurisdictionId.slice(1)}-${randInt(10000, 99999)}`;

        // Determine event type
        const eventTypes: ChangeEvent['eventType'][] = [
            'booking_created', 'booking_created', 'booking_created', // Weighted more
            'charge_updated',
            'custody_status_changed',
            'release_detected',
        ];
        const eventType = pick(eventTypes);

        // Create source reference
        const source: SourceRef = {
            sourceId: `SRC-${jurisdictionId}`,
            jurisdictionId,
            label: `${jurisdiction.displayName} Sheriff - Inmate Roster`,
            sourceType: 'html',
            canonicalUrl: `https://jail.${jurisdiction.displayName.toLowerCase().replace(/\s/g, '')}.gov/roster`,
        };

        // Create snapshots
        const snapshotBeforeId = `SNAP-${uid()}`;
        const snapshotAfterId = `SNAP-${uid()}`;

        const snapshotBefore: Snapshot = {
            snapshotId: snapshotBeforeId,
            source,
            capturedAtISO: new Date(Date.now() - randInt(60000, 300000)).toISOString(),
            contentType: 'text/html',
            fingerprintHash: fakeHash(),
            rawPreview: eventType === 'booking_created'
                ? `| Booking # | Name            | DOB  | Status     |\n|-----------|-----------------|------|------------|\n| (empty)   |                 |      |            |`
                : `| Booking # | Name            | DOB  | Status     |\n|-----------|-----------------|------|------------|\n| ${bookingRef} | ${person.displayName} | ${person.dobYear} | In Custody |`,
            parserVersion: PARSER_VERSION,
        };

        // Charges based on event type. When the roster entry is a real record
        // and carries its actual topCharge, prefer that so the UI shows the
        // real charge text from the database.
        const realCharge = (person as { topCharge?: string }).topCharge;
        const chargesBefore = eventType === 'booking_created' ? [] : pick(CHARGE_POOLS.booking_created);
        const chargesAfter = realCharge
            ? [realCharge]
            : eventType === 'charge_updated'
                ? [...chargesBefore, ...pick(CHARGE_POOLS.charge_updated)]
                : eventType === 'booking_created'
                    ? pick(CHARGE_POOLS.booking_created)
                    : chargesBefore;

        // Custody status changes
        const custodyBefore: ParsedRecord['custodyStatus'] = eventType === 'booking_created' ? 'unknown' : 'in_custody';
        const custodyAfter: ParsedRecord['custodyStatus'] = eventType === 'release_detected' ? 'released' : 'in_custody';

        const snapshotAfter: Snapshot = {
            snapshotId: snapshotAfterId,
            source,
            capturedAtISO: now,
            contentType: 'text/html',
            fingerprintHash: fakeHash(),
            rawPreview: eventType === 'release_detected'
                ? `| Booking # | Name            | DOB  | Status   |\n|-----------|-----------------|------|----------|\n| ${bookingRef} | ${person.displayName} | ${person.dobYear} | Released |`
                : `| Booking # | Name            | DOB  | Status     |\n|-----------|-----------------|------|------------|\n| ${bookingRef} | ${person.displayName} | ${person.dobYear} | In Custody |`,
            parserVersion: PARSER_VERSION,
        };

        // Create parsed records
        const { confidence, reasons } = computeConfidence(person, bookingRef, health);

        // If the selected roster entry is a real record (has a real mugshot),
        // propagate the mugshot URL to the parsed records so the UI can show it.
        const personWithMugshot = {
            personId: person.personId,
            displayName: person.displayName,
            dobYear: person.dobYear,
            ...(person.mugshotUrl ? { mugshotUrl: person.mugshotUrl } : {}),
        };

        const recordBefore: ParsedRecord = {
            recordId: `REC-${uid()}`,
            snapshotId: snapshotBeforeId,
            jurisdictionId,
            observedAtISO: snapshotBefore.capturedAtISO,
            bookingRef: eventType === 'booking_created' ? '' : bookingRef,
            person: personWithMugshot,
            charges: chargesBefore,
            custodyStatus: custodyBefore,
            match: { matchConfidence: confidence, matchReasons: reasons },
        };

        const recordAfter: ParsedRecord = {
            recordId: `REC-${uid()}`,
            snapshotId: snapshotAfterId,
            jurisdictionId,
            observedAtISO: now,
            bookingRef,
            person: personWithMugshot,
            charges: chargesAfter,
            custodyStatus: custodyAfter,
            match: { matchConfidence: confidence, matchReasons: reasons },
        };

        // Create diff
        const changedFields: Diff['changedFields'] = [];
        let highlight = '';

        if (eventType === 'booking_created') {
            highlight = `New booking detected: ${bookingRef}`;
            changedFields.push({ field: 'bookingRef', before: '(none)', after: bookingRef });
            changedFields.push({ field: 'charges', before: '(none)', after: chargesAfter.join(', ') });
        } else if (eventType === 'charge_updated') {
            highlight = `Charges updated for ${bookingRef}`;
            changedFields.push({ field: 'charges', before: chargesBefore.join(', '), after: chargesAfter.join(', ') });
        } else if (eventType === 'custody_status_changed') {
            highlight = `Custody status changed for ${bookingRef}`;
            changedFields.push({ field: 'custodyStatus', before: 'in_custody', after: 'in_custody' });
        } else if (eventType === 'release_detected') {
            highlight = `Release detected for ${bookingRef}`;
            changedFields.push({ field: 'custodyStatus', before: 'in_custody', after: 'released' });
        }

        const diff: Diff = {
            diffId: `DIFF-${uid()}`,
            jurisdictionId,
            beforeSnapshotId: snapshotBeforeId,
            afterSnapshotId: snapshotAfterId,
            highlight,
            changedFields,
        };

        const event: ChangeEvent = {
            eventId: `EVT-${uid()}`,
            createdAtISO: now,
            jurisdictionId,
            eventType,
            personId: person.personId,
            confidence,
            confidenceReasons: reasons,
            evidence: {
                source,
                snapshotBefore,
                snapshotAfter,
                recordBefore,
                recordAfter,
                diff,
            },
            status: 'new',
        };

        return event;
    }, [selectWeightedCounty, countyHealth, computeConfidence]);

    // Emit event tick
    const tick = useCallback(() => {
        const event = generateEvent();
        if (event) {
            setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
            setActivePulse({ jurisdictionId: event.jurisdictionId, atISO: event.createdAtISO });

            // Update health - successful scan
            setCountyHealth((prev) => ({
                ...prev,
                [event.jurisdictionId]: {
                    ...prev[event.jurisdictionId],
                    lastSuccessfulScanAtISO: event.createdAtISO,
                    lastAttemptAtISO: event.createdAtISO,
                    latencyMs: randInt(50, 150),
                },
            }));

            // Auto-log system audit entries
            appendSystemAuditEntries(event);
        }
    }, [generateEvent, appendSystemAuditEntries]);

    // Health drift - randomly degrade/heal counties
    const healthDrift = useCallback(() => {
        const jurisdictionId = pick(DEMO_JURISDICTIONS).jurisdictionId;
        const currentHealth = countyHealth[jurisdictionId];

        if (currentHealth.state === 'healthy') {
            // Small chance to degrade
            if (Math.random() < 0.3) {
                const newState = Math.random() < 0.7 ? 'degraded' : 'down';
                setCountyHealth((prev) => ({
                    ...prev,
                    [jurisdictionId]: {
                        ...prev[jurisdictionId],
                        state: newState as 'healthy' | 'degraded' | 'down',
                        latencyMs: newState === 'degraded' ? randInt(500, 1500) : randInt(2000, 5000),
                        lastAttemptAtISO: nowISO(),
                    },
                }));

                // Self-heal after delay
                setTimeout(() => {
                    setCountyHealth((prev) => ({
                        ...prev,
                        [jurisdictionId]: {
                            ...prev[jurisdictionId],
                            state: 'healthy',
                            latencyMs: randInt(80, 200),
                            lastSuccessfulScanAtISO: nowISO(),
                        },
                    }));
                }, randInt(10000, 25000));
            }
        }
    }, [countyHealth]);

    // Start simulator
    const start = useCallback(() => {
        if (isOn) return;
        setIsOn(true);

        // Burst-seed 5 events immediately so the UI isn't empty on arrival.
        // Spread them across 400ms so the feed renders with realistic staggering.
        for (let i = 0; i < 5; i++) {
            window.setTimeout(() => tick(), i * 80);
        }

        // Event emission interval (3.5-6s randomised)
        const scheduleNext = () => {
            intervalRef.current = window.setTimeout(() => {
                tick();
                scheduleNext();
            }, randInt(3500, 6000));
        };
        scheduleNext();

        // Health drift interval (20-40s)
        const scheduleHealthDrift = () => {
            healthDriftRef.current = window.setTimeout(() => {
                healthDrift();
                scheduleHealthDrift();
            }, randInt(20000, 40000));
        };
        scheduleHealthDrift();
    }, [isOn, tick, healthDrift]);

    // Stop simulator
    const stop = useCallback(() => {
        setIsOn(false);
        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            intervalRef.current = null;
        }
        if (healthDriftRef.current) {
            clearTimeout(healthDriftRef.current);
            healthDriftRef.current = null;
        }
    }, []);

    // Reset simulator
    const reset = useCallback(() => {
        stop();
        setEvents([]);
        setActivePulse(null);
        setAudit([]);  // Clear audit trail on reset
        const now = nowISO();
        const resetHealth: Record<string, CountyHealth> = {};
        DEMO_JURISDICTIONS.forEach((j) => {
            resetHealth[j.jurisdictionId] = {
                jurisdictionId: j.jurisdictionId,
                state: 'healthy',
                lastSuccessfulScanAtISO: now,
                lastAttemptAtISO: now,
                latencyMs: randInt(80, 200),
                parserVersionLabel: `${PARSER_VERSION} (Verified)`,
            };
        });
        setCountyHealth(resetHealth);
    }, [stop]);

    // Manual pulse trigger
    const pulse = useCallback((jurisdictionId: string) => {
        setActivePulse({ jurisdictionId, atISO: nowISO() });
    }, []);

    // Mark event status
    const markStatus = useCallback((eventId: string, status: 'new' | 'reviewed' | 'escalated') => {
        setEvents((prev) =>
            prev.map((e) => (e.eventId === eventId ? { ...e, status } : e))
        );
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearTimeout(intervalRef.current);
            if (healthDriftRef.current) clearTimeout(healthDriftRef.current);
        };
    }, []);

    return {
        isOn,
        events,
        coverageByCounty,
        countyHealth,
        activePulse,
        audit,
        start,
        stop,
        reset,
        pulse,
        markStatus,
        appendAudit,
    };
}

export default useDemoSimulator;
