import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader, Card, CardHeader, CardBody, Badge, Button, ComingSoon } from '../../components/ui';
import { EditIcon, SearchIcon, PersonIcon } from '../../components/portal/Icons';
import type { RiskLevel, EmployeeStatus } from './Employees';

// =============================================================================
// TYPES - Ready for Supabase integration
// =============================================================================

interface EmployeeIncident {
    id: string;
    type: string;
    date: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'acknowledged' | 'resolved';
    description: string;
}

interface EmployeeAlert {
    id: string;
    type: string;
    date: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
}

interface EmployeeDetailData {
    id: string;
    name: string;
    role: string;
    department: string;
    location: string;
    status: EmployeeStatus;
    risk_level: RiskLevel;
    email: string;
    phone: string;
    hire_date: string;
    last_check: string;
    license_number?: string;
    license_expiry?: string;
    incidents: EmployeeIncident[];
    alerts: EmployeeAlert[];
}

// =============================================================================
// MOCK DATA - Replace with Supabase query
// TODO: Connect to Supabase tables `employees`, `incidents`, `alerts`
// =============================================================================

const mockEmployee: EmployeeDetailData = {
    id: 'emp-001',
    name: 'John Michael Smith',
    role: 'Driver',
    department: 'Logistics',
    location: 'Los Angeles, CA',
    status: 'active',
    risk_level: 'high',
    email: 'john.smith@company.com',
    phone: '+1 (305) 555-0123',
    hire_date: '2023-06-15',
    last_check: '2026-01-01T19:20:00Z',
    license_number: 'S123-456-78-901',
    license_expiry: '2027-06-15',
    incidents: [
        { id: 'inc-001', type: 'Arrest', date: '2026-01-01', severity: 'high', status: 'open', description: 'Subject arrested in Miami-Dade County for DUI' },
        { id: 'inc-002', type: 'Traffic Violation', date: '2025-12-15', severity: 'medium', status: 'acknowledged', description: 'Speeding violation in Broward County' },
        { id: 'inc-003', type: 'Background Flag', date: '2025-11-01', severity: 'low', status: 'resolved', description: 'Routine background check flagged expired certification' },
    ],
    alerts: [
        { id: 'alert-001', type: 'Arrest Alert', date: '2026-01-01T19:20:00Z', severity: 'critical', message: 'Active arrest record detected' },
        { id: 'alert-002', type: 'Risk Level Change', date: '2026-01-01T18:00:00Z', severity: 'high', message: 'Risk level elevated from medium to high' },
        { id: 'alert-003', type: 'License Expiry', date: '2025-12-01T09:00:00Z', severity: 'medium', message: 'License expires in 6 months' },
    ],
};

// =============================================================================
// CONFIGURATION
// =============================================================================

type Tab = 'overview' | 'incidents' | 'alerts' | 'notes' | 'audit';

const riskConfig: Record<RiskLevel, { badge: 'danger' | 'warning' | 'info' | 'default' }> = {
    critical: { badge: 'danger' },
    high: { badge: 'warning' },
    medium: { badge: 'info' },
    low: { badge: 'default' },
};

const severityConfig: Record<string, { badge: 'danger' | 'warning' | 'info' | 'default' }> = {
    critical: { badge: 'danger' },
    high: { badge: 'warning' },
    medium: { badge: 'info' },
    low: { badge: 'default' },
};

// =============================================================================
// COMPONENT
// =============================================================================

const EmployeeDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const tabs: { id: Tab; label: string }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'incidents', label: 'Incidents' },
        { id: 'alerts', label: 'Alerts' },
        { id: 'notes', label: 'Notes' },
        { id: 'audit', label: 'Audit' },
    ];

    // TODO: Fetch employee by id from Supabase
    const employee = mockEmployee;

    return (
        <div>
            <PageHeader
                title={employee.name}
                breadcrumbs={[
                    { label: 'Employees', href: '/portal/employees' },
                    { label: employee.name },
                ]}
                actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" leftIcon={<SearchIcon size={14} />}>
                            Run Check
                        </Button>
                        <Button variant="primary" leftIcon={<EditIcon size={14} />}>
                            Edit
                        </Button>
                    </div>
                }
            />

            {/* Employee Summary */}
            <Card style={{ marginBottom: '24px' }}>
                <CardBody>
                    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.5rem',
                                }}
                            >
                                <PersonIcon size={24} color="var(--accent)" />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <Badge variant="accent">{employee.role}</Badge>
                                    <Badge variant={riskConfig[employee.risk_level].badge}>
                                        {employee.risk_level.toUpperCase()} RISK
                                    </Badge>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {employee.department} • {employee.location}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '32px' }}>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--danger)' }}>
                                    {employee.incidents.filter(i => i.status === 'open').length}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Open Incidents</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--warning)' }}>
                                    {employee.alerts.length}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Alerts</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {new Date(employee.last_check).toLocaleDateString('en-GB')}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last Check</div>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Tabs */}
            <div
                style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '24px',
                    borderBottom: '1px solid var(--border-default)',
                }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '12px 20px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.id ? 500 : 400,
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <Card>
                        <CardHeader>Personal Details</CardHeader>
                        <CardBody>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</div>
                                    <div style={{ color: 'var(--text-primary)' }}>{employee.email}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Phone</div>
                                    <div style={{ color: 'var(--text-primary)' }}>{employee.phone}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Hire Date</div>
                                    <div style={{ color: 'var(--text-primary)' }}>{employee.hire_date}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>License Number</div>
                                    <div style={{ color: 'var(--text-primary)' }}>{employee.license_number || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>License Expiry</div>
                                    <div style={{ color: 'var(--text-primary)' }}>{employee.license_expiry || 'N/A'}</div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>Recent Incidents</CardHeader>
                        <CardBody>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {employee.incidents.slice(0, 3).map((incident) => (
                                    <div
                                        key={incident.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px 12px',
                                            background: 'var(--bg-elevated)',
                                            borderRadius: '6px',
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{incident.type}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{incident.date}</div>
                                        </div>
                                        <Badge
                                            variant={severityConfig[incident.severity].badge}
                                            size="sm"
                                        >
                                            {incident.severity}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}

            {activeTab === 'incidents' && (
                <Card>
                    <CardHeader>All Incidents</CardHeader>
                    <CardBody>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {employee.incidents.map((incident) => (
                                <div
                                    key={incident.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        padding: '16px',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: '6px',
                                        borderLeft: `3px solid ${incident.status === 'open' ? 'var(--danger)' : incident.status === 'acknowledged' ? 'var(--warning)' : 'var(--success)'}`,
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{incident.type}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{incident.description}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{incident.date}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Badge variant={severityConfig[incident.severity].badge} size="sm">{incident.severity}</Badge>
                                        <Badge variant={incident.status === 'open' ? 'danger' : incident.status === 'acknowledged' ? 'warning' : 'success'} size="sm">{incident.status}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            )}

            {activeTab === 'alerts' && (
                <Card>
                    <CardHeader>All Alerts</CardHeader>
                    <CardBody>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {employee.alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        padding: '16px',
                                        background: 'var(--bg-elevated)',
                                        borderRadius: '6px',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>{alert.type}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{alert.message}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(alert.date).toLocaleString('en-GB')}</div>
                                    </div>
                                    <Badge variant={severityConfig[alert.severity].badge} size="sm">{alert.severity}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            )}

            {(activeTab === 'notes' || activeTab === 'audit') && (
                <ComingSoon
                    title={`${tabs.find((t) => t.id === activeTab)?.label} Coming Soon`}
                    description={`The ${activeTab} feature is currently in development. Employee ID: ${id}`}
                />
            )}
        </div>
    );
};

export default EmployeeDetail;
