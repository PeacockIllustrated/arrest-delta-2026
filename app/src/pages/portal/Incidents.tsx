import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardBody, Badge, Button, Input, EmptyState } from '../../components/ui';
import { LocationIcon, ListIcon, PersonIcon } from '../../components/portal/Icons';
import { usePageTitle } from '../../hooks/usePageTitle';
import { usePortalData, type AlertCardModel } from '../../hooks/usePortalData';

// =============================================================================
// TYPES — exported so IncidentDetail.tsx can reuse them
// =============================================================================

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'closed';
export type IncidentType = 'arrest' | 'booking' | 'traffic_violation' | 'warrant' | 'background_flag' | 'other';
type ViewMode = 'list' | 'map' | 'timeline';

interface Incident {
    id: string;
    employee_name: string;
    type: IncidentType;
    severity: IncidentSeverity;
    status: IncidentStatus;
    title: string;
    description: string;
    location: string;
    created_at: string;
}

// =============================================================================
// ADAPTER - Map simulator alerts into incident view-models
// =============================================================================

function severityFromScore(score: number): IncidentSeverity {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
}

function statusFromAlert(status: AlertCardModel['status']): IncidentStatus {
    if (status === 'new') return 'open';
    if (status === 'reviewed') return 'investigating';
    return 'acknowledged';
}

function typeFromCharge(topCharge: string | null): IncidentType {
    const c = (topCharge ?? '').toLowerCase();
    if (c.includes('dui') || c.includes('reckless') || c.includes('traffic')) return 'traffic_violation';
    if (c.includes('warrant')) return 'warrant';
    if (c.includes('assault') || c.includes('battery') || c.includes('theft')) return 'arrest';
    if (c.includes('possession')) return 'background_flag';
    return 'booking';
}

function alertToIncident(alert: AlertCardModel): Incident {
    const type = typeFromCharge(alert.topCharge);
    const severity = severityFromScore(alert.severityScore);
    return {
        id: alert.escalationKey,
        employee_name: alert.subject.subjectName,
        type,
        severity,
        status: statusFromAlert(alert.status),
        title: alert.topCharge ?? 'Incident pending classification',
        description: `${alert.chargeCount} charge${alert.chargeCount === 1 ? '' : 's'} logged at ${alert.jurisdictionLabel}. Confidence ${alert.confidenceScore}%.`,
        location: alert.jurisdictionLabel,
        created_at: alert.createdAt,
    };
}

// =============================================================================
// CONFIG
// =============================================================================

// Copy note: the live incident feed is fully nationwide — it reads jurisdiction
// from the simulator's DEMO_JURISDICTIONS list, which spans 14 states.
const severityConfig: Record<IncidentSeverity, { badge: 'danger' | 'warning' | 'info' | 'default'; color: string }> = {
    critical: { badge: 'danger', color: 'var(--danger)' },
    high: { badge: 'warning', color: 'var(--warning)' },
    medium: { badge: 'info', color: 'var(--info)' },
    low: { badge: 'default', color: 'var(--text-muted)' },
};

const statusConfig: Record<IncidentStatus, { badge: 'danger' | 'warning' | 'info' | 'success' | 'default'; label: string }> = {
    open: { badge: 'danger', label: 'Open' },
    acknowledged: { badge: 'warning', label: 'Acknowledged' },
    investigating: { badge: 'info', label: 'Investigating' },
    resolved: { badge: 'success', label: 'Resolved' },
    closed: { badge: 'default', label: 'Closed' },
};

const typeLabels: Record<IncidentType, string> = {
    arrest: 'Arrest',
    booking: 'Booking',
    traffic_violation: 'Traffic Violation',
    warrant: 'Warrant',
    background_flag: 'Background Flag',
    other: 'Other',
};

// =============================================================================
// COMPONENT
// =============================================================================

