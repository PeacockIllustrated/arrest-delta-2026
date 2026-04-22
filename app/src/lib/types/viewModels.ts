/**
 * UI View Models
 *
 * These types are optimized for React components and UI rendering.
 * They are transformed from raw database types via adapters.
 */

import type {
  ChargeSeverity,
  ErrorCategory,
  ErrorSeverityLevel,
  SourceType,
} from './supabaseSchema';

// ============================================================================
// DASHBOARD OVERVIEW
// ============================================================================

export interface DashboardOverviewModel {
  totalRecords24h: number;
  totalRecords7d: number;
  activeCounties: number;
  activeSources: number;
  errorRate24h: number;
  avgDailyRecords: number;
  // Computed display values
  formattedErrorRate: string;
  healthStatus: 'healthy' | 'degraded' | 'critical';
}

export interface TrendDirection {
  direction: 'up' | 'down' | 'stable';
  percentChange: number;
  isPositive: boolean;
}

// ============================================================================
// COUNTY MODELS
// ============================================================================

export interface CountyModel {
  countyId: number;
  name: string;
  slug: string;
  fips: string;
  /** US state abbreviation (e.g. 'FL', 'CA'). Optional — only populated from live DB. */
  state?: string | null;
  population: number | null;
  region: string | null;
}

export interface CountyStatsModel extends CountyModel {
  totalBookings7d: number;
  avgBond: number | null;
  felonyPercent: number | null;
  trend: TrendDirection;
  // Display values
  formattedAvgBond: string;
  formattedFelonyPercent: string;
}

export interface CountyDetailModel extends CountyStatsModel {
  // Sources for this county
  sources: CountySourceModel[];
  // Demographics breakdown
  demographics: DemographicsBreakdown;
  // Daily trend data (30 days)
  dailyTrend: DailyTrendPoint[];
  // Charge distribution
  chargeDistribution: ChargeDistributionItem[];
}

export interface CountySourceModel {
  sourceId: number;
  name: string;
  displayName: string;
  sourceType: SourceType;
  isPrimary: boolean;
  isActive: boolean;
  reliability: number;
  hasBookingTime: boolean;
  hasMugshots: boolean;
  lastVerified: Date | null;
}

export interface DemographicsBreakdown {
  bySex: { label: string; count: number; percent: number }[];
  byRace: { label: string; count: number; percent: number }[];
  byAgeGroup: { label: string; count: number; percent: number }[];
}

export interface DailyTrendPoint {
  date: Date;
  dateLabel: string;
  totalBookings: number;
  avgBond: number | null;
  felonyCount: number;
  misdemeanorCount: number;
}

export interface ChargeDistributionItem {
  statuteCode: string | null;
  description: string;
  severity: ChargeSeverity | null;
  count: number;
  percent: number;
  avgBond: number | null;
}

// ============================================================================
// RECORD MODELS
// ============================================================================

export interface RecordSearchResult {
  id: string;
  recordId: string;
  personName: string;
  personNameNormalized: string;
  bookingDate: Date | null;
  bookingDateLabel: string;
  countyId: number;
  countyName: string;
  countySlug: string;
  imageUrl: string | null;
  topCharge: string | null;
  chargeCount: number;
  bondTotal: number | null;
  // Display values
  formattedBondTotal: string;
  formattedBookingDate: string;
}

export interface RecordDetailModel {
  id: string;
  recordId: string;
  bookingId: string | null;
  // Identity
  personName: string;
  personNameNormalized: string;
  // Location
  countyId: number;
  countyName: string;
  countySlug: string;
  sourceId: number;
  sourceName: string;
  // Booking
  bookingDate: Date | null;
  bookingTime: string | null;
  bookingDatetimeText: string | null;
  // Physical description
  sex: string | null;
  race: string | null;
  age: number | null;
  dob: Date | null;
  heightInches: number | null;
  weightLbs: number | null;
  hairColor: string | null;
  eyeColor: string | null;
  // Financial
  bondTotal: number | null;
  caseNumber: string | null;
  // Media
  imageUrl: string | null;
  detailUrl: string | null;
  // Charges
  charges: ChargeModel[];
  // Biometric
  biometricVerified: boolean;
  biometricScore: number | null;
  // Metadata
  scrapedAt: Date;
  enrichedAt: Date;
  // Computed display values
  formattedHeight: string | null;
  formattedBondTotal: string;
  formattedBookingDate: string;
  formattedAge: string | null;
}

