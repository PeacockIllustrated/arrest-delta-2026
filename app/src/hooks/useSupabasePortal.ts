// =============================================================================
// SUPABASE PORTAL HOOK - Live data fetching with Realtime + Polling fallback
// =============================================================================
// INVARIANT: Only active when VITE_PORTAL_MODE=live
// INVARIANT: Realtime subscriptions only for INSERT on escalations
// INVARIANT: Scoped to Dashboard route only (mount/unmount lifecycle)
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
    toAlertCardModels,
    type RawEscalationRow,
} from '../lib/adapters/escalationAdapter';
import type {
    AlertCardModel,
    AuditLogEntryModel,
    PipelineRunModel,
    PortalDataState,
    UsePortalDataReturn,
} from './usePortalData';

// =============================================================================
// CONFIGURATION
// =============================================================================

const POLLING_INTERVAL_MS = 25000; // 25 seconds
const INITIAL_FETCH_LIMIT = 50;

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useSupabasePortal(): UsePortalDataReturn {
    // State
    const [alerts, setAlerts] = useState<AlertCardModel[]>([]);
    const [auditEntries, setAuditEntries] = useState<AuditLogEntryModel[]>([]);
    const [pipelineRuns, setPipelineRuns] = useState<PipelineRunModel[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<PortalDataState['connectionStatus']>('disconnected');
    const [activePulse, setActivePulse] = useState<{ jurisdictionId: string; atISO: string } | null>(null);

    // Refs for cleanup
    const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
    const pollingIntervalRef = useRef<number | null>(null);
    const seenEscalationKeys = useRef<Set<string>>(new Set());

    // =============================================================================
    // FETCH FUNCTIONS
    // =============================================================================

    /**
     * Fetch escalations from Supabase. Relies on the Supabase client's own
     * fetch timeout (default 30s) rather than racing a short 10s timer —
     * the old Promise.race kept losing to the HTTP call under Vercel→eu-west-2
     * latency and wiped the feed to empty.
     */
    const fetchEscalations = useCallback(async (): Promise<void> => {
        try {
            const { data, error } = await supabase
                .from('escalations')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(INITIAL_FETCH_LIMIT);

            if (error) {
                console.warn('[useSupabasePortal] escalations fetch error:', error.message);
                return; // Preserve existing alerts on transient error
            }

            if (data && data.length > 0) {
                const rows = data as RawEscalationRow[];
                rows.forEach((row) => seenEscalationKeys.current.add(row.escalation_key));
                setAlerts(toAlertCardModels(rows));
            }
        } catch (err) {
            console.warn('[useSupabasePortal] escalations fetch threw:', err);
        }
    }, []);

    /**
     * Fetch audit logs from Supabase
     */
    const fetchAuditLogs = useCallback(async (): Promise<void> => {
        try {
            const { data, error } = await supabase
                .from('audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('[useSupabasePortal] Failed to fetch audit logs:', error.message);
                return;
            }

            if (data) {
                const entries: AuditLogEntryModel[] = data.map((row: Record<string, unknown>) => ({
                    auditId: String(row.id || ''),
                    runId: String(row.run_id || ''),
                    escalationKey: row.escalation_key ? String(row.escalation_key) : null,
                    eventType: String(row.event_type || ''),
                    createdAt: String(row.created_at || ''),
                    detailsSummary: typeof row.details === 'object'
                        ? JSON.stringify(row.details).slice(0, 100)
                        : String(row.details || ''),
                    actor: 'system',
                }));
                setAuditEntries(entries);
            }
        } catch (err) {
            console.error('[useSupabasePortal] Audit fetch error:', err);
        }
    }, []);

    /**
     * Fetch pipeline runs from Supabase
     * Note: This query is optional - pipeline_runs may not exist or have different schema
     */
    const fetchPipelineRuns = useCallback(async (): Promise<void> => {
        try {
            const { data, error } = await supabase
                .from('pipeline_runs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                // Non-critical error - pipeline_runs table may not exist
                console.warn('[useSupabasePortal] Failed to fetch pipeline runs:', error.message);
                return;
            }

            if (data) {
                const runs: PipelineRunModel[] = data.map((row: Record<string, unknown>) => ({
                    runId: String(row.id || ''),
                    status: (row.status as 'running' | 'completed' | 'failed') || 'running',
                    startedAt: String(row.created_at || row.started_at || ''),
                    finishedAt: row.finished_at ? String(row.finished_at) : null,
                    escalationCount: 0, // Would need aggregation
                    auditEventCount: 0,
                }));
                setPipelineRuns(runs);
            }
        } catch (err) {
            console.warn('[useSupabasePortal] Pipeline runs fetch error:', err);
        }
    }, []);

    /**
     * Refresh all data
     */
    const refreshAlerts = useCallback(async (): Promise<void> => {
        await Promise.all([
            fetchEscalations(),
            fetchAuditLogs(),
            fetchPipelineRuns(),
        ]);
    }, [fetchEscalations, fetchAuditLogs, fetchPipelineRuns]);

    // =============================================================================
    // REALTIME SUBSCRIPTION
    // =============================================================================

    /**
     * Start Realtime subscription for escalations INSERT events
     */
    const startRealtime = useCallback(() => {
        if (realtimeChannelRef.current) {
            console.log('[useSupabasePortal] Realtime already connected');
            return; // Already subscribed
        }

        console.log('[useSupabasePortal] Starting Realtime subscription...');

        // Polling is started separately in start() function

        const channel = supabase
            .channel('escalations-inserts')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'escalations',
                },
                (payload) => {
                    console.log('[useSupabasePortal] Realtime INSERT received:', payload);
                    const newRow = payload.new as RawEscalationRow;

                    // Client-side deduplication by escalation_key
                    if (seenEscalationKeys.current.has(newRow.escalation_key)) {
                        console.log('[useSupabasePortal] Duplicate escalation_key, skipping:', newRow.escalation_key);
                        return;
                    }

                    seenEscalationKeys.current.add(newRow.escalation_key);

                    // Map to AlertCardModel and prepend
                    const models = toAlertCardModels([newRow]);
                    setAlerts((prev) => [...models, ...prev].slice(0, INITIAL_FETCH_LIMIT));

                    // Trigger pulse using county_slug from payload
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const countySlug = (newRow.payload as any)?.county_slug;
                    if (countySlug) {
                        setActivePulse({
                            jurisdictionId: `fl_${countySlug}`,
                            atISO: newRow.created_at,
                        });
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('[useSupabasePortal] Realtime status:', status, err || '');
                if (status === 'SUBSCRIBED') {
                    setConnectionStatus('connected');
                    console.log('[useSupabasePortal] Realtime connected!');
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    console.warn('[useSupabasePortal] Realtime disconnected');
                    setConnectionStatus('polling');
                }
            });

        realtimeChannelRef.current = channel;
    }, []);

    /**
     * Stop Realtime subscription
     */
    const stopRealtime = useCallback(() => {
        if (realtimeChannelRef.current) {
            supabase.removeChannel(realtimeChannelRef.current);
            realtimeChannelRef.current = null;
        }
    }, []);

    // =============================================================================
    // POLLING FALLBACK
    // =============================================================================

    /**
     * Start polling fallback
     */
    const startPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            return; // Already polling
        }

        console.log('[useSupabasePortal] Starting polling fallback');
        setConnectionStatus('polling');

        pollingIntervalRef.current = window.setInterval(() => {
            fetchEscalations();
        }, POLLING_INTERVAL_MS);
    }, [fetchEscalations]);

    /**
     * Stop polling
     */
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    // =============================================================================
    // ACTIONS
    // =============================================================================

    const start = useCallback(() => {
        // RLS policy allows public reads (USING true), so no auth wait needed
        console.log('[useSupabasePortal] Starting data fetch (public RLS, no auth wait)');

        // Initial fetch
        refreshAlerts();
        // Start realtime subscription
        startRealtime();
        // Always start polling as fallback (realtime may not work without auth)
        startPolling();
        setConnectionStatus('polling'); // Start as polling, will upgrade to connected if realtime works
    }, [refreshAlerts, startRealtime, startPolling]);

    const stop = useCallback(() => {
        stopRealtime();
        stopPolling();
        setConnectionStatus('disconnected');
    }, [stopRealtime, stopPolling]);

    const reset = useCallback(() => {
        stop();
        setAlerts([]);
        setAuditEntries([]);
        setPipelineRuns([]);
        setActivePulse(null);
        seenEscalationKeys.current.clear();
    }, [stop]);

    const pulse = useCallback((jurisdictionId: string) => {
        setActivePulse({ jurisdictionId, atISO: new Date().toISOString() });
    }, []);

    const markStatus = useCallback((escalationKey: string, status: 'reviewed' | 'escalated') => {
        // Update local state optimistically
        setAlerts((prev) =>
            prev.map((alert) =>
                alert.escalationKey === escalationKey ? { ...alert, status } : alert
            )
        );
        // Note: In a full implementation, we'd also update Supabase here
    }, []);

    // =============================================================================
    // LIFECYCLE
    // =============================================================================

    useEffect(() => {
        // Auto-start on mount
        start();

        // Cleanup on unmount
        return () => {
            stop();
        };
    }, [start, stop]);

    // =============================================================================
    // RETURN
    // =============================================================================

    return {
        isOn: connectionStatus !== 'disconnected',
        alerts,
        auditEntries,
        pipelineRuns,
        activePulse,
        connectionStatus,

        // Live mode stubs - coverage data not available from Supabase
        coverageByCounty: [],
        countyHealth: {},

        start,
        stop,
        reset,
        pulse,
        markStatus,
        refreshAlerts,
        appendAudit: () => {
            // No-op in live mode - audit is handled by the scraper ingestion
            console.log('[useSupabasePortal] appendAudit is a no-op in live mode');
        },
    };
}

export default useSupabasePortal;
