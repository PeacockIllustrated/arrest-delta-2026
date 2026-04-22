import React from 'react';
import { PageHeader, Card, CardHeader, CardBody, Button, ComingSoon } from '../../components/ui';
import { ChartIcon, PersonIcon, TrendIcon, DocumentIcon, RiskIcon, CheckIcon } from '../../components/portal/Icons';
import { usePageTitle } from '../../hooks/usePageTitle';

// =============================================================================
// MVP REPORT TEMPLATES
// =============================================================================

const reportTypes = [
    { Icon: CheckIcon, name: 'Compliance Report', desc: 'Workforce compliance status and audit summary' },
    { Icon: DocumentIcon, name: 'Incident Summary', desc: 'Overview of all incidents and resolutions' },
    { Icon: PersonIcon, name: 'Employee Risk Profile', desc: 'Individual employee risk assessment report' },
    { Icon: TrendIcon, name: 'Trends & Hotspots', desc: 'Geographic and temporal pattern analysis' },
    { Icon: ChartIcon, name: 'Activity Summary', desc: 'Overview of all alerts and activity over time' },
    { Icon: RiskIcon, name: 'Risk Assessment', desc: 'Organization-wide risk factor analysis' },
];

// =============================================================================
// RECENT REPORTS (MOCK)
// TODO: Connect to Supabase `reports` table
// =============================================================================

const recentReports = [
    { name: 'Weekly Compliance Summary', date: '2026-01-01', type: 'Compliance Report' },
    { name: 'Q4 2025 Incident Analysis', date: '2025-12-31', type: 'Incident Summary' },
    { name: 'High-Risk Driver Profile: J. Smith', date: '2025-12-30', type: 'Employee Risk Profile' },
    { name: 'National Regional Hotspots', date: '2025-12-28', type: 'Trends & Hotspots' },
];

// =============================================================================
// COMPONENT
// =============================================================================

const Reports: React.FC = () => {
    usePageTitle('Reports');
    return (
        <div>
            <PageHeader
                title="Reports"
                description="Generate and export compliance and intelligence reports"
                actions={
                    <Button variant="primary" leftIcon={<span>+</span>}>
                        New Report
                    </Button>
                }
            />

            {/* Report Templates */}
            <Card style={{ marginBottom: '24px' }}>
                <CardHeader>Report Templates</CardHeader>
                <CardBody>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '16px',
                        }}
                    >
                        {reportTypes.map((type) => (
                            <div
                                key={type.name}
                                style={{
                                    padding: '20px',
                                    background: 'transparent',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '0px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                    e.currentTarget.style.background = 'var(--accent-muted)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                    e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <div style={{ marginBottom: '12px', color: 'var(--accent)' }}>
                                    <type.Icon size={28} />
                                </div>
                                <div style={{
                                    fontFamily: 'var(--font-body, inherit)',
                                    fontWeight: 'var(--font-weight-bold, 600)' as unknown as number,
                                    color: 'var(--text-primary)',
                                    marginBottom: '6px',
                                    fontSize: '0.85rem',
                                    textTransform: 'var(--text-transform-heading, uppercase)' as React.CSSProperties['textTransform'],
                                    letterSpacing: 'var(--letter-spacing-tight, 0.02em)'
                                }}>
                                    {type.name}
                                </div>
                                <div style={{
                                    fontFamily: 'var(--font-body, inherit)',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    lineHeight: 1.4
                                }}>
                                    {type.desc}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>

            {/* Recent Reports */}
            <Card style={{ marginBottom: '24px' }}>
                <CardHeader>Recent Reports</CardHeader>
                <CardBody>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recentReports.map((report, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 16px',
                                    background: 'transparent',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '0px',
                                    cursor: 'pointer',
                                    transition: 'all 0.1s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--sidebar-item-hover)';
                                    e.currentTarget.style.borderLeft = '2px solid var(--accent)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderLeft = '1px solid var(--border-subtle)';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ color: 'var(--accent)' }}>
                                        <DocumentIcon size={20} />
                                    </span>
                                    <div>
                                        <div style={{
                                            fontFamily: 'var(--font-body, inherit)',
                                            fontWeight: 'var(--font-weight-medium, 600)' as unknown as number,
                                            color: 'var(--text-primary)'
                                        }}>
                                            {report.name}
                                        </div>
                                        <div style={{
                                            fontSize: '0.7rem',
                                            fontFamily: 'var(--font-body, inherit)',
                                            color: 'var(--text-muted)',
                                            textTransform: 'var(--text-transform-heading, uppercase)' as React.CSSProperties['textTransform']
                                        }}>
                                            {report.type} • {report.date}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button size="sm" variant="ghost">View</Button>
                                    <Button size="sm" variant="secondary">Export</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>

            {/* Report Builder Stub */}
            <ComingSoon
                title="Report Builder"
                description="The visual report builder is in development. You'll be able to create custom reports with drag-and-drop sections, date range filters, and multiple export formats (PDF, CSV, XLSX)."
            />
        </div>
    );
};

export default Reports;
