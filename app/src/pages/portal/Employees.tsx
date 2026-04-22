import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardBody, Badge, Button, Input, EmptyState } from '../../components/ui';
import { PersonIcon, LocationIcon, ListIcon } from '../../components/portal/Icons';
import { usePageTitle } from '../../hooks/usePageTitle';

// =============================================================================
// TYPES - Ready for Supabase integration
// =============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type EmployeeStatus = 'active' | 'inactive' | 'suspended' | 'terminated';

export interface Employee {
    id: string;
    name: string;
    role: string;
    department: string;
    location: string;
    status: EmployeeStatus;
    risk_level: RiskLevel;
    last_check: string;
    active_alerts: number;
    active_incidents: number;
    created_at: string;
    updated_at: string;
}

// =============================================================================
// MOCK DATA - Replace with Supabase query
// TODO: Connect to Supabase table `employees`
// =============================================================================

const mockEmployees: Employee[] = [
    { id: 'emp-001', name: 'John Michael Smith', role: 'Driver', department: 'Logistics', location: 'Los Angeles, CA', status: 'active', risk_level: 'high', last_check: '2026-01-01T19:20:00Z', active_alerts: 3, active_incidents: 1, created_at: '2025-06-15T10:00:00Z', updated_at: '2026-01-01T19:20:00Z' },
    { id: 'emp-002', name: 'Jane Anne Doe', role: 'Driver', department: 'Logistics', location: 'Houston, TX', status: 'active', risk_level: 'medium', last_check: '2026-01-01T19:05:00Z', active_alerts: 2, active_incidents: 0, created_at: '2025-07-20T14:00:00Z', updated_at: '2026-01-01T19:05:00Z' },
    { id: 'emp-003', name: 'Robert James Wilson', role: 'Warehouse Associate', department: 'Operations', location: 'Chicago, IL', status: 'active', risk_level: 'low', last_check: '2026-01-01T17:30:00Z', active_alerts: 0, active_incidents: 0, created_at: '2025-04-10T09:00:00Z', updated_at: '2026-01-01T17:30:00Z' },
    { id: 'emp-004', name: 'Maria Garcia', role: 'Driver', department: 'Logistics', location: 'Phoenix, AZ', status: 'suspended', risk_level: 'critical', last_check: '2025-12-30T14:00:00Z', active_alerts: 5, active_incidents: 2, created_at: '2025-03-01T11:00:00Z', updated_at: '2025-12-30T14:00:00Z' },
    { id: 'emp-005', name: 'David Chen', role: 'Manager', department: 'Operations', location: 'Seattle, WA', status: 'active', risk_level: 'low', last_check: '2026-01-02T08:00:00Z', active_alerts: 0, active_incidents: 0, created_at: '2024-11-15T10:00:00Z', updated_at: '2026-01-02T08:00:00Z' },
    { id: 'emp-006', name: 'Ashley Thompson', role: 'Driver', department: 'Logistics', location: 'Atlanta, GA', status: 'active', risk_level: 'medium', last_check: '2026-01-02T09:15:00Z', active_alerts: 1, active_incidents: 0, created_at: '2025-08-12T10:00:00Z', updated_at: '2026-01-02T09:15:00Z' },
    { id: 'emp-007', name: 'Marcus Lee', role: 'Dispatcher', department: 'Operations', location: 'New York, NY', status: 'active', risk_level: 'low', last_check: '2026-01-02T07:45:00Z', active_alerts: 0, active_incidents: 0, created_at: '2025-05-03T10:00:00Z', updated_at: '2026-01-02T07:45:00Z' },
    { id: 'emp-008', name: 'Sarah Thompson', role: 'Driver', department: 'Logistics', location: 'Miami, FL', status: 'active', risk_level: 'medium', last_check: '2026-01-02T08:50:00Z', active_alerts: 2, active_incidents: 0, created_at: '2025-09-01T10:00:00Z', updated_at: '2026-01-02T08:50:00Z' },
];

// =============================================================================
// COMPONENT CONFIGURATION
// =============================================================================

const riskConfig: Record<RiskLevel, { color: string; badge: 'danger' | 'warning' | 'info' | 'default' }> = {
    critical: { color: 'var(--danger)', badge: 'danger' },
    high: { color: 'var(--warning)', badge: 'warning' },
    medium: { color: 'var(--info)', badge: 'info' },
    low: { color: 'var(--text-muted)', badge: 'default' },
};

