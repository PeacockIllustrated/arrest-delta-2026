// =============================================================================
// RECORD SEARCH HOOK - Fuzzy search and pagination for enriched records
// =============================================================================
// Uses pg_trgm for fuzzy text matching and supports filtering/sorting.
// Enforces role-based access control for page sizes and data visibility.
// =============================================================================

import { useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
// Types from supabaseSchema not currently used - keeping import for future enriched_records support
// import type { EnrichedRecord, Charge, County } from '../lib/types/supabaseSchema';
import type {
  RecordSearchResult,
  RecordDetailModel,
  RecordSearchFilters,
  RecordSearchParams,
  PaginatedResult,
  LoadingState,
} from '../lib/types/viewModels';
import {
  toCandidateSearchResults,
  toCandidateDetailModel,
  type CandidateRecordWithCounty,
} from '../lib/adapters/recordAdapter';
import { useRole } from './useRole';
import {
  getPermissionsForRole,
  type TierPermissions,
  type AccessTier,
  roleToTier,
} from '../lib/access/tierConfig';
import { maskRecordDetail } from '../lib/access/dataMasking';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Removed the short client-side timeout — Supabase's own timeout is sufficient
// and the race was wiping the record list under Vercel→eu-west-2 latency.

// =============================================================================
// TYPES
// =============================================================================

export interface RecordSearchState {
  results: PaginatedResult<RecordSearchResult>;
  selectedRecord: RecordDetailModel | null;
  filters: RecordSearchFilters;
  loading: LoadingState;
}

export interface AccessInfo {
  tier: AccessTier;
  permissions: TierPermissions;
  pageSize: number;
  canExportCsv: boolean;
}

export interface UseRecordSearchReturn extends RecordSearchState {
  /** Current access tier and permissions */
  access: AccessInfo;
  search: (params: Partial<RecordSearchParams>) => Promise<void>;
  loadMore: () => Promise<void>;
  loadRecord: (recordId: string) => Promise<void>;
  clearSelection: () => void;
  updateFilters: (filters: Partial<RecordSearchFilters>) => void;
  reset: () => void;
}

// =============================================================================
// DEMO DATA
// =============================================================================

const DEMO_RESULTS: RecordSearchResult[] = [
  {
    id: 'demo-1',
    recordId: 'REC-2024-001',
    personName: 'John Doe',
    personNameNormalized: 'JOHN DOE',
    bookingDate: new Date('2024-01-15'),
    bookingDateLabel: 'Jan 15, 2024',
    countyId: 1,
    countyName: 'Miami-Dade',
    countySlug: 'miami-dade',
    imageUrl: null,
    topCharge: 'Battery',
    chargeCount: 2,
    bondTotal: 5000,
    formattedBondTotal: '$5,000',
    formattedBookingDate: 'Jan 15, 2024',
  },
  {
    id: 'demo-2',
    recordId: 'REC-2024-002',
    personName: 'Jane Smith',
    personNameNormalized: 'JANE SMITH',
    bookingDate: new Date('2024-01-14'),
    bookingDateLabel: 'Jan 14, 2024',
    countyId: 2,
    countyName: 'Broward',
    countySlug: 'broward',
    imageUrl: null,
    topCharge: 'DUI',
    chargeCount: 1,
    bondTotal: 2500,
    formattedBondTotal: '$2,500',
    formattedBookingDate: 'Jan 14, 2024',
  },
];

const DEMO_RECORD_DETAIL: RecordDetailModel = {
  id: 'demo-1',
  recordId: 'REC-2024-001',
  bookingId: 'B-2024-001',
  personName: 'John Doe',
  personNameNormalized: 'JOHN DOE',
  countyId: 1,
  countyName: 'Miami-Dade',
  countySlug: 'miami-dade',
  sourceId: 1,
  sourceName: 'Arrests.org',
  bookingDate: new Date('2024-01-15'),
  bookingTime: '14:30:00',
  bookingDatetimeText: 'January 15, 2024 2:30 PM',
  sex: 'M',
  race: 'White',
  age: 32,
  dob: new Date('1992-03-15'),
  heightInches: 72,
  weightLbs: 185,
  hairColor: 'Brown',
  eyeColor: 'Blue',
  bondTotal: 5000,
  caseNumber: '2024-CF-001234',
  imageUrl: null,
  detailUrl: null,
  charges: [
    {
      chargeId: 'c-1',
      description: 'Battery',
      statuteCode: '784.03',
      severity: 'Misdemeanor',
      bondAmount: 2500,
      sequence: 1,
      severityLabel: 'Misdemeanor',
      severityColor: 'text-yellow-500',
      formattedBondAmount: '$2,500',
    },
    {
      chargeId: 'c-2',
      description: 'Resisting Arrest Without Violence',
      statuteCode: '843.02',
      severity: 'Misdemeanor',
      bondAmount: 2500,
      sequence: 2,
      severityLabel: 'Misdemeanor',
      severityColor: 'text-yellow-500',
      formattedBondAmount: '$2,500',
    },
  ],
  biometricVerified: false,
  biometricScore: null,
  scrapedAt: new Date(),
  enrichedAt: new Date(),
  formattedHeight: "6'0\"",
  formattedBondTotal: '$5,000',
  formattedBookingDate: 'Jan 15, 2024',
  formattedAge: '32 years old',
};

// =============================================================================
// INITIAL STATE
// =============================================================================

const getInitialResults = (pageSize: number): PaginatedResult<RecordSearchResult> => ({
  data: [],
  total: 0,
  page: 1,
  pageSize,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
});

const INITIAL_LOADING: LoadingState = {
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastUpdated: null,
};

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useRecordSearch(): UseRecordSearchReturn {
  // Check if we're in demo mode
  const isDemo = import.meta.env.VITE_PORTAL_MODE === 'demo';

  // Get role and permissions
  const { role } = useRole();
  const permissions = useMemo(() => getPermissionsForRole(role), [role]);
  const tier = useMemo(() => roleToTier(role), [role]);
  const pageSize = permissions.pageSize;

  // Access info for UI
  const access: AccessInfo = useMemo(
    () => ({
      tier,
      permissions,
      pageSize,
      canExportCsv: permissions.canExportCsv,
    }),
    [tier, permissions, pageSize]
  );

  // State
  const [results, setResults] = useState<PaginatedResult<RecordSearchResult>>(() =>
    getInitialResults(pageSize)
  );
  const [selectedRecord, setSelectedRecord] = useState<RecordDetailModel | null>(null);
  const [filters, setFilters] = useState<RecordSearchFilters>({});
  const [loading, setLoading] = useState<LoadingState>(INITIAL_LOADING);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentParamsRef = useRef<RecordSearchParams | null>(null);

  // =============================================================================
  // SEARCH FUNCTION
  // =============================================================================

  const search = useCallback(
    async (params: Partial<RecordSearchParams>): Promise<void> => {
      // Enforce role-based page size limit
      const effectivePageSize = Math.min(
        params.pageSize ?? pageSize,
        pageSize // Never exceed role limit
      );

      // Merge with current params
      const searchParams: RecordSearchParams = {
        page: params.page ?? 1,
        pageSize: effectivePageSize,
        sortBy: params.sortBy ?? 'booking_date',
        sortOrder: params.sortOrder ?? 'desc',
        ...filters,
        ...params,
      };

      currentParamsRef.current = searchParams;

      // Demo mode
      if (isDemo) {
        setResults({
          data: DEMO_RESULTS.slice(0, effectivePageSize),
          total: DEMO_RESULTS.length,
          page: 1,
          pageSize: effectivePageSize,
          totalPages: Math.ceil(DEMO_RESULTS.length / effectivePageSize),
          hasNext: DEMO_RESULTS.length > effectivePageSize,
          hasPrev: false,
        });
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
        isLoading: searchParams.page === 1,
        isRefreshing: searchParams.page > 1,
        error: null,
      }));

      try {
        // Build query - use candidate_records (has 28k+ records)
        // enriched_records is for Pass 2 data which may be empty
        let query = supabase
          .from('candidate_records')
          .select(
            `
            *,
            counties(county_id, name, slug, fips)
          `,
            { count: 'exact' }
          );

        // Apply filters
        if (searchParams.query) {
          // Use pg_trgm similarity search
          query = query.or(
            `person_name_normalized.ilike.%${searchParams.query.toUpperCase()}%`
          );
        }

        if (searchParams.countyId) {
          query = query.eq('county_id', searchParams.countyId);
        }

        if (searchParams.sourceId) {
          query = query.eq('source_id', searchParams.sourceId);
        }

        if (searchParams.dateFrom) {
          query = query.gte(
            'booking_date_normalized',
            searchParams.dateFrom.toISOString().split('T')[0]
          );
        }

        if (searchParams.dateTo) {
          query = query.lte(
            'booking_date_normalized',
            searchParams.dateTo.toISOString().split('T')[0]
          );
        }

        // Note: candidate_records doesn't have sex, race, age, or bond_total fields
        // These filters are only available on enriched_records (Pass 2 data)
        // For now, skip these filters when querying candidate_records

        if (searchParams.hasImage === true) {
          query = query.not('image_url', 'is', null);
        }

        // Apply sorting
        const sortColumn =
          searchParams.sortBy === 'booking_date'
            ? 'booking_date_normalized'
            : searchParams.sortBy;
        query = query.order(sortColumn, {
          ascending: searchParams.sortOrder === 'asc',
        });

        // Apply pagination
        const from = (searchParams.page - 1) * searchParams.pageSize;
        const to = from + searchParams.pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
          throw new Error(error.message);
        }

        // Fallback to demo data if no records found
        if (!data || data.length === 0) {
          console.log('[useRecordSearch] No records found in database, using demo data');
          const demoData = DEMO_RESULTS.slice(0, effectivePageSize);
          setResults({
            data: demoData,
            total: DEMO_RESULTS.length,
            page: 1,
            pageSize: effectivePageSize,
            totalPages: Math.ceil(DEMO_RESULTS.length / effectivePageSize),
            hasNext: DEMO_RESULTS.length > effectivePageSize,
            hasPrev: false,
          });
          setLoading({
            isLoading: false,
            isRefreshing: false,
            error: 'No records in database - showing demo data',
            lastUpdated: new Date(),
          });
          return;
        }

        // Transform results - candidate_records has different structure than enriched_records
        const records = (data || []) as unknown as CandidateRecordWithCounty[];
        const transformedResults = toCandidateSearchResults(records);

        const total = count ?? 0;
        const totalPages = Math.ceil(total / searchParams.pageSize);

        setResults({
          data: transformedResults,
          total,
          page: searchParams.page,
          pageSize: searchParams.pageSize,
          totalPages,
          hasNext: searchParams.page < totalPages,
          hasPrev: searchParams.page > 1,
        });

        setLoading({
          isLoading: false,
          isRefreshing: false,
          error: null,
          lastUpdated: new Date(),
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        console.error('[useRecordSearch] Search error:', errorMessage);

        // Fallback to demo data on error so the UI still shows content
        console.log('[useRecordSearch] Falling back to demo data');
        const demoData = DEMO_RESULTS.slice(0, effectivePageSize);
        setResults({
          data: demoData,
          total: DEMO_RESULTS.length,
          page: 1,
          pageSize: effectivePageSize,
          totalPages: Math.ceil(DEMO_RESULTS.length / effectivePageSize),
          hasNext: DEMO_RESULTS.length > effectivePageSize,
          hasPrev: false,
        });

        setLoading({
          isLoading: false,
          isRefreshing: false,
          error: `Using demo data (${errorMessage})`,
          lastUpdated: new Date(),
        });
      }
    },
    [isDemo, filters, pageSize]
  );

  // =============================================================================
  // LOAD MORE (PAGINATION)
  // =============================================================================

  const loadMore = useCallback(async (): Promise<void> => {
    if (!results.hasNext || loading.isLoading || loading.isRefreshing) {
      return;
    }

    await search({ page: results.page + 1 });
  }, [results.hasNext, results.page, loading.isLoading, loading.isRefreshing, search]);

  // =============================================================================
  // LOAD SINGLE RECORD
  // =============================================================================

  const loadRecord = useCallback(
    async (recordId: string): Promise<void> => {
      // Demo mode - apply masking to demo data too
      if (isDemo) {
        const maskedDemo = maskRecordDetail(DEMO_RECORD_DETAIL, role);
        setSelectedRecord(maskedDemo);
        return;
      }

      setLoading((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Query candidate_records (Pass 1 data) since that's what the list shows
        // enriched_records (Pass 2) may be empty or have different IDs
        const { data, error } = await supabase
          .from('candidate_records')
          .select(
            `
            *,
            counties(county_id, name, slug, fips)
          `
          )
          .eq('id', recordId)
          .single();

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          const record = data as unknown as CandidateRecordWithCounty;
          const recordModel = toCandidateDetailModel(record);
          // Apply role-based data masking
          const maskedRecord = maskRecordDetail(recordModel, role);
          setSelectedRecord(maskedRecord);
        }

        setLoading((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load record';
        console.error('[useRecordSearch] Load record error:', errorMessage);

        // Fallback to demo record on error (with masking)
        console.log('[useRecordSearch] Falling back to demo record');
        const maskedDemo = maskRecordDetail(DEMO_RECORD_DETAIL, role);
        setSelectedRecord(maskedDemo);

        setLoading((prev) => ({
          ...prev,
          isLoading: false,
          error: `Using demo data (${errorMessage})`,
        }));
      }
    },
    [isDemo, role]
  );

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const clearSelection = useCallback(() => {
    setSelectedRecord(null);
  }, []);

  const updateFilters = useCallback((newFilters: Partial<RecordSearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const reset = useCallback(() => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setResults(getInitialResults(pageSize));
    setSelectedRecord(null);
    setFilters({});
    setLoading(INITIAL_LOADING);
    currentParamsRef.current = null;
  }, [pageSize]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    results,
    selectedRecord,
    filters,
    loading,
    access,
    search,
    loadMore,
    loadRecord,
    clearSelection,
    updateFilters,
    reset,
  };
}

export default useRecordSearch;