export interface ChargeModel {
  chargeId: string;
  description: string;
  statuteCode: string | null;
  severity: ChargeSeverity | null;
  bondAmount: number | null;
  sequence: number;
  // Display values
  severityLabel: string;
  severityColor: string;
  formattedBondAmount: string;
}

// ============================================================================
// PIPELINE & ERROR MODELS
// ============================================================================

export interface PipelineRunModel {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  metadata: Record<string, unknown>;
  // Display values
  statusColor: string;
  statusIcon: string;
  formattedDuration: string;
  formattedStartedAt: string;
}

export interface PipelineHealthModel {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  runningCount: number;
  completedLast24h: number;
  failedLast24h: number;
  successRate: number;
  avgDurationSeconds: number | null;
  lastCompletedRun: Date | null;
  recentRuns: PipelineRunModel[];
  hourlyStats: HourlyPipelineStat[];
}

export interface HourlyPipelineStat {
  hour: Date;
  hourLabel: string;
  runCount: number;
  status: string;
  avgDurationSeconds: number | null;
}

export interface ErrorEventModel {
  errorId: string;
  timestamp: Date;
  timestampLabel: string;
  category: ErrorCategory;
  code: string;
  severity: ErrorSeverityLevel;
  countyId: number | null;
  countyName: string | null;
  sourceId: number | null;
  sourceName: string | null;
  message: string;
  handlerName: string | null;
  isRetryable: boolean;
  retryCount: number;
  // Display values
  severityColor: string;
  categoryIcon: string;
  shortMessage: string;
}

export interface ErrorSummaryModel {
  category: ErrorCategory;
  code: string;
  severity: ErrorSeverityLevel;
  count: number;
  affectedRuns: number;
  affectedCounties: number;
  lastOccurred: Date;
  // Display values
  categoryLabel: string;
  severityColor: string;
}

// ============================================================================
// SOURCE MODELS
// ============================================================================

export interface SourceReliabilityModel {
  sourceId: number;
  name: string;
  displayName: string;
  sourceType: SourceType;
  countiesCovered: number;
  totalRecords7d: number;
  totalErrors7d: number;
  successRate: number;
  // Display values
  sourceTypeLabel: string;
  formattedSuccessRate: string;
  reliabilityStatus: 'excellent' | 'good' | 'fair' | 'poor';
  reliabilityColor: string;
}

// ============================================================================
// SEARCH & FILTER MODELS
// ============================================================================

export interface RecordSearchFilters {
  query?: string;
  countyId?: number;
  sourceId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  severity?: ChargeSeverity;
  sex?: string;
  race?: string;
  ageMin?: number;
  ageMax?: number;
  bondMin?: number;
  bondMax?: number;
  hasImage?: boolean;
}

export interface RecordSearchParams extends RecordSearchFilters {
  page: number;
  pageSize: number;
  sortBy: 'booking_date' | 'person_name' | 'bond_total' | 'county_id';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// REALTIME SUBSCRIPTION PAYLOADS
// ============================================================================

export interface RealtimeRunUpdate {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  run: PipelineRunModel;
}

export interface RealtimeErrorUpdate {
  type: 'INSERT';
  error: ErrorEventModel;
}

// ============================================================================
// CHART DATA MODELS
// ============================================================================

export interface TimeSeriesPoint {
  date: Date;
  label: string;
  value: number;
}

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  data: TimeSeriesPoint[];
}

export interface PieChartSlice {
  id: string;
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface BarChartBar {
  label: string;
  value: number;
  color?: string;
  secondaryValue?: number;
  secondaryLabel?: string;
}

// ============================================================================
// UI STATE MODELS
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface DataWithLoadingState<T> {
  data: T | null;
  loading: LoadingState;
}

// ============================================================================
// DEMO MODE DATA STRUCTURE
// ============================================================================

export interface DemoDataSet {
  overview: DashboardOverviewModel;
  counties: CountyStatsModel[];
  recentRecords: RecordSearchResult[];
  pipelineHealth: PipelineHealthModel;
  recentErrors: ErrorEventModel[];
  sourceReliability: SourceReliabilityModel[];
}
