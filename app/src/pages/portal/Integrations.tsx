import React, { useState, useMemo } from 'react';
import { PageHeader, Card, CardBody, Badge } from '../../components/ui';
import StateMapPreview from '../../components/visuals/StateMapPreview';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useDemoSim } from '../../context/DemoSimContext';
import { DEMO_JURISDICTIONS } from '../../lib/demo/demoJurisdictions';
import type { CountyHealth } from '../../lib/contracts/pipeline';
import { formatRelativeTime, formatAbsoluteTime } from '../../lib/utils/time';

// =============================================================================
// SOURCE HEALTH PAGE - Operational visibility for jurisdiction coverage
// =============================================================================

type HealthFilter = 'all' | 'healthy' | 'degraded' | 'down';

// Available states (derived from demo jurisdictions)
interface AvailableState {
    stateCode: string;
    stateName: string; // SVG group ID format like 'Florida'
    displayName: string;
}

// Derive available states from demo jurisdictions
const AVAILABLE_STATES: AvailableState[] = (() => {
    const stateMap: Record<string, AvailableState> = {};
    const stateNames: Record<string, string> = {
        CA: 'California',
        TX: 'Texas',
        FL: 'Florida',
        NY: 'New_York',
        IL: 'Illinois',
        PA: 'Pennsylvania',
        OH: 'Ohio',
        GA: 'Georgia',
        NC: 'North_Carolina',
        AZ: 'Arizona',
        WA: 'Washington',
        MI: 'Michigan',
        MA: 'Massachusetts',
        CO: 'Colorado',
    };
    DEMO_JURISDICTIONS.forEach((j) => {
        if (!stateMap[j.stateCode]) {
            stateMap[j.stateCode] = {
                stateCode: j.stateCode,
                stateName: stateNames[j.stateCode] || j.stateCode,
                displayName: stateNames[j.stateCode]?.replace(/_/g, ' ') || j.stateCode,
            };
        }
    });
    return Object.values(stateMap);
})();

// Health state display configuration
const HEALTH_CONFIG: Record<CountyHealth['state'], { label: string; variant: 'success' | 'warning' | 'danger'; color: string }> = {
    healthy: { label: 'Healthy', variant: 'success', color: 'var(--success, #22c55e)' },
    degraded: { label: 'Degraded', variant: 'warning', color: 'var(--warning, #f59e0b)' },
    down: { label: 'Down', variant: 'danger', color: 'var(--danger, #ef4444)' },
};

// Interpretation text for health states
const HEALTH_INTERPRETATION: Record<CountyHealth['state'], string> = {
    healthy: 'Scanning and parsing operating normally.',
    degraded: 'Partial failures or elevated latency detected.',
    down: 'Source unavailable or parsing blocked. No new verified events emitted.',
};

// Sort priority for health states (lower = higher priority)
const HEALTH_SORT_PRIORITY: Record<CountyHealth['state'], number> = {
    down: 0,
    degraded: 1,
    healthy: 2,
};

// Merged row data type
interface HealthRowData {
    jurisdictionId: string;
    displayName: string;
    stateCode: string;
    health: CountyHealth['state'];
    lastSuccessfulScanAtISO: string | null;
    lastAttemptAtISO: string | null;
    latencyMs: number | null;
    parserVersionLabel: string | null;
}

