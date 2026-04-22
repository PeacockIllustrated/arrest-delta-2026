// =============================================================================
// DEMO JURISDICTIONS - Nationwide coverage
// =============================================================================
// FIPS `cXXYYY` = `c` + state FIPS (2) + county FIPS (3). These IDs match the
// county map SVG so pulses highlight on the dashboard.

export interface DemoJurisdiction {
    jurisdictionId: string;
    displayName: string;
    stateCode: string;
    stateName: string;
    defaultHealth: 'healthy' | 'degraded' | 'down';
}

export const DEMO_JURISDICTIONS: DemoJurisdiction[] = [
    // California
    { jurisdictionId: 'c06037', displayName: 'Los Angeles County',   stateCode: 'CA', stateName: 'California',   defaultHealth: 'healthy' },
    { jurisdictionId: 'c06073', displayName: 'San Diego County',     stateCode: 'CA', stateName: 'California',   defaultHealth: 'healthy' },
    { jurisdictionId: 'c06059', displayName: 'Orange County',        stateCode: 'CA', stateName: 'California',   defaultHealth: 'healthy' },
    { jurisdictionId: 'c06075', displayName: 'San Francisco County', stateCode: 'CA', stateName: 'California',   defaultHealth: 'healthy' },
    { jurisdictionId: 'c06001', displayName: 'Alameda County',       stateCode: 'CA', stateName: 'California',   defaultHealth: 'healthy' },

    // Texas
    { jurisdictionId: 'c48201', displayName: 'Harris County',        stateCode: 'TX', stateName: 'Texas',        defaultHealth: 'healthy' },
    { jurisdictionId: 'c48113', displayName: 'Dallas County',        stateCode: 'TX', stateName: 'Texas',        defaultHealth: 'healthy' },
    { jurisdictionId: 'c48029', displayName: 'Bexar County',         stateCode: 'TX', stateName: 'Texas',        defaultHealth: 'healthy' },
    { jurisdictionId: 'c48453', displayName: 'Travis County',        stateCode: 'TX', stateName: 'Texas',        defaultHealth: 'healthy' },
    { jurisdictionId: 'c48439', displayName: 'Tarrant County',       stateCode: 'TX', stateName: 'Texas',        defaultHealth: 'healthy' },

    // Florida
    { jurisdictionId: 'c12086', displayName: 'Miami-Dade County',    stateCode: 'FL', stateName: 'Florida',      defaultHealth: 'healthy' },
    { jurisdictionId: 'c12011', displayName: 'Broward County',       stateCode: 'FL', stateName: 'Florida',      defaultHealth: 'healthy' },
    { jurisdictionId: 'c12095', displayName: 'Orange County',        stateCode: 'FL', stateName: 'Florida',      defaultHealth: 'healthy' },
    { jurisdictionId: 'c12057', displayName: 'Hillsborough County',  stateCode: 'FL', stateName: 'Florida',      defaultHealth: 'healthy' },

    // New York
    { jurisdictionId: 'c36047', displayName: 'Kings County',         stateCode: 'NY', stateName: 'New York',     defaultHealth: 'healthy' },
    { jurisdictionId: 'c36081', displayName: 'Queens County',        stateCode: 'NY', stateName: 'New York',     defaultHealth: 'healthy' },
    { jurisdictionId: 'c36061', displayName: 'New York County',      stateCode: 'NY', stateName: 'New York',     defaultHealth: 'healthy' },
    { jurisdictionId: 'c36005', displayName: 'Bronx County',         stateCode: 'NY', stateName: 'New York',     defaultHealth: 'healthy' },

    // Illinois
    { jurisdictionId: 'c17031', displayName: 'Cook County',          stateCode: 'IL', stateName: 'Illinois',     defaultHealth: 'healthy' },
    { jurisdictionId: 'c17043', displayName: 'DuPage County',        stateCode: 'IL', stateName: 'Illinois',     defaultHealth: 'healthy' },

    // Pennsylvania
    { jurisdictionId: 'c42101', displayName: 'Philadelphia County',  stateCode: 'PA', stateName: 'Pennsylvania', defaultHealth: 'healthy' },
    { jurisdictionId: 'c42003', displayName: 'Allegheny County',     stateCode: 'PA', stateName: 'Pennsylvania', defaultHealth: 'healthy' },

    // Ohio
    { jurisdictionId: 'c39035', displayName: 'Cuyahoga County',      stateCode: 'OH', stateName: 'Ohio',         defaultHealth: 'healthy' },
    { jurisdictionId: 'c39049', displayName: 'Franklin County',      stateCode: 'OH', stateName: 'Ohio',         defaultHealth: 'healthy' },

    // Georgia
    { jurisdictionId: 'c13121', displayName: 'Fulton County',        stateCode: 'GA', stateName: 'Georgia',      defaultHealth: 'healthy' },
    { jurisdictionId: 'c13135', displayName: 'Gwinnett County',      stateCode: 'GA', stateName: 'Georgia',      defaultHealth: 'healthy' },

    // North Carolina
    { jurisdictionId: 'c37119', displayName: 'Mecklenburg County',   stateCode: 'NC', stateName: 'North Carolina', defaultHealth: 'healthy' },
    { jurisdictionId: 'c37183', displayName: 'Wake County',          stateCode: 'NC', stateName: 'North Carolina', defaultHealth: 'healthy' },

    // Arizona
    { jurisdictionId: 'c04013', displayName: 'Maricopa County',      stateCode: 'AZ', stateName: 'Arizona',      defaultHealth: 'healthy' },
    { jurisdictionId: 'c04019', displayName: 'Pima County',          stateCode: 'AZ', stateName: 'Arizona',      defaultHealth: 'healthy' },

    // Washington
    { jurisdictionId: 'c53033', displayName: 'King County',          stateCode: 'WA', stateName: 'Washington',   defaultHealth: 'healthy' },

    // Michigan
    { jurisdictionId: 'c26163', displayName: 'Wayne County',         stateCode: 'MI', stateName: 'Michigan',     defaultHealth: 'healthy' },

    // Massachusetts
    { jurisdictionId: 'c25025', displayName: 'Suffolk County',       stateCode: 'MA', stateName: 'Massachusetts', defaultHealth: 'healthy' },

    // Colorado
    { jurisdictionId: 'c08031', displayName: 'Denver County',        stateCode: 'CO', stateName: 'Colorado',     defaultHealth: 'healthy' },
];

export const JURISDICTION_MAP: Record<string, DemoJurisdiction> = Object.fromEntries(
    DEMO_JURISDICTIONS.map((j) => [j.jurisdictionId, j])
);
