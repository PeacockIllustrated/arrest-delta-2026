import React, { useState } from 'react';
import { PageHeader, Card, CardHeader, CardBody, Badge } from '../../components/ui';
import DeepMapViz from '../../components/visuals/DeepMapViz';
import { usePageTitle } from '../../hooks/usePageTitle';
import { usePortalData, type AlertCardModel } from '../../hooks/usePortalData';
import { JURISDICTION_MAP } from '../../lib/demo/demoJurisdictions';

// =============================================================================
// DASHBOARD - "Pulse" Home for Uber Demo
// =============================================================================

// Confidence badge variant
function getConfidenceBadgeVariant(confidence: number): 'success' | 'warning' | 'danger' | 'default' {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'danger';
}

// Format relative time
function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

const Dashboard: React.FC = () => {
    usePageTitle('Pulse Dashboard');

    const portal = usePortalData();
    const [selectedAlert, setSelectedAlert] = useState<AlertCardModel | null>(null);

    // KPI calculations
    const totalMonitored = portal.coverageByCounty.reduce((sum, c) => sum + c.monitoredCount, 0);
    const alertCount = portal.alerts.length;
    const confidenceBands = {
        high: portal.alerts.filter((e) => e.confidenceScore >= 80).length,
        medium: portal.alerts.filter((e) => e.confidenceScore >= 60 && e.confidenceScore < 80).length,
        low: portal.alerts.filter((e) => e.confidenceScore < 60).length,
    };
    const topCoverageCounties = [...portal.coverageByCounty]
        .sort((a, b) => b.monitoredCount - a.monitoredCount)
        .slice(0, 3);

    // Handle alert click
    const handleAlertClick = (alert: AlertCardModel) => {
        setSelectedAlert(alert);
        portal.pulse(alert.jurisdictionId);

        // Log human "viewed" action to audit trail
        portal.appendAudit({
            actor: { actorType: 'human', actorId: 'demo_user', actorLabel: 'Safety Ops' },
            action: { actionType: 'viewed', actionLabel: 'Viewed' },
            jurisdictionId: alert.jurisdictionId,
            eventId: alert.escalationKey,
            summary: 'Viewed alert evidence bundle',
            metadata: { location: 'dashboard' },
        });
    };

    // Handle status change with audit logging
    const handleStatusChange = (alert: AlertCardModel, newStatus: 'reviewed' | 'escalated') => {
        const oldStatus = alert.status;
        portal.markStatus(alert.escalationKey, newStatus);

        // Log human action to audit trail
        portal.appendAudit({
            actor: { actorType: 'human', actorId: 'demo_user', actorLabel: 'Safety Ops' },
            action: {
                actionType: newStatus,
                actionLabel: newStatus === 'reviewed' ? 'Marked reviewed' : 'Escalated',
            },
            jurisdictionId: alert.jurisdictionId,
            eventId: alert.escalationKey,
            summary: newStatus === 'reviewed' ? 'Marked alert as reviewed' : 'Escalated alert to legal',
            metadata: { fromStatus: oldStatus, toStatus: newStatus },
        });
    };

    // Get county name
    const getCountyName = (jurisdictionId: string): string => {
        return JURISDICTION_MAP[jurisdictionId]?.displayName || jurisdictionId;
    };

    return (
        <div>
            <PageHeader
                title="Pulse Dashboard"
                description="Real-time monitoring activity and change intelligence"
            />

            {/* Portal Control Bar */}
            <Card style={{ marginBottom: '16px' }}>
                <CardBody>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={() => (portal.isOn ? portal.stop() : portal.start())}
                                    style={{
                                        padding: '8px 16px',
                                        background: portal.isOn ? 'var(--danger)' : 'var(--accent)',
                                        border: 'none',
                                        color: 'white',
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        cursor: 'pointer',
                                        borderRadius: '2px',
                                    }}
                                >
                                    {portal.isOn ? 'Stop' : 'Start'}
                                </button>
                                <button
                                    onClick={portal.reset}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'transparent',
                                        border: '1px solid var(--border-default)',
                                        color: 'var(--text-muted)',
                                        fontWeight: 500,
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        borderRadius: '2px',
                                    }}
                                >
                                    Reset
                                </button>
                            </div>
                            {portal.isOn && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div
                                        style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: portal.connectionStatus === 'connected' ? 'var(--accent)' :
                                                portal.connectionStatus === 'polling' ? 'var(--warning)' : 'var(--danger)',
                                            animation: 'pulse 1.5s infinite',
                                        }}
                                    />
                                    <span style={{ fontSize: '0.7rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {portal.connectionStatus === 'connected' ? 'Live' :
                                            portal.connectionStatus === 'polling' ? 'Polling' : 'Disconnected'}
                                    </span>
                                </div>
                            )}
                        </div>
                        {portal.alerts.length > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Last alert: {formatRelativeTime(portal.alerts[0].createdAt)}
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* KPI Cards Row */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                    marginBottom: '24px',
                }}
                className="kpi-grid"
            >
                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Active Monitoring
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {totalMonitored}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            individuals across {portal.coverageByCounty.length} counties
                        </div>
                    </CardBody>
                </Card>

                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Alerts Generated
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: alertCount > 0 ? 'var(--accent)' : 'var(--text-primary)' }}>
                            {alertCount}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            this session
                        </div>
                    </CardBody>
                </Card>

                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Confidence Bands
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                            <div>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{confidenceBands.high}</span>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '4px' }}>80+</span>
                            </div>
                            <div>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{confidenceBands.medium}</span>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '4px' }}>60-79</span>
                            </div>
                            <div>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{confidenceBands.low}</span>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: '4px' }}>&lt;60</span>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            Top Coverage
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {topCoverageCounties.map((c) => (
                                <div key={c.jurisdictionId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{c.displayName.replace(' County', '')}</span>
                                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{c.monitoredCount}</span>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Map + Alerts Feed Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 400px',
                    gap: '24px',
                }}
                className="main-grid"
            >
                {/* Map Section */}
                <Card style={{ overflow: 'hidden', padding: 0 }}>
                    <DeepMapViz
                        isScanning={portal.isOn}
                        height="28rem"
                        onStateSelect={() => { }}
                        onCountySelect={() => { }}
                    />
                </Card>

                {/* Alerts Feed */}
                <Card>
                    <CardHeader actions={<Badge variant="accent" dot>Live</Badge>}>
                        Alerts Feed
                    </CardHeader>
                    <CardBody cardPadding="0">
                        <div style={{ maxHeight: '26rem', overflowY: 'auto' }}>
                            {portal.alerts.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <p style={{ margin: 0, fontSize: '0.8rem' }}>No alerts yet</p>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '0.7rem' }}>Start monitoring to receive alerts</p>
                                </div>
                            ) : (
                                portal.alerts.slice(0, 20).map((alert: AlertCardModel) => (
                                    <div
                                        key={alert.escalationKey}
                                        onClick={() => handleAlertClick(alert)}
                                        style={{
                                            padding: '12px 16px',
                                            borderBottom: '1px solid var(--border-subtle)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            background: selectedAlert?.escalationKey === alert.escalationKey ? 'var(--accent-muted)' : 'transparent',
                                            display: 'flex',
                                            gap: '12px',
                                            alignItems: 'flex-start',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedAlert?.escalationKey !== alert.escalationKey) {
                                                e.currentTarget.style.background = 'var(--sidebar-item-hover)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedAlert?.escalationKey !== alert.escalationKey) {
                                                e.currentTarget.style.background = 'transparent';
                                            }
                                        }}
                                    >
                                        {/* Mugshot thumbnail (real bucket URL when the roster entry is a real record) */}
                                        {alert.subject.mugshotUrl ? (
                                            <img
                                                src={alert.subject.mugshotUrl}
                                                alt=""
                                                referrerPolicy="no-referrer"
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '4px',
                                                    objectFit: 'cover',
                                                    background: 'var(--bg-elevated)',
                                                    flexShrink: 0,
                                                }}
                                            />
                                        ) : (
                                            <div
                                                aria-hidden
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '4px',
                                                    background: 'var(--bg-elevated)',
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'var(--text-muted)',
                                                    fontSize: '0.65rem',
                                                    letterSpacing: '0.05em',
                                                }}
                                            >
                                                N/A
                                            </div>
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                            <div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                                    {alert.subject.subjectName}
                                                </span>
                                                {alert.subject.dobYear && (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: '8px' }}>
                                                        ({alert.subject.dobYear})
                                                    </span>
                                                )}
                                            </div>
                                            <Badge variant={getConfidenceBadgeVariant(alert.confidenceScore)} size="sm">
                                                {alert.confidenceScore}%
                                            </Badge>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {alert.topCharge && (
                                                    <Badge variant="default" size="sm">
                                                        {alert.topCharge}
                                                    </Badge>
                                                )}
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                    {getCountyName(alert.jurisdictionId).replace(' County', '')}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {/* Status action buttons */}
                                                {alert.status === 'new' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStatusChange(alert, 'reviewed');
                                                        }}
                                                        style={{
                                                            padding: '2px 6px',
                                                            fontSize: '0.55rem',
                                                            fontWeight: 500,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.03em',
                                                            background: 'var(--success-muted)',
                                                            color: 'var(--success)',
                                                            border: '1px solid var(--success)',
                                                            cursor: 'pointer',
                                                            borderRadius: '2px',
                                                        }}
                                                    >
                                                        Review
                                                    </button>
                                                )}
                                                {(alert.status === 'new' || alert.status === 'reviewed') && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStatusChange(alert, 'escalated');
                                                        }}
                                                        style={{
                                                            padding: '2px 6px',
                                                            fontSize: '0.55rem',
                                                            fontWeight: 500,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.03em',
                                                            background: 'var(--danger-muted)',
                                                            color: 'var(--danger)',
                                                            cursor: 'pointer',
                                                            borderRadius: '2px',
                                                        }}
                                                    >
                                                        Escalate
                                                    </button>
                                                )}
                                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                                    {formatRelativeTime(alert.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Alert Details Panel (shown when alert selected) */}
            {selectedAlert && (
                <Card style={{ marginTop: '24px' }}>
                    <CardHeader
                        actions={
                            <button
                                onClick={() => setSelectedAlert(null)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                }}
                            >
                                Close
                            </button>
                        }
                    >
                        Alert Summary
                    </CardHeader>
                    <CardBody>
                        <div style={{ display: 'grid', gridTemplateColumns: selectedAlert.subject.mugshotUrl ? 'auto 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '24px' }}>
                            {/* Mugshot (if available) */}
                            {selectedAlert.subject.mugshotUrl && (
                                <div style={{ width: '120px' }}>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        Mugshot
                                    </div>
                                    <div style={{
                                        width: '120px',
                                        height: '144px',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                        border: '1px solid var(--border-subtle)',
                                        background: 'var(--bg-surface)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <img
                                            src={selectedAlert.subject.mugshotUrl}
                                            alt={selectedAlert.subject.subjectName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size: 0.6rem; color: var(--text-muted)">Image Unavailable</span>';
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Subject Info */}
                            <div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    Subject
                                </div>
                                <div style={{
                                    padding: '12px',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '4px',
                                    height: '144px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        {selectedAlert.subject.subjectName}
                                    </div>
                                    {selectedAlert.subject.dobYear && (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                            Birth Year: {selectedAlert.subject.dobYear}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 'auto', opacity: 0.7 }}>
                                        Record ID: {selectedAlert.escalationKey.slice(0, 16)}...
                                    </div>
                                </div>
                            </div>

                            {/* Top Charge */}
                            <div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    Top Charge
                                </div>
                                <div style={{
                                    padding: '12px',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '4px',
                                    height: '144px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--accent)', lineHeight: 1.4 }}>
                                        {selectedAlert.topCharge || 'No charges listed'}
                                    </div>
                                    {selectedAlert.chargeCount > 1 && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                            +{selectedAlert.chargeCount - 1} additional charge{selectedAlert.chargeCount > 2 ? 's' : ''}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Scores */}
                            <div>
                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    Status & Scores
                                </div>
                                <div style={{
                                    padding: '12px',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '4px',
                                    height: '144px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Severity</span>
                                        <Badge variant={getConfidenceBadgeVariant(selectedAlert.severityScore)} size="sm">
                                            {selectedAlert.severityScore}%
                                        </Badge>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidence</span>
                                        <Badge variant={getConfidenceBadgeVariant(selectedAlert.confidenceScore)} size="sm">
                                            {selectedAlert.confidenceScore}%
                                        </Badge>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed var(--border-subtle)' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</span>
                                        <Badge variant={selectedAlert.status === 'new' ? 'warning' : 'success'} size="sm">
                                            {selectedAlert.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Source Info */}
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        {getCountyName(selectedAlert.jurisdictionId)} • Run: {selectedAlert.runId.slice(0, 12)}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    Reported: {formatRelativeTime(selectedAlert.createdAt)}
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @media (max-width: 1200px) {
                    .kpi-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    .main-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
                @media (max-width: 600px) {
                    .kpi-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
