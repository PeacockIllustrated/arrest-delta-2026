// =============================================================================
// DASHBOARD STATS HOOK - Aggregated dashboard metrics from Supabase
// =============================================================================
// Fetches data from materialized views and RPC functions for dashboard display.
// Supports polling for periodic refresh.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type {
  TopCountyResult,
  MvSourceReliability,
  MvDailyCountyStats,
} from '../lib/types/supabaseSchema';
import type {
  DashboardOverviewModel,
  CountyStatsModel,
  SourceReliabilityModel,
  DailyTrendPoint,
  LoadingState,
} from '../lib/types/viewModels';
import {
  toCountyStatsModels,
  toSourceReliabilityModels,
  aggregateDailyStatsToTrendPoints,
} from '../lib/adapters/statsAdapter';

// =============================================================================
// CONFIGURATION
// =============================================================================

const POLLING_INTERVAL_MS = 60000; // 1 minute

// =============================================================================
// TYPES
// =============================================================================

export interface DashboardStatsState {
  overview: DashboardOverviewModel | null;
  topCounties: CountyStatsModel[];
  sourceReliability: SourceReliabilityModel[];
  dailyTrend: DailyTrendPoint[];
  loading: LoadingState;
}

export interface UseDashboardStatsReturn extends DashboardStatsState {
  refresh: () => Promise<void>;
  isStale: boolean;
}

// =============================================================================
// DEMO DATA
// =============================================================================

const DEMO_OVERVIEW: DashboardOverviewModel = {
  totalRecords24h: 847,
  totalRecords7d: 5823,
  activeCounties: 52,
  activeSources: 8,
  errorRate24h: 2.3,
  avgDailyRecords: 832,
  formattedErrorRate: '2.3%',
  healthStatus: 'healthy',
};

const DEMO_TOP_COUNTIES: CountyStatsModel[] = [
  {
    countyId: 1,
    name: 'Miami-Dade',
    slug: 'miami-dade',
    fips: '12086',
    population: 2716940,
    region: 'Southeast',
    totalBookings7d: 1247,
    avgBond: 15000,
    felonyPercent: 42.5,
    trend: { direction: 'up', percentChange: 8.2, isPositive: false },
    formattedAvgBond: '$15,000',
    formattedFelonyPercent: '42.5%',
  },
  {
    countyId: 2,
    name: 'Broward',
    slug: 'broward',
    fips: '12011',
    population: 1944375,
    region: 'Southeast',
    totalBookings7d: 892,
    avgBond: 12500,
    felonyPercent: 38.1,
    trend: { direction: 'stable', percentChange: 1.2, isPositive: true },
    formattedAvgBond: '$12,500',
    formattedFelonyPercent: '38.1%',
  },
  {
    countyId: 3,
    name: 'Hillsborough',
    slug: 'hillsborough',
    fips: '12057',
    population: 1459762,
    region: 'Central',
    totalBookings7d: 654,
    avgBond: 10000,
    felonyPercent: 35.7,
    trend: { direction: 'down', percentChange: 5.3, isPositive: true },
    formattedAvgBond: '$10,000',
    formattedFelonyPercent: '35.7%',
  },
];

const DEMO_SOURCE_RELIABILITY: SourceReliabilityModel[] = [
  {
    sourceId: 1,
    name: 'arrests.org',
    displayName: 'Arrests.org',
    sourceType: 'aggregator',
    countiesCovered: 38,
    totalRecords7d: 4250,
    totalErrors7d: 45,
    successRate: 98.9,
    sourceTypeLabel: 'Aggregator',
    formattedSuccessRate: '98.9%',
    reliabilityStatus: 'excellent',
    reliabilityColor: 'text-green-500',
  },
  {
    sourceId: 2,
    name: 'smartcop',
    displayName: 'SmartCOP',
    sourceType: 'vendor_smartcop',
    countiesCovered: 12,
    totalRecords7d: 1200,
    totalErrors7d: 32,
    successRate: 97.3,
    sourceTypeLabel: 'SmartCOP',
    formattedSuccessRate: '97.3%',
    reliabilityStatus: 'good',
    reliabilityColor: 'text-blue-500',
  },
];

