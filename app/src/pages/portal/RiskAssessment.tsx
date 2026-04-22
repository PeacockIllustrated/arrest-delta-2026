import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardBody, Badge, Button } from '../../components/ui';
import { CogIcon } from '../../components/portal/Icons';

// =============================================================================
// TYPES - Ready for Supabase integration
// =============================================================================

export interface RiskFactor {
    id: string;
    name: string;
    description: string;
    weight: number;
    category: 'criminal' | 'compliance' | 'behavioral' | 'historical';
    affected_employees: number;
    last_updated: string;
    enabled: boolean;
}

// =============================================================================
// MOCK DATA - Replace with Supabase query
// TODO: Connect to Supabase table `risk_factors`
// =============================================================================

const mockRiskFactors: RiskFactor[] = [
    { id: 'rf-001', name: 'Recent Arrest', description: 'Employee has been arrested within the last 30 days', weight: 95, category: 'criminal', affected_employees: 2, last_updated: '2026-01-01T10:00:00Z', enabled: true },
    { id: 'rf-002', name: 'Active Warrant', description: 'Employee has an outstanding warrant in any jurisdiction', weight: 100, category: 'criminal', affected_employees: 1, last_updated: '2025-12-15T14:00:00Z', enabled: true },
    { id: 'rf-003', name: 'Multiple Traffic Violations', description: 'Three or more traffic violations in the past 12 months', weight: 45, category: 'compliance', affected_employees: 8, last_updated: '2025-12-20T09:00:00Z', enabled: true },
    { id: 'rf-004', name: 'Expired License', description: "Driver's license or required certification has expired", weight: 60, category: 'compliance', affected_employees: 3, last_updated: '2025-12-28T11:00:00Z', enabled: true },
    { id: 'rf-005', name: 'DUI History', description: 'Employee has a DUI/DWI on record within the past 5 years', weight: 85, category: 'criminal', affected_employees: 4, last_updated: '2025-11-01T16:00:00Z', enabled: true },
    { id: 'rf-006', name: 'High Incident Frequency', description: 'More than 2 incidents in the past 6 months', weight: 55, category: 'behavioral', affected_employees: 5, last_updated: '2025-12-10T08:00:00Z', enabled: true },
    { id: 'rf-007', name: 'Background Check Gap', description: 'No background check performed in the past 12 months', weight: 40, category: 'compliance', affected_employees: 12, last_updated: '2025-12-05T13:00:00Z', enabled: true },
    { id: 'rf-008', name: 'Prior Felony', description: 'Employee has a felony conviction on record', weight: 75, category: 'historical', affected_employees: 6, last_updated: '2025-10-20T10:00:00Z', enabled: false },
];

// =============================================================================
// CONFIGURATION
// =============================================================================

const categoryConfig: Record<RiskFactor['category'], { label: string; color: string }> = {
    criminal: { label: 'Criminal', color: 'var(--danger)' },
    compliance: { label: 'Compliance', color: 'var(--warning)' },
    behavioral: { label: 'Behavioral', color: 'var(--info)' },
    historical: { label: 'Historical', color: 'var(--text-muted)' },
};

// =============================================================================
// COMPONENT
// =============================================================================

const RiskAssessment: React.FC = () => {
    const navigate = useNavigate();

    const getWeightColor = (weight: number) => {
        if (weight >= 80) return 'var(--danger)';
        if (weight >= 50) return 'var(--warning)';
        return 'var(--info)';
    };

    const categorizedFactors = mockRiskFactors.reduce((acc, factor) => {
        if (!acc[factor.category]) acc[factor.category] = [];
        acc[factor.category].push(factor);
        return acc;
    }, {} as Record<string, RiskFactor[]>);

    // Total unique affected employees - reserved for future use
    // const _totalAffected = new Set(mockRiskFactors.flatMap(f => Array(f.affected_employees).fill(f.id))).size;

    return (
        <div>
            <PageHeader
                title="Risk Assessment"
                description="Configure risk scoring factors and view workforce risk distribution"
                actions={
                    <Button variant="primary" leftIcon={<CogIcon size={14} />}>
                        Edit Risk Weights
                    </Button>
                }
            />

            {/* Summary Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
            }}>
                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {mockRiskFactors.filter(f => f.enabled).length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Factors</div>
                    </CardBody>
                </Card>
                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--danger)' }}>
                            {mockRiskFactors.filter(f => f.weight >= 80 && f.enabled).length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>High Weight Factors</div>
                    </CardBody>
                </Card>
                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--warning)' }}>
                            {mockRiskFactors.reduce((sum, f) => sum + f.affected_employees, 0)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Flags</div>
                    </CardBody>
                </Card>
                <Card padding="md">
                    <CardBody>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {Math.round(mockRiskFactors.reduce((sum, f) => sum + f.weight, 0) / mockRiskFactors.length)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Weight</div>
                    </CardBody>
                </Card>
            </div>

            {/* Risk Factors by Category */}
            {Object.entries(categorizedFactors).map(([category, factors]) => (
                <div key={category} style={{ marginBottom: '24px' }}>
                    <h2 style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: categoryConfig[category as RiskFactor['category']].color,
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: categoryConfig[category as RiskFactor['category']].color,
                        }} />
                        {categoryConfig[category as RiskFactor['category']].label}
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '16px',
                    }}>
                        {factors.map((factor) => (
                            <Card
                                key={factor.id}
                                hover
                                style={{
                                    cursor: 'pointer',
                                    opacity: factor.enabled ? 1 : 0.6,
                                }}
                                onClick={() => navigate(`/portal/risk-factors/${factor.id}`)}
                            >
                                <CardBody>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {factor.name}
                                                </span>
                                                {!factor.enabled && <Badge size="sm">Disabled</Badge>}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                {factor.description}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '8px',
                                                background: `${getWeightColor(factor.weight)}20`,
                                                border: `2px solid ${getWeightColor(factor.weight)}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 700,
                                                fontSize: '1rem',
                                                color: getWeightColor(factor.weight),
                                                flexShrink: 0,
                                                marginLeft: '12px',
                                            }}
                                        >
                                            {factor.weight}
                                        </div>
                                    </div>

                                    {/* Weight bar */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{
                                            height: '4px',
                                            background: 'var(--border-default)',
                                            borderRadius: '2px',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${factor.weight}%`,
                                                background: getWeightColor(factor.weight),
                                            }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <span>{factor.affected_employees} employees affected</span>
                                        <span>Updated {new Date(factor.last_updated).toLocaleDateString('en-GB')}</span>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default RiskAssessment;
