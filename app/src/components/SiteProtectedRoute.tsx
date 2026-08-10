import React from 'react';

/**
 * SITE GATE — RETIRED
 * ===================
 *
 * Every marketing and deck route used to sit behind this component. It called
 * `supabase.auth.getSession()` on mount, held the page on an "AUTHENTICATING…"
 * spinner while the round trip completed, and redirected anonymous visitors to
 * `/gate` to sign in or register. Access to the data room started here.
 *
 * The Supabase project backing that check no longer exists, and this build is a
 * portfolio artefact rather than a live fundraise. The gate is therefore
 * removed rather than emulated: with nothing to authenticate against, a gate
 * that always says yes is worse than no gate — it implies a check that is not
 * happening.
 *
 * The original sign-in screen is preserved at `/gate` as a non-functional
 * exhibit, and the per-deck permission model it fed is still fully explorable
 * from the data room. See `lib/localBackend/config.ts`.
 */
const SiteProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
};

export default SiteProtectedRoute;