const SourceHealth: React.FC = () => {
    usePageTitle('Source Health');

    const { countyHealth, pulse, isOn } = useDemoSim();

    // Local state
    const [selectedCountyId, setSelectedCountyId] = useState<string | null>(null);
    const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
    const [selectedState, setSelectedState] = useState<string>(AVAILABLE_STATES[0]?.stateCode || 'CA');

    // Get jurisdictions for selected state
    const stateJurisdictions = useMemo(() => {
        return DEMO_JURISDICTIONS.filter((j) => j.stateCode === selectedState);
    }, [selectedState]);

    // Merge jurisdictions with health data (filtered by state)
    const healthRows = useMemo((): HealthRowData[] => {
        return stateJurisdictions.map((j) => {
            const health = countyHealth[j.jurisdictionId];
            return {
                jurisdictionId: j.jurisdictionId,
                displayName: j.displayName,
                stateCode: j.stateCode,
                health: health?.state ?? 'healthy',
                lastSuccessfulScanAtISO: health?.lastSuccessfulScanAtISO ?? null,
                lastAttemptAtISO: health?.lastAttemptAtISO ?? null,
                latencyMs: health?.latencyMs ?? null,
                parserVersionLabel: health?.parserVersionLabel ?? null,
            };
        });
    }, [stateJurisdictions, countyHealth]);

    // Filter rows
    const filteredRows = useMemo(() => {
        if (healthFilter === 'all') return healthRows;
        return healthRows.filter((r) => r.health === healthFilter);
    }, [healthRows, healthFilter]);

    // Sort: down first, then degraded, then healthy; within groups by oldest scan first
    const sortedRows = useMemo(() => {
        return [...filteredRows].sort((a, b) => {
            const priorityDiff = HEALTH_SORT_PRIORITY[a.health] - HEALTH_SORT_PRIORITY[b.health];
            if (priorityDiff !== 0) return priorityDiff;

            // Within same health state, oldest scan first (null treated as oldest)
            const aTime = a.lastSuccessfulScanAtISO ? new Date(a.lastSuccessfulScanAtISO).getTime() : 0;
            const bTime = b.lastSuccessfulScanAtISO ? new Date(b.lastSuccessfulScanAtISO).getTime() : 0;
            return aTime - bTime;
        });
    }, [filteredRows]);

    // KPI calculations (for selected state only)
    const kpis = useMemo(() => {
        const counts = { healthy: 0, degraded: 0, down: 0 };
        let latencySum = 0;
        let latencyCount = 0;
        let lastFullSuccessISO: string | null = null;

        healthRows.forEach((r) => {
            counts[r.health]++;
            if (r.latencyMs != null && r.health !== 'down') {
                latencySum += r.latencyMs;
                latencyCount++;
            }
            // Track most recent healthy scan for "last 100% successful"
            if (r.health === 'healthy' && r.lastSuccessfulScanAtISO) {
                if (!lastFullSuccessISO || r.lastSuccessfulScanAtISO > lastFullSuccessISO) {
                    lastFullSuccessISO = r.lastSuccessfulScanAtISO;
                }
            }
        });

        return {
            healthy: counts.healthy,
            degraded: counts.degraded,
            down: counts.down,
            avgLatency: latencyCount > 0 ? Math.round(latencySum / latencyCount) : null,
            lastFullSuccess: lastFullSuccessISO,
        };
    }, [healthRows]);

    // Selected row data
    const selectedRow = useMemo(() => {
        if (!selectedCountyId) return null;
        return healthRows.find((r) => r.jurisdictionId === selectedCountyId) ?? null;
    }, [healthRows, selectedCountyId]);

    // Get selected state info
    const selectedStateInfo = AVAILABLE_STATES.find((s) => s.stateCode === selectedState);

    // Handle row selection
    const handleRowSelect = (jurisdictionId: string) => {
        setSelectedCountyId(jurisdictionId);
        pulse(jurisdictionId);
    };

    // Check if we have any health data
    const hasHealthData = Object.keys(countyHealth).length > 0;

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <div>
            <PageHeader
                title="Source Health"
                description="Operational visibility for jurisdiction coverage, scan recency, and parser integrity."
            />

            {/* KPI Strip */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
            }}>
                <KPICard label="Healthy Counties" value={kpis.healthy} color="var(--success, #22c55e)" />
                <KPICard label="Degraded Counties" value={kpis.degraded} color="var(--warning, #f59e0b)" />
                <KPICard label="Down Counties" value={kpis.down} color="var(--danger, #ef4444)" />
                <KPICard
                    label="Last 100% Scan"
                    value={kpis.lastFullSuccess ? formatRelativeTime(kpis.lastFullSuccess) : '-'}
                    color="var(--text-secondary)"
                    subtitle={kpis.lastFullSuccess ? formatAbsoluteTime(kpis.lastFullSuccess) : undefined}
                />
                <KPICard
                    label="Avg Latency"
                    value={kpis.avgLatency != null ? `${kpis.avgLatency}ms` : '-'}
                    color="var(--text-secondary)"
                />
            </div>

            {/* Empty State */}
            {!hasHealthData && !isOn && (
                <Card style={{ marginBottom: '24px' }}>
                    <CardBody>
                        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                            <div style={{
                                fontSize: '1.25rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginBottom: '8px',
                            }}>
                                Health metrics unavailable
                            </div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)',
                            }}>
                                Turn Sim Mode on to generate operational telemetry.
                            </div>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Main Content - Two Column Layout */}
            {(hasHealthData || isOn) && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 360px',
                    gap: '24px',
                }}>
                    {/* Left Column - Health Table */}
                    <div>
                        {/* State Selector + Filter Buttons */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            marginBottom: '16px',
                            flexWrap: 'wrap',
                        }}>
                            {/* State Selector */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: 'var(--text-muted)',
                                }}>
                                    State:
                                </label>
                                <select
                                    value={selectedState}
                                    onChange={(e) => {
                                        setSelectedState(e.target.value);
                                        setSelectedCountyId(null); // Clear selection when state changes
                                    }}
                                    style={{
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                        padding: '6px 12px',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        minWidth: '140px',
                                    }}
                                >
                                    {AVAILABLE_STATES.map((s) => (
                                        <option key={s.stateCode} value={s.stateCode}>
                                            {s.displayName} ({s.stateCode})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Separator */}
                            <div style={{
                                width: '1px',
                                height: '24px',
                                background: 'var(--border-subtle)',
                            }} />

                            {/* Filter Buttons */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(['all', 'healthy', 'degraded', 'down'] as HealthFilter[]).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setHealthFilter(filter)}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '0.7rem',
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            border: '1px solid',
                                            borderColor: healthFilter === filter ? 'var(--accent)' : 'var(--border-subtle)',
                                            background: healthFilter === filter ? 'rgba(228, 0, 40, 0.1)' : 'transparent',
                                            color: healthFilter === filter ? 'var(--accent)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        {filter === 'all' ? 'All' : filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Health Table */}
                        <Card>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '0.8rem',
                                }}>
                                    <thead>
                                        <tr style={{
                                            borderBottom: '1px solid var(--border-subtle)',
                                            background: 'var(--bg-elevated)',
                                        }}>
                                            <th style={thStyle}>County</th>
                                            <th style={thStyle}>Health</th>
                                            <th style={thStyle}>Last Scan</th>
                                            <th style={thStyle}>Latency</th>
                                            <th style={thStyle}>Parser</th>
                                            <th style={thStyle}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedRows.map((row) => (
                                            <tr
                                                key={row.jurisdictionId}
                                                onClick={() => handleRowSelect(row.jurisdictionId)}
                                                style={{
                                                    borderBottom: '1px solid var(--border-subtle)',
                                                    cursor: 'pointer',
                                                    background: selectedCountyId === row.jurisdictionId
                                                        ? 'rgba(228, 0, 40, 0.08)'
                                                        : 'transparent',
                                                    transition: 'background 0.15s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (selectedCountyId !== row.jurisdictionId) {
                                                        e.currentTarget.style.background = 'var(--bg-hover, rgba(255,255,255,0.03))';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (selectedCountyId !== row.jurisdictionId) {
                                                        e.currentTarget.style.background = 'transparent';
                                                    }
                                                }}
                                            >
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                        {row.displayName}
                                                    </div>
                                                </td>
                                                <td style={tdStyle}>
                                                    <Badge
                                                        variant={HEALTH_CONFIG[row.health].variant}
                                                        size="sm"
                                                        dot
                                                    >
                                                        {HEALTH_CONFIG[row.health].label}
                                                    </Badge>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div>{formatRelativeTime(row.lastSuccessfulScanAtISO)}</div>
                                                    {row.lastSuccessfulScanAtISO && (
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                            {formatAbsoluteTime(row.lastSuccessfulScanAtISO)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={tdStyle}>
                                                    {row.latencyMs != null ? (
                                                        <span style={{
                                                            color: row.latencyMs > 1000 ? 'var(--warning)' : 'var(--text-secondary)',
                                                        }}>
                                                            {row.latencyMs}ms
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        {row.parserVersionLabel ?? 'Unknown'}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRowSelect(row.jurisdictionId);
                                                        }}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--accent)',
                                                            fontSize: '0.65rem',
                                                            cursor: 'pointer',
                                                            padding: '4px 8px',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.05em',
                                                        }}
                                                    >
                                                        Pulse
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sortedRows.length === 0 && (
                                            <tr>
                                                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    No counties match the selected filter
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column - State Map + Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* State Label */}
                        <div style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                        }}>
                            {selectedStateInfo?.displayName || selectedState} Coverage
                        </div>

                        {/* State Map - 1:1 aspect ratio */}
                        <StateMapPreview
                            stateId={selectedStateInfo?.stateName || 'California'}
                            height="auto"
                            aspectRatio="1 / 1"
                        />

                        {/* Selected County Details Panel */}
                        <Card>
                            <CardBody>
                                {selectedRow ? (
                                    <div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: '12px',
                                        }}>
                                            <div style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                color: 'var(--text-primary)',
                                            }}>
                                                {selectedRow.displayName}
                                            </div>
                                            <Badge
                                                variant={HEALTH_CONFIG[selectedRow.health].variant}
                                                size="sm"
                                                dot
                                            >
                                                {HEALTH_CONFIG[selectedRow.health].label}
                                            </Badge>
                                        </div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '10px',
                                            marginBottom: '12px',
                                        }}>
                                            <DetailItem
                                                label="Last Scan"
                                                value={formatRelativeTime(selectedRow.lastSuccessfulScanAtISO)}
                                            />
                                            <DetailItem
                                                label="Latency"
                                                value={selectedRow.latencyMs != null ? `${selectedRow.latencyMs}ms` : 'Unknown'}
                                            />
                                            <DetailItem
                                                label="Last Attempt"
                                                value={formatRelativeTime(selectedRow.lastAttemptAtISO)}
                                            />
                                            <DetailItem
                                                label="Parser"
                                                value={selectedRow.parserVersionLabel ?? 'Unknown'}
                                            />
                                        </div>

                                        {/* Interpretation */}
                                        <div style={{
                                            padding: '10px',
                                            background: 'var(--bg-elevated)',
                                            borderLeft: `3px solid ${HEALTH_CONFIG[selectedRow.health].color}`,
                                            fontSize: '0.75rem',
                                            color: 'var(--text-secondary)',
                                        }}>
                                            {HEALTH_INTERPRETATION[selectedRow.health]}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '20px',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.8rem',
                                    }}>
                                        Select a county to view details
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface KPICardProps {
    label: string;
    value: string | number;
    color: string;
    subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, color, subtitle }) => (
    <Card>
        <CardBody>
            <div style={{
                fontSize: '0.65rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                marginBottom: '6px',
            }}>
                {label}
            </div>
            <div style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color,
                lineHeight: 1,
            }}>
                {value}
            </div>
            {subtitle && (
                <div style={{
                    fontSize: '0.6rem',
                    color: 'var(--text-muted)',
                    marginTop: '4px',
                }}>
                    {subtitle}
                </div>
            )}
        </CardBody>
    </Card>
);

interface DetailItemProps {
    label: string;
    value: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => (
    <div>
        <div style={{
            fontSize: '0.6rem',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '2px',
        }}>
            {label}
        </div>
        <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-primary)',
        }}>
            {value}
        </div>
    </div>
);

// Table cell styles
const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
};

const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    color: 'var(--text-secondary)',
};

export default SourceHealth;
