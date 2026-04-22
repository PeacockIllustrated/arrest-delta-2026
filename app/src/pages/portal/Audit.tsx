import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardHeader, CardBody, Badge, EmptyState } from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useDemoSim } from '../../context/DemoSimContext';
import { usePortalData, isDemoMode } from '../../hooks/usePortalData';
import { JURISDICTION_MAP } from '../../lib/demo/demoJurisdictions';
import type { AuditEntry, AuditActionType } from '../../lib/contracts/pipeline';
import type { AuditLogEntryModel } from '../../hooks/usePortalData';

// Map the action type enum to a human-readable label for the UI.
const ACTION_LABELS: Record<string, string> = {
    snapshot_captured: 'Snapshot captured',
    record_parsed: 'Record parsed',
    diff_computed: 'Diff computed',
    confidence_scored: 'Confidence scored',
    event_emitted: 'Event emitted',
    viewed: 'Viewed',
    reviewed: 'Reviewed',
    escalated: 'Escalated',
};

// Adapter: Supabase `audit_log` rows (flat AuditLogEntryModel) → simulator AuditEntry shape.
// We don't have integrity hashes in the live DB yet; display a truncated run_id/escalation_key
// as a provenance marker so the UI still reads coherently.
function liveToSimShape(entries: AuditLogEntryModel[]): AuditEntry[] {
    return entries.map((e, i) => {
        const actionType = (e.eventType || 'event_emitted') as AuditActionType;
        const prev = i + 1 < entries.length ? entries[i + 1] : undefined;
        return {
            auditId: e.auditId,
            atISO: e.createdAt,
            actor: {
                actorType: e.actor,
                actorId: e.actor === 'human' ? 'operator' : 'system',
                actorLabel: e.actor === 'human' ? 'Operator' : 'System',
            },
            action: {
                actionType,
                actionLabel: ACTION_LABELS[actionType] || actionType,
            },
            jurisdictionId: e.escalationKey || 'unknown',
            eventId: e.escalationKey || undefined,
            summary: e.detailsSummary || `Event: ${actionType}`,
            integrity: {
                chainPrevHash: prev ? prev.auditId.slice(0, 16) : undefined,
                chainHash: e.auditId.slice(0, 16),
            },
        };
    });
}

// =============================================================================
// AUDIT TRAIL - Phase 4 "Black Box" Flight Recorder
// =============================================================================

type ActorFilter = 'all' | 'system' | 'human';

// Format relative time
function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Get actor badge colour
function getActorBadgeVariant(actorType: 'system' | 'human'): 'default' | 'accent' {
    return actorType === 'system' ? 'default' : 'accent';
}

// Get action badge colour
function getActionBadgeColour(actionType: AuditActionType): { bg: string; fg: string } {
    switch (actionType) {
        case 'snapshot_captured':
        case 'record_parsed':
            return { bg: 'var(--info-muted)', fg: 'var(--info)' };
        case 'diff_computed':
        case 'confidence_scored':
            return { bg: 'var(--warning-muted)', fg: 'var(--warning)' };
        case 'event_emitted':
            return { bg: 'var(--accent-muted)', fg: 'var(--accent)' };
        case 'viewed':
            return { bg: 'var(--bg-elevated)', fg: 'var(--text-secondary)' };
        case 'reviewed':
            return { bg: 'var(--success-muted)', fg: 'var(--success)' };
        case 'escalated':
            return { bg: 'var(--danger-muted)', fg: 'var(--danger)' };
        default:
            return { bg: 'var(--bg-elevated)', fg: 'var(--text-muted)' };
    }
}

