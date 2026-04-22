import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, CardHeader, CardBody, Badge } from '../../components/ui';
import {
  StatCard,
  TrendChart,
  DemographicsPanel,
} from '../../components/stats';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useCountyStats } from '../../hooks/useCountyStats';
import type { CountySourceModel } from '../../lib/types/viewModels';

// =============================================================================
// COUNTY DETAIL PAGE - Individual county statistics and trends
// =============================================================================

/**
 * Source reliability badge variant
 */
const getReliabilityVariant = (reliability: number): 'success' | 'warning' | 'danger' | 'default' => {
  if (reliability >= 90) return 'success';
  if (reliability >= 70) return 'warning';
  return 'danger';
};

/**
 * Source item component
 */
const SourceItem: React.FC<{ source: CountySourceModel }> = ({ source }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Status indicator */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: source.isActive ? 'var(--success)' : 'var(--text-muted)',
        }}
      />

      {/* Source info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {source.displayName}
          </span>
          {source.isPrimary && (
            <Badge variant="accent" size="sm">
              Primary
            </Badge>
          )}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {source.sourceType}
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {source.hasMugshots && (
          <span
            style={{
              padding: '2px 6px',
              fontSize: '0.6rem',
              fontWeight: 500,
              background: 'var(--surface)',
              color: 'var(--text-muted)',
            }}
          >
            Photos
          </span>
        )}
        {source.hasBookingTime && (
          <span
            style={{
              padding: '2px 6px',
              fontSize: '0.6rem',
              fontWeight: 500,
              background: 'var(--surface)',
              color: 'var(--text-muted)',
            }}
          >
            Times
          </span>
        )}
      </div>

      {/* Reliability */}
      <Badge variant={getReliabilityVariant(source.reliability)} size="sm">
        {source.reliability}%
      </Badge>
    </div>
  );
};

const CountyDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { selectedCounty, loading, loadCountyDetail, clearSelection } = useCountyStats();

  // Update page title
  usePageTitle(selectedCounty ? `${selectedCounty.name} County` : 'County Detail');

  // Load county data on mount or slug change
  useEffect(() => {
    if (slug) {
      loadCountyDetail(slug);
    }

    return () => {
      clearSelection();
    };
  }, [slug, loadCountyDetail, clearSelection]);

  // Handle back navigation
  const handleBack = () => {
    navigate('/portal/analytics');
  };

  // Loading state
  if (loading.isLoading && !selectedCounty) {
    return (
      <div>
        <PageHeader title="Loading County..." description="Fetching county data" />
        <Card>
          <CardBody>
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
              }}
            >
              Loading...
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Error state
  if (loading.error) {
    return (
      <div>
        <PageHeader title="Error" description="Failed to load county data" />
        <Card style={{ borderLeft: '3px solid var(--danger)' }}>
          <CardBody>
            <div style={{ color: 'var(--danger)', marginBottom: '16px' }}>Error: {loading.error}</div>
            <button
              onClick={handleBack}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              ← Back to Analytics
            </button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!selectedCounty) {
    return (
      <div>
        <PageHeader title="County Not Found" description={`No county found with slug: ${slug}`} />
        <Card>
          <CardBody>
            <button
              onClick={handleBack}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              ← Back to Analytics
            </button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const county = selectedCounty;

  // Trend arrow
  const trendArrow = county.trend.direction === 'up' ? '▲' : county.trend.direction === 'down' ? '▼' : '─';

  return (
    <div>
      {/* Back button + Header */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={handleBack}
          style={{
            padding: '6px 12px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            cursor: 'pointer',
            marginBottom: '8px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ← Back to Analytics
        </button>

        <PageHeader
          title={`${county.name} County`}
          description={`${county.region || 'United States'} • Population: ${county.population?.toLocaleString() ?? 'N/A'} • FIPS: ${county.fips}`}
        />
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
        className="kpi-grid"
      >
        <StatCard label="Bookings (7d)" value={county.totalBookings7d} variant="accent" />
        <StatCard label="Avg Bond" value={county.formattedAvgBond} />
        <StatCard label="Felony %" value={county.formattedFelonyPercent} variant="warning" />
        <StatCard
          label="Trend"
          value={`${trendArrow} ${county.trend.percentChange.toFixed(1)}%`}
          variant={
            county.trend.direction === 'up'
              ? 'danger'
              : county.trend.direction === 'down'
                ? 'success'
                : 'default'
          }
        />
      </div>

      {/* Main Grid: Trend + Sources */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
          marginBottom: '24px',
        }}
        className="main-grid"
      >
        {/* Trend Chart */}
        <TrendChart
          data={county.dailyTrend}
          title="Daily Bookings (30 Days)"
          valueKey="totalBookings"
          height={280}
        />

        {/* Data Sources */}
        <Card>
          <CardHeader>Data Sources</CardHeader>
          <CardBody cardPadding="0">
            {county.sources.length > 0 ? (
              county.sources.map((source) => <SourceItem key={source.sourceId} source={source} />)
            ) : (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                }}
              >
                No sources configured
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Demographics */}
      <div style={{ marginBottom: '24px' }}>
        <h3
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '16px',
          }}
        >
          Demographics (30 Days)
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
          className="demographics-grid"
        >
          <DemographicsPanel demographics={county.demographics} showCount />
        </div>
      </div>

      {/* Charge Distribution (if available) */}
      {county.chargeDistribution.length > 0 && (
        <Card>
          <CardHeader>Top Charges</CardHeader>
          <CardBody cardPadding="0">
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    Charge
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    Severity
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    Count
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    Avg Bond
                  </th>
                </tr>
              </thead>
              <tbody>
                {county.chargeDistribution.slice(0, 10).map((charge, index) => (
                  <tr key={charge.statuteCode || index}>
                    <td
                      style={{
                        padding: '12px 16px',
                        fontSize: '0.8rem',
                        color: 'var(--text-primary)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div>{charge.description}</div>
                      {charge.statuteCode && (
                        <div
                          style={{
                            fontSize: '0.65rem',
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {charge.statuteCode}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <Badge
                        variant={
                          charge.severity === 'Felony'
                            ? 'danger'
                            : charge.severity === 'Misdemeanor'
                              ? 'warning'
                              : 'default'
                        }
                        size="sm"
                      >
                        {charge.severity || 'Unknown'}
                      </Badge>
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: 'var(--text-primary)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      {charge.count.toLocaleString()}
                      <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                        ({charge.percent.toFixed(1)}%)
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: 'var(--text-primary)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      {charge.avgBond ? `$${charge.avgBond.toLocaleString()}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <style>{`
        @media (max-width: 1200px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .main-grid {
            grid-template-columns: 1fr !important;
          }
          .demographics-grid {
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

export default CountyDetail;