const statusConfig: Record<EmployeeStatus, { label: string; badge: 'success' | 'default' | 'warning' | 'danger' }> = {
    active: { label: 'Active', badge: 'success' },
    inactive: { label: 'Inactive', badge: 'default' },
    suspended: { label: 'Suspended', badge: 'warning' },
    terminated: { label: 'Terminated', badge: 'danger' },
};

// =============================================================================
// COMPONENT
// =============================================================================

const Employees: React.FC = () => {
    usePageTitle('Employees');
    const navigate = useNavigate();

    return (
        <div>
            <PageHeader
                title="Employees"
                description="Monitor and manage your workforce for arrest and compliance activity"
                actions={
                    <Button variant="primary" leftIcon={<span>+</span>}>
                        Add Employee
                    </Button>
                }
            />

            {/* Filters */}
            <Card style={{ marginBottom: '24px' }}>
                <CardBody>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <Input
                                placeholder="Search employees..."
                                leftIcon={
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                    </svg>
                                }
                                fullWidth
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['All', 'Active', 'High Risk', 'With Alerts'].map((filter) => (
                                <button
                                    key={filter}
                                    style={{
                                        padding: '8px 16px',
                                        background: filter === 'All' ? 'var(--accent-muted)' : 'transparent',
                                        border: '1px solid var(--border-default)',
                                        borderColor: filter === 'All' ? 'var(--accent)' : 'var(--border-default)',
                                        borderRadius: '0px',
                                        color: filter === 'All' ? 'var(--accent)' : 'var(--text-muted)',
                                        fontFamily: 'var(--font-body, inherit)',
                                        fontSize: '0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Employees Table */}
            <Card>
                <CardBody cardPadding="0">
                    {mockEmployees.length === 0 ? (
                        <EmptyState
                            icon={<ListIcon size={32} />}
                            title="No employees found"
                            description="Add employees to start monitoring them for arrest activity."
                            action={{ label: 'Add Employee', onClick: () => { } }}
                        />
                    ) : (
                        <div>
                            {/* Table Header */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px',
                                    gap: '16px',
                                    padding: '12px 20px',
                                    borderBottom: '1px solid var(--border-default)',
                                    fontFamily: 'var(--font-body, inherit)',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                }}
                            >
                                <div>Employee</div>
                                <div>Location</div>
                                <div>Status</div>
                                <div>Risk Level</div>
                                <div>Alerts</div>
                                <div></div>
                            </div>

                            {/* Table Rows */}
                            {mockEmployees.map((employee) => (
                                <div
                                    key={employee.id}
                                    onClick={() => navigate(`/portal/employees/${employee.id}`)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px',
                                        gap: '16px',
                                        padding: '14px 20px',
                                        alignItems: 'center',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--sidebar-item-hover)';
                                        e.currentTarget.style.borderLeft = '2px solid var(--accent)';
                                        e.currentTarget.style.paddingLeft = '18px';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderLeft = 'none';
                                        e.currentTarget.style.paddingLeft = '20px';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'var(--accent)' }}>
                                            <PersonIcon size={20} />
                                        </span>
                                        <div>
                                            <div style={{
                                                fontFamily: 'var(--font-body, inherit)',
                                                fontWeight: 600,
                                                color: 'var(--text-primary)'
                                            }}>
                                                {employee.name}
                                            </div>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                fontFamily: 'var(--font-body, inherit)',
                                                color: 'var(--text-muted)',
                                                textTransform: 'uppercase'
                                            }}>
                                                {employee.role} • {employee.department}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <LocationIcon size={14} />
                                        {employee.location}
                                    </div>
                                    <div>
                                        <Badge variant={statusConfig[employee.status].badge} size="sm">
                                            {statusConfig[employee.status].label}
                                        </Badge>
                                    </div>
                                    <div>
                                        <Badge variant={riskConfig[employee.risk_level].badge} size="sm">
                                            {employee.risk_level}
                                        </Badge>
                                    </div>
                                    <div>
                                        {employee.active_alerts > 0 ? (
                                            <Badge variant="danger" size="sm">{employee.active_alerts}</Badge>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>0</span>
                                        )}
                                    </div>
                                    <div>
                                        <Button size="sm" variant="ghost">View</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
};

export default Employees;
