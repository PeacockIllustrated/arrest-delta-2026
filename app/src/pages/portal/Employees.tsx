import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardBody, Badge, Button, Input, EmptyState } from '../../components/ui';
import { PersonIcon, LocationIcon, ListIcon } from '../../components/portal/Icons';
import { usePageTitle } from '../../hooks/usePageTitle';
import { REAL_MUGSHOT_ENTRIES } from '../../lib/demo/realMugshots';

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

// Employees seeded from 100 real records in Supabase. Each employee has a
// real mugshot, real name, real county+state, and derived risk/alerts based
// on their real charge data. Deterministic by index so order is stable.
const ROLES = ['Driver', 'Warehouse Associate', 'Manager', 'Dispatcher', 'Field Technician', 'Operations Lead'];
const DEPARTMENTS = ['Logistics', 'Operations', 'Fleet', 'Support'];

function classifyRisk(charges: string[]): 'low' | 'medium' | 'high' | 'critical' {
    const joined = charges.join(' ').toLowerCase();
    if (/murder|kidnap|rape|aggravated|firearm|weapon|arson/.test(joined)) return 'critical';
    if (/assault|battery|burglary|robbery|felony|trafficking/.test(joined)) return 'high';
    if (/dui|theft|possession|fraud|drug/.test(joined)) return 'medium';
    return 'low';
}

function classifyStatus(risk: 'low' | 'medium' | 'high' | 'critical'): 'active' | 'inactive' | 'suspended' | 'terminated' {
    if (risk === 'critical') return 'suspended';
    return 'active';
}

const mockEmployees: Employee[] = REAL_MUGSHOT_ENTRIES.slice(0, 40).map((r, i) => {
    const risk = classifyRisk(r.allCharges);
    const status = classifyStatus(risk);
    const role = ROLES[i % ROLES.length];
    const department = DEPARTMENTS[i % DEPARTMENTS.length];
    const alerts = risk === 'critical' ? 3 + (i % 4) : risk === 'high' ? 1 + (i % 3) : risk === 'medium' ? i % 2 : 0;
    const incidents = risk === 'critical' ? 1 + (i % 3) : risk === 'high' ? (i % 2) : 0;
    // Stagger last_check across the past week so the feed looks active
    const hoursAgo = (i * 3) % 168;
    const lastCheck = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
    // Preserve mugshotUrl on the employee record so rows can show a portrait
    return {
        id: r.personId,
        name: r.displayName,
        role,
        department,
        location: `${r.countyDisplayName.replace(' County', '')}, ${r.stateCode}`,
        status,
        risk_level: risk,
        last_check: lastCheck,
        active_alerts: alerts,
        active_incidents: incidents,
        created_at: new Date(Date.now() - (90 + (i * 7)) * 86400 * 1000).toISOString(),
        updated_at: lastCheck,
        // extra prop used by the view only; Employee type is lenient
        mugshotUrl: r.mugshotUrl,
    } as Employee & { mugshotUrl: string };
});

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
                                        {(employee as Employee & { mugshotUrl?: string }).mugshotUrl ? (
                                            <img
                                                src={(employee as Employee & { mugshotUrl?: string }).mugshotUrl}
                                                alt=""
                                                referrerPolicy="no-referrer"
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: 'var(--bg-elevated)', flexShrink: 0 }}
                                            />
                                        ) : (
                                            <span style={{ color: 'var(--accent)' }}>
                                                <PersonIcon size={20} />
                                            </span>
                                        )}
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