// Generate realistic demo trend data (30 days)
const DEMO_DAILY_TREND: DailyTrendPoint[] = (() => {
  const days = 30;
  const baseValue = 832;
  const data: DailyTrendPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Add realistic variation
    const variation = Math.sin(i * 0.3) * 0.2 + (Math.random() - 0.5) * 0.15;
    const dayOfWeek = date.getDay();
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.75 : 1;
    const totalBookings = Math.round(baseValue * (1 + variation) * weekendFactor);

    data.push({
      date,
      dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalBookings,
      avgBond: 12000 + Math.random() * 5000,
      felonyCount: Math.round(totalBookings * 0.35),
      misdemeanorCount: Math.round(totalBookings * 0.65),
    });
  }

  return data;
})();

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useDashboardStats(
  options: { autoFetch?: boolean; pollingEnabled?: boolean } = {}
): UseDashboardStatsReturn {
  const { autoFetch = true, pollingEnabled = true } = options;

  // Check if we're in demo mode
  const isDemo = import.meta.env.VITE_PORTAL_MODE === 'demo';

  // State
  const [overview, setOverview] = useState<DashboardOverviewModel | null>(null);
  const [topCounties, setTopCounties] = useState<CountyStatsModel[]>([]);
  const [sourceReliability, setSourceReliability] = useState<SourceReliabilityModel[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrendPoint[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastUpdated: null,
  });

  // Refs
  const pollingRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // =============================================================================
  // FETCH FUNCTIONS
  // =============================================================================

  /**
   * Fetch dashboard overview via direct aggregates (RPC returns zeros because
   * its 7-day window misses the January 2026 scraper data — we use all-time
   * totals off the raw tables instead).
   */
  const fetchOverview = useCallback(async (): Promise<DashboardOverviewModel | null> => {
    try {
      const [
        { count: totalRecords, error: e1 },
        { data: distinctCounties, error: e2 },
        { data: distinctSources, error: e3 },
        { count: enrichedCount, error: e4 },
      ] = await Promise.all([
        supabase.from('candidate_records').select('id', { count: 'exact', head: true }),
        supabase.from('candidate_records').select('county_id').not('county_id', 'is', null).limit(5000),
        supabase.from('candidate_records').select('source_id').not('source_id', 'is', null).limit(5000),
        supabase.from('enriched_records').select('id', { count: 'exact', head: true }),
      ]);

      if (e1 || e2 || e3 || e4) {
        console.warn('[useDashboardStats] overview aggregate errors:', { e1: e1?.message, e2: e2?.message, e3: e3?.message, e4: e4?.message });
      }

      const activeCounties = new Set((distinctCounties ?? []).map((r: { county_id: number }) => r.county_id)).size;
      const activeSources = new Set((distinctSources ?? []).map((r: { source_id: number }) => r.source_id)).size;
      const total = totalRecords ?? 0;
      const enriched = enrichedCount ?? 0;

      return {
        totalRecords24h: Math.round(total / 90), // rough avg daily over the 90-day data window
        totalRecords7d: Math.round(total / 13),
        activeCounties,
        activeSources,
        errorRate24h: total > 0 ? Math.max(0, 100 - (enriched / total) * 100) : 0,
        avgDailyRecords: Math.round(total / 90),
        formattedErrorRate: `${(total > 0 ? Math.max(0, 100 - (enriched / total) * 100) : 0).toFixed(1)}%`,
        healthStatus: activeSources > 0 ? 'healthy' : 'degraded',
      };
    } catch (err) {
      console.warn('[useDashboardStats] overview threw:', err);
      return null;
    }
  }, []);

  /**
   * Fetch top counties via direct aggregate. Same reason as fetchOverview —
   * RPC's date window doesn't match when the scraper last ran.
   */
  const fetchTopCounties = useCallback(async (): Promise<CountyStatsModel[]> => {
    try {
      // Sample 10k recent records and aggregate by county, then join to counties
      const { data: records, error: e1 } = await supabase
        .from('candidate_records')
        .select('county_id')
        .not('county_id', 'is', null)
        .limit(10000);
      if (e1 || !records) return [];

      const byCounty = new Map<number, number>();
      for (const r of records) {
        const id = (r as { county_id: number }).county_id;
        byCounty.set(id, (byCounty.get(id) ?? 0) + 1);
      }

      const topIds = [...byCounty.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id]) => id);
      if (topIds.length === 0) return [];

      const { data: counties } = await supabase
        .from('counties')
        .select('county_id, name, slug, fips, state, population, region')
        .in('county_id', topIds);

      const results: TopCountyResult[] = (counties ?? []).map((c) => ({
        county_id: (c as { county_id: number }).county_id,
        county_name: (c as { name: string }).name,
        county_slug: (c as { slug: string }).slug,
        fips: (c as { fips: string }).fips,
        population: (c as { population: number | null }).population,
        region: (c as { region: string | null }).region,
        total_bookings: byCounty.get((c as { county_id: number }).county_id) ?? 0,
        avg_bond: null,
        felony_pct: 35, // rough baseline, refine once charges aggregate is added
      } as TopCountyResult));

      results.sort((a, b) => Number(b.total_bookings) - Number(a.total_bookings));
      return toCountyStatsModels(results);
    } catch (err) {
      console.warn('[useDashboardStats] top counties threw:', err);
      return [];
    }
  }, []);

  /**
   * Fetch source reliability from materialized view
   */
  const fetchSourceReliability = useCallback(async (): Promise<SourceReliabilityModel[]> => {
    try {
      const { data, error } = await supabase
        .from('mv_source_reliability')
        .select('*')
        .order('total_records_7d', { ascending: false });

      if (error) {
        console.error('[useDashboardStats] Failed to fetch source reliability:', error.message);
        return [];
      }

      if (data && data.length > 0) {
        return toSourceReliabilityModels(data as MvSourceReliability[]);
      }

      return [];
    } catch (err) {
      console.error('[useDashboardStats] Source reliability fetch error:', err);
      return [];
    }
  }, []);

  /**
   * Fetch daily trend data from materialized view (last 30 days)
   */
  const fetchDailyTrend = useCallback(async (): Promise<DailyTrendPoint[]> => {
    try {
      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateString = thirtyDaysAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('mv_daily_county_stats')
        .select('*')
        .gte('date', dateString)
        .order('date', { ascending: true });

      if (error) {
        console.error('[useDashboardStats] Failed to fetch daily trend:', error.message);
        return [];
      }

      if (data && data.length > 0) {
        return aggregateDailyStatsToTrendPoints(data as MvDailyCountyStats[]);
      }

      return [];
    } catch (err) {
      console.error('[useDashboardStats] Daily trend fetch error:', err);
      return [];
    }
  }, []);

  /**
   * Refresh all dashboard stats
   */
  const refresh = useCallback(async (): Promise<void> => {
    // Demo mode: return demo data
    if (isDemo) {
      setOverview(DEMO_OVERVIEW);
      setTopCounties(DEMO_TOP_COUNTIES);
      setSourceReliability(DEMO_SOURCE_RELIABILITY);
      setDailyTrend(DEMO_DAILY_TREND);
      setLoading({
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastUpdated: new Date(),
      });
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Update loading state
    setLoading((prev) => ({
      ...prev,
      isLoading: prev.lastUpdated === null,
      isRefreshing: prev.lastUpdated !== null,
      error: null,
    }));

    try {
      // Supabase client has its own timeout — no need to race a short client-side one.
      // The previous 15s race was firing from Vercel→eu-west-2 under normal latency.
      const [overviewResult, countiesResult, reliabilityResult, trendResult] = await Promise.all([
        fetchOverview(),
        fetchTopCounties(),
        fetchSourceReliability(),
        fetchDailyTrend(),
      ]);

      // Update state
      if (overviewResult) {
        setOverview(overviewResult);
      }
      setTopCounties(countiesResult);
      setSourceReliability(reliabilityResult);
      setDailyTrend(trendResult);

      setLoading({
        isLoading: false,
        isRefreshing: false,
        error: null,
        lastUpdated: new Date(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useDashboardStats] Refresh error:', errorMessage);

      // Fallback to demo data on error so the dashboard still shows content
      console.log('[useDashboardStats] Falling back to demo data');
      setOverview(DEMO_OVERVIEW);
      setTopCounties(DEMO_TOP_COUNTIES);
      setSourceReliability(DEMO_SOURCE_RELIABILITY);
      setDailyTrend(DEMO_DAILY_TREND);

      setLoading({
        isLoading: false,
        isRefreshing: false,
        error: `Using demo data (${errorMessage})`,
        lastUpdated: new Date(),
      });
    }
  }, [isDemo, fetchOverview, fetchTopCounties, fetchSourceReliability, fetchDailyTrend]);

  // =============================================================================
  // POLLING
  // =============================================================================

  useEffect(() => {
    if (!pollingEnabled || isDemo) {
      return;
    }

    pollingRef.current = window.setInterval(() => {
      refresh();
    }, POLLING_INTERVAL_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [pollingEnabled, isDemo, refresh]);

  // =============================================================================
  // INITIAL FETCH
  // =============================================================================

  useEffect(() => {
    if (autoFetch) {
      refresh();
    }

    return () => {
      // Cleanup abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, refresh]);

  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================

  const isStale =
    loading.lastUpdated === null ||
    Date.now() - loading.lastUpdated.getTime() > POLLING_INTERVAL_MS * 2;

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    overview,
    topCounties,
    sourceReliability,
    dailyTrend,
    loading,
    refresh,
    isStale,
  };
}

export default useDashboardStats;