const Incidents: React.FC = () => {
    usePageTitle('Incidents');
    const navigate = useNavigate();
    const portal = usePortalData();
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
    const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | 'all'>('all');

    const incidents = useMemo(() => portal.alerts.map(alertToIncident), [portal.alerts]);

    const filtered = useMemo(() => {
        return incidents.filter((inc) => {
            if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
            if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
            if (query) {
                const q = query.toLowerCase();
                const hay = [inc.employee_name, inc.title, inc.location].join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [incidents, statusFilter, severityFilter, query]);

    const locationTallies = useMemo(() => {
        const map = new Map<string, number>();
        filtered.forEach((i) => map.set(i.location, (map.get(i.location) ?? 0) + 1));
        return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    }, [filtered]);

    return (
        <div>
            <PageHeader
                title="Incidents"
                description="Track and manage arrest and compliance incidents across your workforce"
                actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Badge variant={portal.isOn ? 'success' : 'default'} size="sm">
                            {portal.isOn ? 'Live' : 'Idle'} • {incidents.length} in feed
                        </Badge>
                        <Button variant="secondary" size="sm">Export</Button>
                        <Button variant="primary" size="sm" leftIcon={<span>+</span>}>Report Incident</Button>
                    </div>
                }
            />

            {/* View Toggle & Filters */}
            <Card style={{ marginBottom: '24px' }}>
                <CardBody>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '6px' }}>
                            {(['list', 'map', 'timeline'] as ViewMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    style={{
                                        padding: '8px 16px',
                                        background: viewMode === mode ? 'var(--accent)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: viewMode === mode ? 'white' : 'var(--text-muted)',
                                        fontFamily: 'var(--font-body, inherit)',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {mode === 'list' ? 'List' : mode === 'map' ? 'Map' : 'Timeline'}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '600px' }}>
                            <Input
                                placeholder="Search incidents..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                fullWidth
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | 'all')}
                                style={{ padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                            >
                                <option value="all">All Statuses</option>
                                <option value="open">Open</option>
                                <option value="acknowledged">Acknowledged</option>
                                <option value="investigating">Investigating</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                            </select>
                            <select
                                value={severityFilter}
                                onChange={(e) => setSeverityFilter(e.target.value as IncidentSeverity | 'all')}
                                style={{ padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                            >
                                <option value="all">All Severities</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* List view */}
            {viewMode === 'list' && (
                <Card>
                    <CardBody cardPadding="0">
                        {filtered.length === 0 ? (
                            <EmptyState
                                icon={<ListIcon size={32} />}
                                title={portal.isOn ? 'Warming up…' : 'No incidents'}
                                description={portal.isOn ? 'Live feed is seeding — incidents will appear shortly.' : 'No incidents match the current filters.'}
                            />
                        ) : (
                            <div>
                                {filtered.map((incident, index) => (
                                    <div
                                        key={incident.id}
                                        onClick={() => navigate(`/portal/incidents/${incident.id}`)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '16px',
                                            padding: '16px 20px',
                                            borderBottom: index < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                            cursor: 'pointer',
                                            transition: 'background 0.1s ease',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sidebar-item-hover)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div style={{ width: '4px', height: '60px', borderRadius: '2px', background: severityConfig[incident.severity].color, flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{incident.title}</span>
                                                <Badge size="sm" variant={severityConfig[incident.severity].badge}>{incident.severity}</Badge>
                                                <Badge size="sm" variant={statusConfig[incident.status].badge}>{statusConfig[incident.status].label}</Badge>
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                {incident.description}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <PersonIcon size={12} /> {incident.employee_name}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <LocationIcon size={12} /> {incident.location}
                                                </span>
                                                <span>{typeLabels[incident.type]}</span>
                                                <span>{new Date(incident.created_at).toLocaleString('en-GB')}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                            <Button size="sm" variant="ghost">View</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}

            {/* Map view - lightweight heatmap by jurisdiction */}
            {viewMode === 'map' && (
                <Card>
                    <CardBody>
                        <div style={{ padding: '12px 0' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                                Incidents by jurisdiction · last {incidents.length} events
                            </div>
                            {locationTallies.length === 0 ? (
                                <EmptyState title="No geographic data yet" description="Waiting for incoming incidents." />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {locationTallies.map(([location, count]) => {
                                        const max = locationTallies[0][1];
                                        const pct = Math.max(10, Math.round((count / max) * 100));
                                        return (
                                            <div key={location} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 40px', gap: '12px', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{location}</div>
                                                <div style={{ height: '10px', background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.4s ease' }} />
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'right' }}>{count}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Timeline view */}
            {viewMode === 'timeline' && (
                <Card>
                    <CardBody>
                        {filtered.length === 0 ? (
                            <EmptyState title={portal.isOn ? 'Warming up…' : 'No incidents'} description="Waiting for live events." />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {filtered.slice(0, 20).map((incident, index) => (
                                    <div key={incident.id} style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px' }}>
                                            <div style={{
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                background: severityConfig[incident.severity].color,
                                                border: '2px solid var(--bg-base)',
                                                zIndex: 1,
                                            }} />
                                            {index < filtered.length - 1 && (
                                                <div style={{ width: '2px', flex: 1, background: 'var(--border-default)', minHeight: '40px' }} />
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                flex: 1,
                                                padding: '12px 16px',
                                                marginBottom: '16px',
                                                background: 'var(--bg-elevated)',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => navigate(`/portal/incidents/${incident.id}`)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{incident.title}</span>
                                                <Badge size="sm" variant={statusConfig[incident.status].badge}>{statusConfig[incident.status].label}</Badge>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {incident.employee_name} • {incident.location} • {new Date(incident.created_at).toLocaleString('en-GB')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default Incidents;
