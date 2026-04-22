// =============================================================================
// RECORD ADAPTER - Transforms database records to UI ViewModels
// =============================================================================
// INVARIANT: UI components MUST consume adapter output, never raw DB types.
// =============================================================================

import type {
  EnrichedRecord,
  Charge,
  County,
  Source,
  ChargeSeverity,
} from '../types/supabaseSchema';

import type {
  RecordSearchResult,
  RecordDetailModel,
  ChargeModel,
  CountyModel,
} from '../types/viewModels';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format a monetary value as USD currency string
 */
function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a date as a readable string
 */
function formatDate(dateStr: string | null, includeTime = false): string {
  if (!dateStr) return 'Unknown';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Unknown';

    if (includeTime) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}

/**
 * Parse a date string into a Date object
 */
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Format height in inches to feet/inches string
 */
function formatHeight(inches: number | null): string | null {
  if (!inches || inches <= 0) return null;
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}

/**
 * Get color for charge severity
 */
function getSeverityColor(severity: ChargeSeverity | null): string {
  switch (severity) {
    case 'Felony':
      return 'text-red-500';
    case 'Misdemeanor':
      return 'text-yellow-500';
    case 'Infraction':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get human-readable label for charge severity
 */
function getSeverityLabel(severity: ChargeSeverity | null): string {
  if (!severity || severity === 'Unknown') return 'Unknown';
  return severity;
}

// =============================================================================
// CHARGE ADAPTERS
// =============================================================================

/**
 * Transform a raw Charge row to ChargeModel
 */
export function toChargeModel(charge: Charge): ChargeModel {
  return {
    chargeId: charge.charge_id,
    description: charge.description,
    statuteCode: charge.statute_code,
    severity: charge.severity,
    bondAmount: charge.bond_amount,
    sequence: charge.sequence,
    // Display values
    severityLabel: getSeverityLabel(charge.severity),
    severityColor: getSeverityColor(charge.severity),
    formattedBondAmount: formatCurrency(charge.bond_amount),
  };
}

/**
 * Transform multiple charge rows to ChargeModels
 */
export function toChargeModels(charges: Charge[]): ChargeModel[] {
  return charges.map(toChargeModel).sort((a, b) => a.sequence - b.sequence);
}

// =============================================================================
// COUNTY ADAPTERS
// =============================================================================

/**
 * Transform a raw County row to CountyModel
 */
export function toCountyModel(county: County): CountyModel {
  return {
    countyId: county.county_id,
    name: county.name,
    slug: county.slug,
    fips: county.fips,
    state: county.state ?? null,
    population: county.population,
    region: county.region,
  };
}

// =============================================================================
// RECORD SEARCH RESULT ADAPTER
// =============================================================================

/**
 * Join type for enriched record with county info
 */
export interface EnrichedRecordWithCounty extends EnrichedRecord {
  counties?: County | null;
  charges?: Charge[];
}

/**
 * Candidate record from candidate_records table (Pass 1 data)
 * Has charges_preview array instead of separate charges table
 */
export interface CandidateRecordWithCounty {
  id: string;
  record_id: string;
  booking_id: string | null;
  source_id: number | null;
  county_id: number | null;
  person_name: string;
  person_name_normalized: string;
  booking_datetime_text: string | null;
  booking_date_normalized: string | null;
  booking_time: string | null;
  charges_preview: string[] | null;
  charges_count: number | null;
  detail_url: string | null;
  image_url: string | null;
  scraped_at: string;
  expires_at: string;
  is_duplicate: boolean | null;
  counties?: County | null;
}

/**
 * Transform a candidate record to RecordSearchResult
 */
export function toCandidateSearchResult(
  record: CandidateRecordWithCounty
): RecordSearchResult {
  try {
    // Use booking_date_normalized if available, otherwise fall back to scraped_at
    // (scraped_at is always populated and is typically within 24-48h of booking)
    const dateSource = record.booking_date_normalized || record.scraped_at?.split('T')[0];
    const bookingDate = parseDate(dateSource);
    const chargeCount = record.charges_count ?? record.charges_preview?.length ?? 0;
    const topCharge = record.charges_preview?.[0] ?? null;

    return {
      id: record.id,
      recordId: record.record_id,
      personName: record.person_name,
      personNameNormalized: record.person_name_normalized,
      bookingDate,
      bookingDateLabel: formatDate(dateSource),
      countyId: record.county_id ?? 0,
      countyName: record.counties?.name ?? 'Unknown County',
      countySlug: record.counties?.slug ?? 'unknown',
      imageUrl: record.image_url,
      topCharge,
      chargeCount,
      bondTotal: null, // candidate_records doesn't have bond info
      // Display values
      formattedBondTotal: 'N/A',
      formattedBookingDate: formatDate(dateSource),
    };
  } catch (err) {
    console.error('[recordAdapter] Failed to parse candidate result:', record.id, err);
    return {
      id: record.id || 'unknown',
      recordId: record.record_id || 'unknown',
      personName: record.person_name || 'Parse Error',
      personNameNormalized: record.person_name_normalized || '',
      bookingDate: null,
      bookingDateLabel: 'Unknown',
      countyId: 0,
      countyName: 'Unknown',
      countySlug: 'unknown',
      imageUrl: null,
      topCharge: null,
      chargeCount: 0,
      bondTotal: null,
      formattedBondTotal: 'N/A',
      formattedBookingDate: 'Unknown',
    };
  }
}

/**
 * Transform multiple candidate records to RecordSearchResults
 */
export function toCandidateSearchResults(
  records: CandidateRecordWithCounty[]
): RecordSearchResult[] {
  return records.map(toCandidateSearchResult);
}

/**
 * Transform a candidate record to RecordDetailModel
 * Used when viewing details of Pass 1 data (before enrichment)
 * Many fields will be null since candidate_records don't have enriched data
 */
export function toCandidateDetailModel(
  record: CandidateRecordWithCounty
): RecordDetailModel {
  try {
    // Use booking_date_normalized if available, otherwise fall back to scraped_at
    const dateSource = record.booking_date_normalized || record.scraped_at?.split('T')[0];

    // Extract booking time from booking_datetime_text if booking_time is null
    // Format: "1/23 5:05 am" or "1/21 8:25 pm"
    // Note: Current migration only stores date portion, so time extraction may fail
    let bookingTime = record.booking_time;
    if (!bookingTime && record.booking_datetime_text) {
      const timeMatch = record.booking_datetime_text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === 'pm' && hours !== 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        bookingTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    }
    const bookingDate = parseDate(dateSource);
    const scrapedAt = parseDate(record.scraped_at) ?? new Date();

    // Convert charges_preview strings to ChargeModel array
    const charges: ChargeModel[] = (record.charges_preview ?? []).map(
      (chargeText, index) => ({
        chargeId: `preview-${index}`,
        description: chargeText,
        statuteCode: null,
        severity: null,
        bondAmount: null,
        sequence: index + 1,
        severityLabel: 'Unknown',
        severityColor: 'text-gray-500',
        formattedBondAmount: 'N/A',
      })
    );

    return {
      id: record.id,
      recordId: record.record_id,
      bookingId: record.booking_id,
      // Identity
      personName: record.person_name,
      personNameNormalized: record.person_name_normalized,
      // Location
      countyId: record.county_id ?? 0,
      countyName: record.counties?.name ?? 'Unknown County',
      countySlug: record.counties?.slug ?? 'unknown',
      sourceId: record.source_id ?? 0,
      sourceName: 'Arrests.org', // Default source for candidates
      // Booking
      bookingDate,
      bookingTime,
      bookingDatetimeText: record.booking_datetime_text,
      // Physical description - not available in candidate_records
      sex: null,
      race: null,
      age: null,
      dob: null,
      heightInches: null,
      weightLbs: null,
      hairColor: null,
      eyeColor: null,
      // Financial - not available in candidate_records
      bondTotal: null,
      caseNumber: null,
      // Media
      imageUrl: record.image_url,
      detailUrl: record.detail_url,
      // Charges from preview
      charges,
      // Biometric - not available in candidate_records
      biometricVerified: false,
      biometricScore: null,
      // Metadata
      scrapedAt,
      enrichedAt: scrapedAt, // Use scraped_at as fallback
      // Computed display values
      formattedHeight: null,
      formattedBondTotal: 'N/A',
      formattedBookingDate: formatDate(dateSource),
      formattedAge: null,
    };
  } catch (err) {
    console.error('[recordAdapter] Failed to parse candidate detail:', record.id, err);
    return {
      id: record.id || 'unknown',
      recordId: record.record_id || 'unknown',
      bookingId: null,
      personName: record.person_name || 'Parse Error',
      personNameNormalized: record.person_name_normalized || '',
      countyId: 0,
      countyName: 'Unknown',
      countySlug: 'unknown',
      sourceId: 0,
      sourceName: 'Unknown',
      bookingDate: null,
      bookingTime: null,
      bookingDatetimeText: null,
      sex: null,
      race: null,
      age: null,
      dob: null,
      heightInches: null,
      weightLbs: null,
      hairColor: null,
      eyeColor: null,
      bondTotal: null,
      caseNumber: null,
      imageUrl: null,
      detailUrl: null,
      charges: [],
      biometricVerified: false,
      biometricScore: null,
      scrapedAt: new Date(),
      enrichedAt: new Date(),
      formattedHeight: null,
      formattedBondTotal: 'N/A',
      formattedBookingDate: 'Unknown',
      formattedAge: null,
    };
  }
}

/**
 * Transform an enriched record (with joined county) to RecordSearchResult
 */
export function toRecordSearchResult(
  record: EnrichedRecordWithCounty
): RecordSearchResult {
  try {
    const bookingDate = parseDate(record.booking_date_normalized);
    const chargeCount = record.charges?.length ?? 0;
    const topCharge = record.charges?.[0]?.description ?? null;

    return {
      id: record.id,
      recordId: record.record_id,
      personName: record.person_name,
      personNameNormalized: record.person_name_normalized,
      bookingDate,
      bookingDateLabel: formatDate(record.booking_date_normalized),
      countyId: record.county_id ?? 0,
      countyName: record.counties?.name ?? 'Unknown County',
      countySlug: record.counties?.slug ?? 'unknown',
      imageUrl: record.image_url,
      topCharge,
      chargeCount,
      bondTotal: record.bond_total,
      // Display values
      formattedBondTotal: formatCurrency(record.bond_total),
      formattedBookingDate: formatDate(record.booking_date_normalized),
    };
  } catch (err) {
    console.error('[recordAdapter] Failed to parse search result:', record.id, err);
    // Return fallback to prevent UI breakage
    return {
      id: record.id || 'unknown',
      recordId: record.record_id || 'unknown',
      personName: record.person_name || 'Parse Error',
      personNameNormalized: record.person_name_normalized || '',
      bookingDate: null,
      bookingDateLabel: 'Unknown',
      countyId: 0,
      countyName: 'Unknown',
      countySlug: 'unknown',
      imageUrl: null,
      topCharge: null,
      chargeCount: 0,
      bondTotal: null,
      formattedBondTotal: 'N/A',
      formattedBookingDate: 'Unknown',
    };
  }
}

/**
 * Transform multiple records to RecordSearchResults
 */
export function toRecordSearchResults(
  records: EnrichedRecordWithCounty[]
): RecordSearchResult[] {
  return records.map(toRecordSearchResult);
}

// =============================================================================
// RECORD DETAIL ADAPTER
// =============================================================================

/**
 * Join type for full record detail with related data
 */
export interface EnrichedRecordWithDetails extends EnrichedRecord {
  counties?: County | null;
  sources?: Source | null;
  charges?: Charge[];
}

/**
 * Transform a full enriched record (with joins) to RecordDetailModel
 */
export function toRecordDetailModel(
  record: EnrichedRecordWithDetails
): RecordDetailModel {
  try {
    const bookingDate = parseDate(record.booking_date_normalized);
    const dob = parseDate(record.dob);
    const scrapedAt = parseDate(record.scraped_at) ?? new Date();
    const enrichedAt = parseDate(record.enriched_at) ?? new Date();

    const charges = record.charges
      ? toChargeModels(record.charges)
      : [];

    return {
      id: record.id,
      recordId: record.record_id,
      bookingId: record.booking_id,
      // Identity
      personName: record.person_name,
      personNameNormalized: record.person_name_normalized,
      // Location
      countyId: record.county_id ?? 0,
      countyName: record.counties?.name ?? 'Unknown County',
      countySlug: record.counties?.slug ?? 'unknown',
      sourceId: record.source_id ?? 0,
      sourceName: record.sources?.display_name ?? record.sources?.name ?? 'Unknown Source',
      // Booking
      bookingDate,
      bookingTime: record.booking_time,
      bookingDatetimeText: record.booking_datetime_text,
      // Physical description
      sex: record.sex,
      race: record.race,
      age: record.age,
      dob,
      heightInches: record.height_inches,
      weightLbs: record.weight_lbs,
      hairColor: record.hair_color,
      eyeColor: record.eye_color,
      // Financial
      bondTotal: record.bond_total,
      caseNumber: record.case_number,
      // Media
      imageUrl: record.image_url,
      detailUrl: record.detail_url,
      // Charges
      charges,
      // Biometric
      biometricVerified: record.biometric_verified,
      biometricScore: record.biometric_score,
      // Metadata
      scrapedAt,
      enrichedAt,
      // Computed display values
      formattedHeight: formatHeight(record.height_inches),
      formattedBondTotal: formatCurrency(record.bond_total),
      formattedBookingDate: formatDate(record.booking_date_normalized),
      formattedAge: record.age ? `${record.age} years old` : null,
    };
  } catch (err) {
    console.error('[recordAdapter] Failed to parse record detail:', record.id, err);
    // Return a fallback to prevent UI breakage
    return {
      id: record.id || 'unknown',
      recordId: record.record_id || 'unknown',
      bookingId: null,
      personName: record.person_name || 'Parse Error',
      personNameNormalized: record.person_name_normalized || '',
      countyId: 0,
      countyName: 'Unknown',
      countySlug: 'unknown',
      sourceId: 0,
      sourceName: 'Unknown',
      bookingDate: null,
      bookingTime: null,
      bookingDatetimeText: null,
      sex: null,
      race: null,
      age: null,
      dob: null,
      heightInches: null,
      weightLbs: null,
      hairColor: null,
      eyeColor: null,
      bondTotal: null,
      caseNumber: null,
      imageUrl: null,
      detailUrl: null,
      charges: [],
      biometricVerified: false,
      biometricScore: null,
      scrapedAt: new Date(),
      enrichedAt: new Date(),
      formattedHeight: null,
      formattedBondTotal: 'N/A',
      formattedBookingDate: 'Unknown',
      formattedAge: null,
    };
  }
}

/**
 * Transform multiple records to RecordDetailModels
 */
export function toRecordDetailModels(
  records: EnrichedRecordWithDetails[]
): RecordDetailModel[] {
  return records.map(toRecordDetailModel);
}
