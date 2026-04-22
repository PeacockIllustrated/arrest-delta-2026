import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader, Card, CardHeader, CardBody } from '../../components/ui';
import { RecordList, RecordDetailModal, RecordSearchMap } from '../../components/stats';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useRecordSearch } from '../../hooks/useRecordSearch';
import { useCountyStats } from '../../hooks/useCountyStats';
import { useAuth } from '../../hooks/useAuth';
import { isLiveDemoBypass } from '../../hooks/usePortalData';
import { useRole } from '../../hooks/useRole';
import { supabase } from '../../lib/supabase';
import type { RecordSearchResult } from '../../lib/types/viewModels';
import {
  DEMO_COUNTY_RECORD_COUNTS,
  UNAVAILABLE_COUNTY_FIPS,
  buildFipsToCountyIdMap,
} from '../../lib/utils/fipsMapping';
import { canonicalSvgFipsFor } from '../../lib/utils/canonicalFips';

// =============================================================================
// RECORD SEARCH PAGE - Search and browse enriched records with interactive map
// =============================================================================

const RecordSearch: React.FC = () => {
  usePageTitle('Record Search');

  // Check demo mode
  const isDemo = import.meta.env.VITE_PORTAL_MODE === 'demo';

  // Authentication and role
  const { user, loading: authLoading } = useAuth();
  const { role } = useRole();

  const {
    results,
    selectedRecord,
    filters,
    loading,
    access,
    search,
    loadRecord,
    clearSelection,
    updateFilters,
    reset,
  } = useRecordSearch();

  // Load counties for mapping
  const { counties } = useCountyStats();

  // Map selection state
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCountyFips, setSelectedCountyFips] = useState<string | null>(null);
  const [selectedCountyName, setSelectedCountyName] = useState<string | null>(null);

  // Build canonical-FIPS-to-county-id map (db fips is corrupted; use canonical
  // from national_county.txt so map clicks select the right county_id).
  const fipsToCountyId = useMemo(() => {
    // Keep old db-fips map as fallback (for the ~5% of rows that were correct).
    const map = buildFipsToCountyIdMap(counties);
    for (const c of counties) {
      const svgFips = canonicalSvgFipsFor(c.state ?? null, c.name ?? null);
      if (svgFips && !map.has(svgFips)) map.set(svgFips, c.countyId);
    }
    return map;
  }, [counties]);

  // State for real county record counts
  const [liveCountyRecordCounts, setLiveCountyRecordCounts] = useState<Map<string, number>>(
    new Map()
  );
  const [_countsLoading, setCountsLoading] = useState(false);

  // State for available sources
  const [availableSources, setAvailableSources] = useState<{ source_id: number; name: string; display_name: string }[]>([]);

  // Fetch county record counts, then remap county_id -> canonical US Census FIPS
  // using the shipped national_county.txt asset. We deliberately ignore
  // `counties.fips` because the live DB has corrupted values for most non-FL
  // counties (state prefix correct, county portion randomised).
  useEffect(() => {
    if (isDemo) return;

    const fetchCountyCounts = async () => {
      setCountsLoading(true);
      try {
        // 1. Load counties with name + state so we can compute canonical FIPS.
        const { data: countiesData, error: countiesError } = await supabase
          .from('counties')
          .select('county_id, name, state')
          .limit(5000);

        if (countiesError) {
          console.error('[RecordSearch] Failed to fetch counties:', countiesError);
          return;
        }

        // county_id -> canonical SVG FIPS (e.g. 'c04013' for Maricopa AZ)
        const countyIdToCanonicalFips = new Map<number, string>();
        let unmapped = 0;
        for (const c of countiesData || []) {
          const svgFips = canonicalSvgFipsFor(c.state as string, c.name as string);
          if (svgFips) {
            countyIdToCanonicalFips.set(c.county_id as number, svgFips);
          } else {
            unmapped++;
          }
        }
        console.log(`[RecordSearch] Canonical FIPS: ${countyIdToCanonicalFips.size} mapped, ${unmapped} unmapped`);

        // 2. Aggregate candidate_records by county_id in pages (PostgREST caps at 1000/req).
        const countsByCountyId = new Map<number, number>();
        let offset = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from('candidate_records')
            .select('county_id')
            .not('county_id', 'is', null)
            .range(offset, offset + pageSize - 1);

          if (error) {
            console.error('[RecordSearch] records page error:', error.message);
            break;
          }
          if (!data || data.length === 0) { hasMore = false; break; }

          for (const row of data) {
            const cid = row.county_id as number;
            countsByCountyId.set(cid, (countsByCountyId.get(cid) || 0) + 1);
          }
          hasMore = data.length === pageSize;
          offset += pageSize;
          if (offset > 200000) { console.warn('[RecordSearch] hit 200k safety cap'); break; }
        }

        // 3. Fold into canonical-FIPS-keyed map. Counties that don't match the
        //    canonical list are dropped (usually junk rows like name="1").
        const countsByFips = new Map<string, number>();
        let mapped = 0, dropped = 0;
        for (const [countyId, count] of countsByCountyId) {
          const svgFips = countyIdToCanonicalFips.get(countyId);
          if (svgFips) { countsByFips.set(svgFips, (countsByFips.get(svgFips) || 0) + count); mapped += count; }
          else { dropped += count; }
        }

        const statesRepresented = new Set(
          Array.from(countsByFips.keys()).map(k => k.slice(1, 3))
        );
        console.log(
          `[RecordSearch] records: ${mapped} mapped / ${dropped} dropped, ` +
          `${countsByFips.size} counties across ${statesRepresented.size} states`
        );

        setLiveCountyRecordCounts(countsByFips);
      } catch (err) {
        console.error('[RecordSearch] fetchCountyCounts threw:', err);
      } finally {
        setCountsLoading(false);
      }
    };

    fetchCountyCounts();
  }, [isDemo]);

  // Fetch available sources for filter dropdown
  useEffect(() => {
    if (isDemo) return;

    const fetchSources = async () => {
      try {
        const { data, error } = await supabase
          .from('sources')
          .select('source_id, name, display_name')
          .eq('is_active', true)
          .order('name');

        if (!error && data) {
          setAvailableSources(data);
          console.log('[RecordSearch] Loaded sources:', data.length);
        }
      } catch (err) {
        console.error('[RecordSearch] Error fetching sources:', err);
      }
    };

    fetchSources();
  }, [isDemo]);

  // Build county record counts for heat map (demo or live)
  const countyRecordCounts = useMemo(() => {
    if (isDemo) {
      return DEMO_COUNTY_RECORD_COUNTS;
    }
    // Use live data if available, otherwise fall back to demo
    if (liveCountyRecordCounts.size > 0) {
      return liveCountyRecordCounts;
    }
    return DEMO_COUNTY_RECORD_COUNTS;
  }, [isDemo, liveCountyRecordCounts]);

  // Local state for search input
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Trigger search when debounced query changes
  useEffect(() => {
    search({ query: debouncedQuery || undefined, page: 1 });
  }, [debouncedQuery, search]);

  // Initial load
  useEffect(() => {
    search({ page: 1 });
  }, [search]);

  // Handle record click
  const handleRecordClick = useCallback(
    (record: RecordSearchResult) => {
      loadRecord(record.id);
    },
    [loadRecord]
  );

  // Handle map state selection
  const handleStateSelect = useCallback(
    (stateId: string | null) => {
      setSelectedState(stateId);
      if (!stateId) {
        // Back to country view - clear county filter
        setSelectedCountyFips(null);
        setSelectedCountyName(null);
        updateFilters({ countyId: undefined });
        search({ countyId: undefined, page: 1 });
      }
    },
    [updateFilters, search]
  );

  // Handle map county selection
  const handleCountySelect = useCallback(
    (countyFips: string | null, countyName: string | null) => {
      setSelectedCountyFips(countyFips);
      setSelectedCountyName(countyName);

      if (countyFips) {
        // Convert FIPS to county ID and filter
        const countyId = fipsToCountyId.get(countyFips);
        if (countyId) {
          updateFilters({ countyId });
          search({ countyId, page: 1 });
        }
      } else {
        // Deselected county - show all state records
        updateFilters({ countyId: undefined });
        search({ countyId: undefined, page: 1 });
      }
    },
    [fipsToCountyId, updateFilters, search]
  );

  // Handle filter changes
  const handleSexChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sex = e.target.value || undefined;
    updateFilters({ sex });
    search({ sex, page: 1 });
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sourceId = e.target.value ? parseInt(e.target.value) : undefined;
    updateFilters({ sourceId });
    search({ sourceId, page: 1 });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedState(null);
    setSelectedCountyFips(null);
    setSelectedCountyName(null);
    reset();
    search({ page: 1 });
  };

  // Input style
  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '0.8rem',
    background: 'var(--surface)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    outline: 'none',
    minWidth: '120px',
  };

  // Select style
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    paddingRight: '28px',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
  };

  const hasActiveFilters =
    searchQuery || selectedCountyFips || filters.sex || filters.race || filters.sourceId;

  // Get display text for current selection
  const selectionLabel = useMemo(() => {
    if (selectedCountyName && selectedState) {
      return `${selectedCountyName}, ${selectedState}`;
    }
    if (selectedState) {
      return `${selectedState} (All Counties)`;
    }
    return 'All Records';
  }, [selectedState, selectedCountyName]);

  // Show login required message if not authenticated (skip in demo or live-demo bypass mode)
  if (!isDemo && !isLiveDemoBypass() && !authLoading && !user) {
    return (
      <div>
        <PageHeader
          title="Record Search"
          description="Search and browse booking records across all counties"
        />
        <Card>
          <CardBody>
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '1.5rem',
                  marginBottom: '16px',
                }}
              >
                🔒
              </div>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Authentication Required
              </h3>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginBottom: '24px',
                  maxWidth: '400px',
                  margin: '0 auto 24px',
                }}
              >
                You must be logged in to search and browse booking records.
                Please sign in to continue.
              </p>
              <a
                href="/portal/login"
                style={{
                  display: 'inline-block',
                  padding: '10px 24px',
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Sign In
              </a>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Show loading state while checking auth (skip in demo mode)
  if (!isDemo && authLoading) {
    return (
      <div>
        <PageHeader
          title="Record Search"
          description="Search and browse booking records across all counties"
        />
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
              Verifying authentication...
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Record Search"
        description="Browse booking records by selecting a region on the map"
      />

      {/* Access Tier Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '8px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
            }}
          >
            Access Level:
          </span>
          <span
            style={{
              padding: '2px 8px',
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              background:
                access.tier === 'admin'
                  ? 'var(--success-muted, rgba(34, 197, 94, 0.1))'
                  : access.tier === 'analyst'
                    ? 'var(--info-muted, rgba(59, 130, 246, 0.1))'
                    : 'var(--surface)',
              color:
                access.tier === 'admin'
                  ? 'var(--success)'
                  : access.tier === 'analyst'
                    ? 'var(--info, #3b82f6)'
                    : 'var(--text-muted)',
            }}
          >
            {access.permissions.tierName}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
          }}
        >
          {access.pageSize} records per page
        </span>
      </div>

      {/* Interactive Map */}
      <Card style={{ marginBottom: '16px' }}>
        <CardBody cardPadding="0">
          <RecordSearchMap
            selectedState={selectedState}
            selectedCounty={selectedCountyFips}
            onStateSelect={handleStateSelect}
            onCountySelect={handleCountySelect}
            countyRecordCounts={countyRecordCounts}
            unavailableCounties={UNAVAILABLE_COUNTY_FIPS}
            height="350px"
            showTooltips={true}
          />
        </CardBody>
      </Card>

      {/* Search Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <CardBody>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            {/* Current selection indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: 'var(--accent-muted, rgba(228, 0, 40, 0.1))',
                border: '1px solid var(--accent)',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--accent)',
                  fontWeight: 600,
                }}
              >
                {selectionLabel}
              </span>
            </div>

            {/* Search input */}
            <div style={{ flex: '1 1 250px', minWidth: '180px' }}>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  ...inputStyle,
                  width: '100%',
                }}
              />
            </div>

            {/* Source filter */}
            <select
              value={filters.sourceId ?? ''}
              onChange={handleSourceChange}
              style={selectStyle}
            >
              <option value="">All Sources</option>
              {availableSources.map((source) => (
                <option key={source.source_id} value={source.source_id}>
                  {source.display_name || source.name}
                </option>
              ))}
            </select>

            {/* Sex filter */}
            <select
              value={filters.sex ?? ''}
              onChange={handleSexChange}
              style={selectStyle}
            >
              <option value="">All Sexes</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                Clear All
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <span>
              Results
              {results.total > 0 && (
                <span
                  style={{
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                    marginLeft: '8px',
                  }}
                >
                  ({results.total.toLocaleString()} records)
                </span>
              )}
            </span>
            {loading.isLoading && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Loading...
              </span>
            )}
          </div>
        </CardHeader>
        <CardBody cardPadding="0">
          {/* Demo data notice */}
          {loading.error && loading.error.includes('demo') && (
            <div
              style={{
                padding: '8px 16px',
                background: 'var(--info-muted, rgba(59, 130, 246, 0.1))',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.7rem',
                color: 'var(--info, #3b82f6)',
              }}
            >
              Showing demo data
            </div>
          )}

          {/* Error state (non-demo errors) */}
          {loading.error && !loading.error.includes('demo') && (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: 'var(--danger)',
                fontSize: '0.8rem',
              }}
            >
              Error: {loading.error}
            </div>
          )}

          {/* Loading state */}
          {loading.isLoading && results.data.length === 0 && !loading.error && (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
              }}
            >
              Searching records...
            </div>
          )}

          {/* Results list */}
          {!loading.isLoading && (
            <RecordList
              records={results.data}
              onRecordClick={handleRecordClick}
              emptyMessage={
                hasActiveFilters
                  ? 'No records match your search criteria'
                  : selectedState
                    ? 'Select a county on the map to view records'
                    : 'Select a state on the map to browse records'
              }
            />
          )}

          {/* Pagination */}
          {results.totalPages > 1 && (
            <div
              style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <button
                onClick={() => search({ page: results.page - 1 })}
                disabled={!results.hasPrev || loading.isRefreshing}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: results.hasPrev
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  cursor: results.hasPrev ? 'pointer' : 'not-allowed',
                  opacity: results.hasPrev ? 1 : 0.5,
                }}
              >
                ← Previous
              </button>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Page {results.page} of {results.totalPages}
              </span>

              <button
                onClick={() => search({ page: results.page + 1 })}
                disabled={!results.hasNext || loading.isRefreshing}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: results.hasNext
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  cursor: results.hasNext ? 'pointer' : 'not-allowed',
                  opacity: results.hasNext ? 1 : 0.5,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Record Detail Modal */}
      <RecordDetailModal
        record={selectedRecord}
        isOpen={selectedRecord !== null}
        onClose={clearSelection}
        userRole={role}
        accessTier={access.tier}
      />
    </div>
  );
};

export default RecordSearch;
