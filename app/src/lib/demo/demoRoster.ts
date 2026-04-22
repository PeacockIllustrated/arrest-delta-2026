// =============================================================================
// DEMO ROSTER - Synthetic monitored individuals for Uber demo
// =============================================================================

export interface DemoRosterEntry {
    personId: string;
    displayName: string;
    dobYear: number;
    jurisdictionId: string; // Links to DEMO_JURISDICTIONS
}

// Synthetic first and last name pools
const FIRST_NAMES = [
    'James', 'Michael', 'Robert', 'David', 'William', 'John', 'Richard', 'Thomas',
    'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Andrew',
    'Maria', 'Jennifer', 'Elizabeth', 'Linda', 'Patricia', 'Susan', 'Jessica',
    'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra', 'Ashley',
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
];

// Distribution weights per county (higher = more roster entries).
// Weights roughly mirror real county population rank so the feed feels natural.
const COUNTY_WEIGHTS: Record<string, number> = {
    // California
    'c06037': 25, // LA
    'c06073': 12, // San Diego
    'c06059': 12, // Orange (CA)
    'c06075': 6,  // SF
    'c06001': 10, // Alameda

    // Texas
    'c48201': 20, // Harris (Houston)
    'c48113': 15, // Dallas
    'c48029': 12, // Bexar (San Antonio)
    'c48453': 9,  // Travis (Austin)
    'c48439': 12, // Tarrant

    // Florida
    'c12086': 18, // Miami-Dade
    'c12011': 12, // Broward
    'c12095': 10, // Orange (FL)
    'c12057': 10, // Hillsborough

    // New York
    'c36047': 18, // Kings (Brooklyn)
    'c36081': 15, // Queens
    'c36061': 10, // Manhattan
    'c36005': 8,  // Bronx

    // Illinois
    'c17031': 22, // Cook (Chicago)
    'c17043': 6,  // DuPage

    // Pennsylvania
    'c42101': 12, // Philadelphia
    'c42003': 8,  // Allegheny

    // Ohio
    'c39035': 8,  // Cuyahoga
    'c39049': 10, // Franklin

    // Georgia
    'c13121': 8,  // Fulton
    'c13135': 7,  // Gwinnett

    // North Carolina
    'c37119': 8,  // Mecklenburg
    'c37183': 7,  // Wake

    // Arizona
    'c04013': 20, // Maricopa (Phoenix)
    'c04019': 7,  // Pima (Tucson)

    // Washington
    'c53033': 15, // King (Seattle)

    // Michigan
    'c26163': 12, // Wayne (Detroit)

    // Massachusetts
    'c25025': 6,  // Suffolk (Boston)

    // Colorado
    'c08031': 6,  // Denver
};

/**
 * Generate deterministic roster entries
 */
function generateRoster(): DemoRosterEntry[] {
    const roster: DemoRosterEntry[] = [];
    let idCounter = 1;

    Object.entries(COUNTY_WEIGHTS).forEach(([jurisdictionId, count]) => {
        for (let i = 0; i < count; i++) {
            const firstName = FIRST_NAMES[(idCounter * 7) % FIRST_NAMES.length];
            const lastName = LAST_NAMES[(idCounter * 11) % LAST_NAMES.length];
            const dobYear = 1960 + (idCounter % 40); // Range: 1960-1999

            roster.push({
                personId: `PER-${String(idCounter).padStart(4, '0')}`,
                displayName: `${firstName} ${lastName}`,
                dobYear,
                jurisdictionId,
            });

            idCounter++;
        }
    });

    return roster;
}

/**
 * Full demo roster - 90 synthetic individuals
 */
export const DEMO_ROSTER: DemoRosterEntry[] = generateRoster();

/**
 * Get roster entries by jurisdiction
 */
export function getRosterByJurisdiction(jurisdictionId: string): DemoRosterEntry[] {
    return DEMO_ROSTER.filter((entry) => entry.jurisdictionId === jurisdictionId);
}

/**
 * Get a random person from a jurisdiction
 */
export function getRandomPersonFromJurisdiction(jurisdictionId: string): DemoRosterEntry | null {
    const entries = getRosterByJurisdiction(jurisdictionId);
    if (entries.length === 0) return null;
    return entries[Math.floor(Math.random() * entries.length)];
}
