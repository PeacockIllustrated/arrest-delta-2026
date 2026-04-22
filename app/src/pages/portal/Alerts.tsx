import React, { useMemo, useState } from 'react';
import { PageHeader, Card, CardBody, Badge, Button, Input, EmptyState } from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';
import { usePortalData, type AlertCardModel } from '../../hooks/usePortalData';

type SeverityBand = 'critical' | 'high' | 'medium' | 'low';
type StatusFilter = AlertCardModel['status'] | 'all';

function bandFromScore(score: number): SeverityBand {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
}

const severityConfig: Record<SeverityBand, { color: string; badge: 'danger' | 'warning' | 'info' | 'default'; label: string }> = {
    critical: { color: 'var(--danger)', badge: 'danger', label: 'Critical' },
    high: { color: 'var(--warning)', badge: 'warning', label: 'High' },
    medium: { color: 'var(--info)', badge: 'info', label: 'Medium' },
    low: { color: 'var(--text-muted)', badge: 'default', label: 'Low' },
};

const statusBadge: Record<AlertCardModel['status'], 'danger' | 'warning' | 'success' | 'default'> = {
    new: 'danger',
    reviewed: 'warning',
    escalated: 'success',
};

function formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
}

const Alerts: React.FC = () => {
    usePageTitle('Alerts');
    const portal = usePortalData();

    const [severityFilter, setSeverityFilter] = useState<SeverityBand | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        return portal.alerts.filter((a) => {
            const band = bandFromScore(a.severityScore);
            if (severityFilter !== 'all' && band !== severityFilter) return false;
            if (statusFilter !== 'all' && a.status !== statusFilter) return false;
            if (query) {
                const q = query.toLowerCase();
                const haystack = [
                    a.subject.subjectName,
                    a.jurisdictionLabel,
                    a.topCharge ?? '',
                ].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [portal.alerts, severityFilter, statusFilter, query]);

    const tallies = useMemo(() => ({
        total: portal.alerts.length,
        new: portal.alerts.filter((a) => a.status === 'new').length,
        critical: portal.alerts.filter((a) => bandFromScore(a.severityScore) === 'critical').length,
    }), [portal.alerts]);

    const connectionLabel = portal.connectionStatus === 'connected'
        ? 'Live stream'
        : portal.connectionStatus === 'polling'
            ? 'Polling'
            : 'Disconnected';

    return (
        <div>
            <PageHeader
                title="Alerts"
                description="Real-time notifications for entities on your watchlists"
                actions={
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Badge variant={portal.isOn ? 'success' : 'default'} size="sm">
                            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'currentColor', marginRight: 6, animation: portal.isOn ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
                            {connectionLabel}
                        </Badge>
                        <Button variant="primary" size="sm">Configure Alerts</Button>
                    </div>
                }
            />

            {/* Tally strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                    { label: 'Total alerts', value: tallies.total, color: 'var(--text-primary)' },
                    { label: 'New', value: tallies.new, color: 'var(--danger)' },
                    { label: 'Critical severity', value: tallies.critical, color: 'var(--warning)' },
                ].map((stat) => (
                    <Card key={stat.label}>
                        <CardBody>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{stat.label}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 600, color: stat.color, marginTop: '4px' }}>{stat.value}</div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: '24px' }}>
                <CardBody>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: '240px' }}>
                            <Input
                                placeholder="Search by name, jurisdiction, charge…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                fullWidth
                            />
                        </div>
                        <select
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value as SeverityBand | 'all')}
                            style={{ padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                        >
                            <option value="all">All severities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                            style={{ padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                        >
                            <option value="all">All statuses</option>
                            <option value="new">New</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="escalated">Escalated</option>
                        </select>
                    </div>
                </CardBody>
            </Card>

            {/* Alert list */}
            <Card>
                <CardBody cardPadding="0">
                    {filtered.length === 0 ? (
                        <EmptyState
                            title={portal.isOn ? 'Warming up…' : 'No alerts'}
                            description={portal.isOn ? 'The live stream is connecting. New alerts will appear in a few seconds.' : 'No alerts match your filters.'}
                        />
                    ) : (
                        <div>
                            {filtered.map((alert, idx) => {
                                const band = bandFromScore(alert.severityScore);
                                const cfg = severityConfig[band];
                                return (
                                    <div
                                        key={alert.escalationKey}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '16px',
                                            padding: '16px 20px',
                                            borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                            transition: 'background 0.1s ease',
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sidebar-item-hover)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => portal.markStatus(alert.escalationKey, 'reviewed')}
                                    >
                                        <div style={{ width: '4px', minHeight: '60px', borderRadius: '2px', background: cfg.color, flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{alert.subject.subjectName}</span>
                                                <Badge size="sm" variant={cfg.badge}>{cfg.label}</Badge>
                                                <Badge size="sm" variant={statusBadge[alert.status]}>{alert.status}</Badge>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Confidence {alert.confidenceScore}%
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                {alert.topCharge ?? 'No charge detail'}{alert.chargeCount > 1 ? ` + ${alert.chargeCount - 1} more` : ''}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                <span>{alert.jurisdictionLabel}</span>
                                                <span>{formatRelative(alert.createdAt)}</span>
                                                {alert.subject.dobYear && <span>DOB {alert.subject.dobYear}</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    portal.markStatus(alert.escalationKey, 'escalated');
                                                }}
                                            >
                                                Escalate
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardBody>
            </Card>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
};

export default Alerts;
