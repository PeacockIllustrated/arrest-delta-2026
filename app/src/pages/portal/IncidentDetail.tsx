import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardHeader, CardBody, Badge, Button } from '../../components/ui';
import { LocationIcon, DocumentIcon, UserIcon, EditIcon, BoltIcon, MessageIcon } from '../../components/portal/Icons';
import type { IncidentSeverity, IncidentStatus, IncidentType } from './Incidents';

// =============================================================================
// TYPES - Ready for Supabase integration
// =============================================================================

interface TimelineEvent {
    id: string;
    type: 'created' | 'status_change' | 'note' | 'escalation' | 'assignment';
    description: string;
    actor: string;
    timestamp: string;
}

interface LinkedEmployee {
    id: string;
    name: string;
    role: string;
}

interface RelatedAlert {
    id: string;
    type: string;
    severity: IncidentSeverity;
    date: string;
}

interface IncidentDetailData {
    id: string;
    employee_id: string;
    employee_name: string;
    type: IncidentType;
    severity: IncidentSeverity;
    status: IncidentStatus;
    title: string;
    description: string;
    location: string;
    coordinates?: { lat: number; lng: number };
    created_at: string;
    updated_at: string;
    timeline: TimelineEvent[];
    linked_employees: LinkedEmployee[];
    related_alerts: RelatedAlert[];
    evidence_count: number;
}

// =============================================================================
// MOCK DATA - Replace with Supabase query
// TODO: Connect to Supabase table `incidents` with joins
// =============================================================================

const mockIncident: IncidentDetailData = {
    id: 'inc-001',
    employee_id: 'emp-001',
    employee_name: 'John Michael Smith',
    type: 'arrest',
    severity: 'critical',
    status: 'open',
    title: 'DUI Arrest - Miami-Dade County',
    description: 'Subject was arrested for driving under the influence during a routine traffic stop on I-95 southbound. Blood alcohol content measured at 0.12%. Vehicle was impounded. Subject released on bond pending court date.',
    location: 'Los Angeles County, CA',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    created_at: '2026-01-01T19:20:00Z',
    updated_at: '2026-01-01T19:20:00Z',
    timeline: [
        { id: 't1', type: 'created', description: 'Incident created from automated arrest scan', actor: 'System', timestamp: '2026-01-01T19:20:00Z' },
        { id: 't2', type: 'note', description: 'Initial review completed. Flagged as critical due to DUI nature.', actor: 'Jane Admin', timestamp: '2026-01-01T19:35:00Z' },
        { id: 't3', type: 'assignment', description: 'Assigned to HR department for review', actor: 'Jane Admin', timestamp: '2026-01-01T19:40:00Z' },
    ],
    linked_employees: [
        { id: 'emp-001', name: 'John Michael Smith', role: 'Driver' },
    ],
    related_alerts: [
        { id: 'alert-001', type: 'Arrest Alert', severity: 'critical', date: '2026-01-01T19:20:00Z' },
        { id: 'alert-002', type: 'Risk Level Change', severity: 'high', date: '2026-01-01T19:25:00Z' },
    ],
    evidence_count: 2,
};

// =============================================================================
// CONFIGURATION
// =============================================================================

