import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardHeader, CardBody, Badge, Button } from '../../components/ui';
import { CheckIcon, PersonIcon } from '../../components/portal/Icons';
import type { RiskFactor } from './RiskAssessment';

// =============================================================================
// MOCK DATA - Replace with Supabase query
// =============================================================================

const mockRiskFactor: RiskFactor & {
    impact_description: string;
    calculation_method: string;
    affected_employees_list: { id: string; name: string; role: string; current_score: number }[];
} = {
    id: 'rf-001',
    name: 'Recent Arrest',
    description: 'Employee has been arrested within the last 30 days',
    weight: 95,
    category: 'criminal',
    affected_employees: 2,
    last_updated: '2026-01-01T10:00:00Z',
    enabled: true,
    impact_description: 'This factor has the highest impact on an employee\'s risk score. A recent arrest indicates immediate legal issues that may affect the employee\'s ability to perform their duties and could expose the organization to liability.',
    calculation_method: 'Binary trigger - if arrest detected within 30 days, full weight is applied. Weight decays by 50% after 30 days, 75% after 60 days, and 90% after 90 days.',
    affected_employees_list: [
        { id: 'emp-001', name: 'John Michael Smith', role: 'Driver', current_score: 72 },
        { id: 'emp-004', name: 'Maria Garcia', role: 'Driver', current_score: 89 },
    ],
};

// =============================================================================
// COMPONENT
// =============================================================================

const RiskFactorDetail: React.FC = () => {
    useParams<{ factor: string }>();
    const navigate = useNavigate();
    const [weight, setWeight] = useState(mockRiskFactor.weight);

    const getWeightColor = (w: number) => {
        if (w >= 80) return 'var(--danger)';
        if (w >= 50) return 'var(--warning)';
        return 'var(--info)';
    };

    const categoryLabels: Record<string, string> = {
        criminal: 'Criminal',
        compliance: 'Compliance',
        behavioral: 'Behavioral',
        historical: 'Historical',
    };

    return (
        <div>
            <PageHeader
                title={mockRiskFactor.name}
                breadcrumbs={[
                    { label: 'Risk Assessment', href: '/portal/risk-assessment' },
                    { label: mockRiskFactor.name },
                ]}
                actions={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary">
                            {mockRiskFactor.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="primary">Save Changes</Button>
                    </div>
                }
            />

            {/* Summary */}
            <Card style={{ marginBottom: '24px' }}>
                <CardBody>
                    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: '300px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Badge>{categoryLabels[mockRiskFactor.category]}</Badge>
                                <Badge variant={mockRiskFactor.enabled ? 'success' : 'default'}>
                                    {mockRiskFactor.enabled ? 'Active' : 'Disabled'}
                                </Badge>
                            </div>
                            <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                {mockRiskFactor.description}
                            </p>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Last updated: {new Date(mockRiskFactor.last_updated).toLocaleDateString('en-GB')}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '32px' }}>
                            <div>
                                <div style={{
                                    fontSize: '2.5rem',
                                    fontWeight: 700,
                                    color: getWeightColor(weight),
                                }}>
                                    {weight}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Weight</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {mockRiskFactor.affected_employees}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Affected</div>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Weight Adjustment */}
                <Card>
                    <CardHeader>Weight Configuration</CardHeader>
                    <CardBody>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                Risk Weight (0-100)
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={weight}
                                    onChange={(e) => setWeight(Number(e.target.value))}
                                    style={{
                                        flex: 1,
                                        height: '8px',
                                        borderRadius: '4px',
                                        appearance: 'none',
                                        background: `linear-gradient(to right, ${getWeightColor(weight)} ${weight}%, var(--border-default) ${weight}%)`,
                                        cursor: 'pointer',
                                    }}
                                />
                                <span style={{
                                    width: '60px',
                                    textAlign: 'center',
                                    fontSize: '1.25rem',
                                    fontWeight: 600,
                                    color: getWeightColor(weight),
                                }}>
                                    {weight}
                                </span>
                            </div>
                        </div>

                        <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                Calculation Method
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {mockRiskFactor.calculation_method}
                            </p>
                        </div>

                        <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                Impact Description
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {mockRiskFactor.impact_description}
                            </p>
                        </div>
                    </CardBody>
                </Card>

                {/* Affected Employees */}
                <Card>
                    <CardHeader>Affected Employees</CardHeader>
                    <CardBody>
                        {mockRiskFactor.affected_employees_list.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                <span style={{ color: 'var(--success)' }}><CheckIcon size={32} /></span>
                                <p>No employees currently affected by this factor</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {mockRiskFactor.affected_employees_list.map((emp) => (
                                    <div
                                        key={emp.id}
                                        onClick={() => navigate(`/portal/employees/${emp.id}`)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            background: 'var(--bg-elevated)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'background 0.1s ease',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--sidebar-item-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ color: 'var(--accent)' }}><PersonIcon size={20} /></span>
                                            <div>
                                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{emp.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.role}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div
                                                style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: `${getWeightColor(emp.current_score)}20`,
                                                    border: `2px solid ${getWeightColor(emp.current_score)}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 600,
                                                    fontSize: '0.8rem',
                                                    color: getWeightColor(emp.current_score),
                                                }}
                                            >
                                                {emp.current_score}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

export default RiskFactorDetail;