const Audit: React.FC = () => {
    usePageTitle('Audit trail');
    const navigate = useNavigate();
    const sim = useDemoSim();
    const portal = usePortalData();

    const [actorFilter, setActorFilter] = useState<ActorFilter>('all');
    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

    // Single audit source: simulator in demo mode, Supabase audit_log in live mode.
    const audit: AuditEntry[] = useMemo(() => {
        return isDemoMode() ? sim.audit : liveToSimShape(portal.auditEntries);
    }, [sim.audit, portal.auditEntries]);

    // Filter audit entries
    const filteredAudit = audit.filter((entry) => {
        if (actorFilter !== 'all' && entry.actor.actorType !== actorFilter) return false;
        return true;
    });

    // Calculate KPIs
    const systemCount = audit.filter((e) => e.actor.actorType === 'system').length;
    const humanCount = audit.filter((e) => e.actor.actorType === 'human').length;
    const latestEntry = audit[0];

    // Get county name
    const getCountyName = (jurisdictionId: string): string => {
        return JURISDICTION_MAP[jurisdictionId]?.displayName || jurisdictionId;
    };

    // Handle row click - pulse the county and expand/collapse
    const handleRowClick = (entry: AuditEntry) => {
        sim.pulse(entry.jurisdictionId);
        setExpandedEntryId(expandedEntryId === entry.auditId ? null : entry.auditId);
    };

    // Navigate to Source Evidence with event
    const handleViewEvent = (_eventId: string, jurisdictionId: string) => {
        sim.pulse(jurisdictionId);
        navigate('/portal/database-search');
    };

    // Truncate hash for display
    const truncateHash = (hash: string | undefined): string => {
        if (!hash) return 'GENESIS';
        return hash.slice(0, 10);
    };

    // Empty state
    if (audit.length === 0) {
        return (
            <div>
                <PageHeader
                    title="Audit trail"
                    description="Append-only operational record of system detections and human decisions."
                />
                <Card style={{ marginTop: '24px' }}>
                    <CardBody>
                        <EmptyState
                            icon={
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                                    <rect x="9" y="3" width="6" height="4" rx="1" />
                                    <path d="M9 12l2 2 4-4" />
                                </svg>
                            }
                            title="No audit entries yet"
                            description="Turn Sim Mode on in Dashboard to generate system telemetry."
                            action={{
                                label: 'Go to Dashboard',
                                onClick: () => navigate('/portal/dashboard'),
                            }}
                        />
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Audit trail"
                description="Append-only operational record of system detections and human decisions."
            />

            {/* Filter Bar + KPIs */}
            <Card style={{ marginBottom: '16px' }}>
                <CardBody>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                    }}>
                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <label style={{
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--text-muted)',
                            }}>
                                Actor:
                            </label>
                            <select
                                value={actorFilter}
                                onChange={(e) => setActorFilter(e.target.value as ActorFilter)}
                                style={{
                                    padding: '6px 10px',
                                    background: 'var(--input-bg)',
                                    border: '1px solid var(--input-border)',
                                    borderRadius: '4px',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.8rem',
                                }}
                            >
                                <option value="all">All</option>
                                <option value="system">System</option>
                                <option value="human">Human</option>
                            </select>
                        </div>

                        {/* KPI Chips */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: 'var(--bg-elevated)',
                                borderRadius: '4px',
                            }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    System
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {systemCount}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                background: 'var(--accent-muted)',
                                borderRadius: '4px',
                            }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--accent)', textTransform: 'uppercase' }}>
                                    Human
                                </span>
                                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)' }}>
                                    {humanCount}
                                </span>
                            </div>
                            {latestEntry && (
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-muted)',
                                }}>
                                    Latest: {formatRelativeTime(latestEntry.atISO)}
                                </div>
                            )}
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Immutability Callout */}
            <div style={{
                padding: '10px 16px',
                background: 'var(--info-muted)',
                border: '1px solid var(--info)',
                borderRadius: '4px',
                fontSize: '0.7rem',
                color: 'var(--info)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Entries are append-only. Integrity chain links each record to the previous.
            </div>

            {/* Audit Log Table */}
            <Card>
                <CardHeader>
                    Audit Log ({filteredAudit.length} entries)
                </CardHeader>
                <CardBody cardPadding="0">
                    {/* Table Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '140px 100px 140px 1fr 160px',
                        gap: '12px',
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border-default)',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                    }}>
                        <div>Time</div>
                        <div>Actor</div>
                        <div>Action</div>
                        <div>Summary</div>
                        <div>Integrity</div>
                    </div>

                    {/* Table Rows */}
                    <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                        {filteredAudit.map((entry) => (
                            <div key={entry.auditId}>
                                {/* Main Row */}
                                <div
                                    onClick={() => handleRowClick(entry)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '140px 100px 140px 1fr 160px',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        alignItems: 'center',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s ease',
                                        background: expandedEntryId === entry.auditId ? 'var(--bg-elevated)' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (expandedEntryId !== entry.auditId) {
                                            e.currentTarget.style.background = 'var(--sidebar-item-hover)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (expandedEntryId !== entry.auditId) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    {/* Time */}
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {formatRelativeTime(entry.atISO)}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                            {entry.atISO.slice(11, 19)}
                                        </div>
                                    </div>

                                    {/* Actor */}
                                    <div>
                                        <Badge variant={getActorBadgeVariant(entry.actor.actorType)} size="sm">
                                            {entry.actor.actorLabel}
                                        </Badge>
                                    </div>

                                    {/* Action */}
                                    <div>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '3px 8px',
                                            fontSize: '0.65rem',
                                            fontWeight: 500,
                                            background: getActionBadgeColour(entry.action.actionType).bg,
                                            color: getActionBadgeColour(entry.action.actionType).fg,
                                            borderRadius: '2px',
                                        }}>
                                            {entry.action.actionLabel}
                                        </span>
                                    </div>

                                    {/* Summary */}
                                    <div>
                                        <div style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-primary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {entry.summary}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            {getCountyName(entry.jurisdictionId).replace(' County', '')}
                                        </div>
                                    </div>

                                    {/* Integrity */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div style={{
                                            fontSize: '0.6rem',
                                            fontFamily: 'monospace',
                                            color: 'var(--text-secondary)',
                                        }}>
                                            <span style={{ color: 'var(--text-muted)' }}>hash:</span>{' '}
                                            {truncateHash(entry.integrity.chainHash)}
                                        </div>
                                        <div style={{
                                            fontSize: '0.6rem',
                                            fontFamily: 'monospace',
                                            color: 'var(--text-muted)',
                                        }}>
                                            <span>prev:</span>{' '}
                                            {truncateHash(entry.integrity.chainPrevHash)}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedEntryId === entry.auditId && (
                                    <div style={{
                                        padding: '12px 16px 16px 16px',
                                        background: 'var(--bg-surface)',
                                        borderBottom: '1px solid var(--border-default)',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            gap: '24px',
                                        }}>
                                            {/* Metadata */}
                                            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontSize: '0.65rem',
                                                        textTransform: 'uppercase',
                                                        color: 'var(--text-muted)',
                                                        marginBottom: '8px',
                                                        letterSpacing: '0.05em',
                                                    }}>
                                                        Metadata
                                                    </div>
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'auto 1fr',
                                                        gap: '4px 12px',
                                                        fontSize: '0.75rem',
                                                    }}>
                                                        {Object.entries(entry.metadata).map(([key, value]) => (
                                                            <React.Fragment key={key}>
                                                                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                                    {key}:
                                                                </span>
                                                                <span style={{ color: 'var(--text-primary)' }}>
                                                                    {String(value)}
                                                                </span>
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* View Event Button */}
                                            {entry.eventId && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewEvent(entry.eventId!, entry.jurisdictionId);
                                                    }}
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 500,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.03em',
                                                        background: 'var(--accent)',
                                                        color: 'white',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        borderRadius: '2px',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    View Linked Event
                                                </button>
                                            )}
                                        </div>

                                        {/* Full Hashes */}
                                        <div style={{
                                            marginTop: '12px',
                                            padding: '8px',
                                            background: 'var(--bg-elevated)',
                                            borderRadius: '4px',
                                            fontSize: '0.65rem',
                                            fontFamily: 'monospace',
                                        }}>
                                            <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
                                                Full Chain Hash: <span style={{ color: 'var(--text-secondary)' }}>{entry.integrity.chainHash}</span>
                                            </div>
                                            <div style={{ color: 'var(--text-muted)' }}>
                                                Previous Hash: <span style={{ color: 'var(--text-secondary)' }}>{entry.integrity.chainPrevHash || 'GENESIS'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>

            {/* Responsive styles */}
            <style>{`
                @media (max-width: 1000px) {
                    .audit-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Audit;