const severityConfig: Record<IncidentSeverity, { badge: 'danger' | 'warning' | 'info' | 'default' }> = {
    critical: { badge: 'danger' },
    high: { badge: 'warning' },
    medium: { badge: 'info' },
    low: { badge: 'default' },
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

const TimelineIcons: Record<TimelineEvent['type'], React.ReactNode> = {
    created: <DocumentIcon size={14} />,
    status_change: <EditIcon size={14} />,
    note: <MessageIcon size={14} />,
    escalation: <BoltIcon size={14} />,
    assignment: <UserIcon size={14} />,
};

// =============================================================================
// COMPONENT
// =============================================================================

const IncidentDetail: React.FC = () => {
    useParams<{ id: string }>();
    const navigate = useNavigate();
    const incident = mockIncident;

    return (
        <div>
            <PageHeader
                title={incident.title}
                breadcrumbs={[
                    { label: 'Incidents', href: '/portal/incidents' },
                    { label: incident.title },
                ]}
                actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {incident.status === 'open' && (
                            <Button variant="secondary">Acknowledge</Button>
                        )}
                        <Button variant="secondary">Escalate</Button>
                        <Button variant="primary">
                            {incident.status === 'open' || incident.status === 'acknowledged' ? 'Resolve' : 'Reopen'}
                        </Button>
                    </div>
                }
            />

            {/* Incident Summary */}
            <Card style={{ marginBottom: '24px' }}>
                <CardBody>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Badge variant={severityConfig[incident.severity].badge}>
                                    {incident.severity.toUpperCase()}
                                </Badge>
                                <Badge variant={statusConfig[incident.status].badge}>
                                    {statusConfig[incident.status].label}
                                </Badge>
                                <Badge>{typeLabels[incident.type]}</Badge>
                            </div>
                            <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                {incident.description}
                            </p>
                            <div style={{ display: 'flex', gap: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <LocationIcon size={14} /> {incident.location}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <DocumentIcon size={14} /> {new Date(incident.created_at).toLocaleString('en-GB')}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '32px' }}>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {incident.linked_employees.length}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Linked Employees</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--warning)' }}>
                                    {incident.related_alerts.length}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Related Alerts</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {incident.evidence_count}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evidence Files</div>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Timeline */}
                <Card>
                    <CardHeader>Timeline</CardHeader>
                    <CardBody>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {incident.timeline.map((event, index) => (
                                <div key={event.id} style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30px' }}>
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: 'var(--bg-elevated)',
                                            border: '2px solid var(--border-default)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--accent)',
                                            zIndex: 1,
                                        }}>
                                            {TimelineIcons[event.type]}
                                        </div>
                                        {index < incident.timeline.length - 1 && (
                                            <div style={{
                                                width: '2px',
                                                flex: 1,
                                                background: 'var(--border-default)',
                                                minHeight: '30px',
                                            }} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, paddingBottom: '20px' }}>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>
                                            {event.description}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {event.actor} • {new Date(event.timestamp).toLocaleString('en-GB')}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Linked Employees */}
                    <Card>
                        <CardHeader>Linked Employees</CardHeader>
                        <CardBody>
                            {incident.linked_employees.map((emp) => (
                                <div
                                    key={emp.id}
                                    onClick={() => navigate(`/portal/employees/${emp.id}`)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 12px',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        marginBottom: '8px',
                                    }}
                                >
                                    <span style={{ color: 'var(--accent)' }}><UserIcon size={20} /></span>
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{emp.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.role}</div>
                                    </div>
                                </div>
                            ))}
                        </CardBody>
                    </Card>

                    {/* Related Alerts */}
                    <Card>
                        <CardHeader>Related Alerts</CardHeader>
                        <CardBody>
                            {incident.related_alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 12px',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: '6px',
                                        marginBottom: '8px',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{alert.type}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(alert.date).toLocaleDateString('en-GB')}
                                        </div>
                                    </div>
                                    <Badge variant={severityConfig[alert.severity].badge} size="sm">{alert.severity}</Badge>
                                </div>
                            ))}
                        </CardBody>
                    </Card>

                    {/* Evidence */}
                    <Card>
                        <CardHeader>Evidence & Attachments</CardHeader>
                        <CardBody>
                            <div style={{
                                padding: '24px',
                                background: 'var(--bg-elevated)',
                                borderRadius: '6px',
                                border: '1px dashed var(--border-default)',
                                textAlign: 'center',
                            }}>
                                <span style={{ color: 'var(--accent)' }}><DocumentIcon size={32} /></span>
                                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {incident.evidence_count} files attached
                                </p>
                                <Button variant="ghost" size="sm" style={{ marginTop: '12px' }}>
                                    View All
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default IncidentDetail;
