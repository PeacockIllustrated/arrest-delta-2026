// =============================================================================
// CANONICAL FIPS LOOKUP
// =============================================================================
// The live `counties` table has corrupted `fips` values for most non-FL states
// (state prefix is correct but the 3-digit county portion is random). The SVG
// map keys on canonical US Census FIPS, so records never match.
//
// Fix: compute the canonical FIPS at read time from (state, county_name) using
// the 3,235-row national_county.txt shipped in assets. No DB change needed.
// =============================================================================

import nationalCountyText from '../../assets/national_county.txt?raw';

function normalizeCountyName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+county$/i, '')
        .replace(/\s+parish$/i, '') // Louisiana
        .replace(/\s+borough$/i, '') // Alaska
        .replace(/\s+census area$/i, '')
        .replace(/\s+municipality$/i, '')
        .replace(/\s+city and borough$/i, '')
        .replace(/[.,']/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Parse national_county.txt once at module load.
// Format per line: STATE,STATE_FIPS,COUNTY_FIPS,COUNTY_NAME,CLASS
// e.g. "AL,01,001,Autauga County,H1"
const CANONICAL_FIPS = (() => {
    const map = new Map<string, string>();
    for (const line of nationalCountyText.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const parts = line.split(',');
        if (parts.length < 4) continue;
        const [state, stateFips, countyFips, name] = parts;
        map.set(`${state}|${normalizeCountyName(name)}`, `${stateFips}${countyFips}`);
    }
    return map;
})();

/**
 * Resolve a (state, county_name) pair to its canonical US Census FIPS code,
 * or `null` if no match. Used instead of `counties.fips` because the DB values
 * are corrupted for most non-FL entries.
 */
export function canonicalFipsFor(state: string | null | undefined, name: string | null | undefined): string | null {
    if (!state || !name) return null;
    return CANONICAL_FIPS.get(`${state}|${normalizeCountyName(name)}`) ?? null;
}

/**
 * Convenience: return the SVG-keyed form (`c12086`).
 */
export function canonicalSvgFipsFor(state: string | null | undefined, name: string | null | undefined): string | null {
    const f = canonicalFipsFor(state, name);
    return f ? `c${f}` : null;
}
