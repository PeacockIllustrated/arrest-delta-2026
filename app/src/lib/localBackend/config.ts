/**
 * PORTFOLIO MODE CONFIGURATION
 * ============================
 *
 * ArrestDelta's live site has been retired and its Supabase project deleted.
 * This build is a *portfolio artefact*: the same React application, running
 * entirely in the browser against a local emulation of the backend that used
 * to sit behind it.
 *
 * What that means in practice:
 *
 *   - There is no server. No network calls leave the page.
 *   - There is no authentication. Every route is open to every visitor.
 *   - The access-control UI is preserved and fully interactive, but it is
 *     *theatre*: grants, locks, roles and approvals are re-implemented against
 *     `localStorage` so the original workflow can still be demonstrated.
 *
 * Nothing here should be mistaken for a security boundary. The real product
 * enforced access with Supabase Auth plus Postgres row-level security; that
 * enforcement lived on the server and is gone. What survives is the interface
 * and the process design, which is what the portfolio piece is about.
 */

/** Portfolio mode is the default (and, with the backend gone, the only) mode. */
export const PORTFOLIO_MODE =
    (import.meta.env.VITE_APP_MODE ?? 'portfolio') === 'portfolio';

/** Bumped whenever the seeded shape changes, so stale local data is discarded. */
export const LOCAL_DB_VERSION = 1;

export const LOCAL_DB_KEY = `arrestdelta.portfolio.db.v${LOCAL_DB_VERSION}`;
export const LOCAL_SESSION_KEY = `arrestdelta.portfolio.session.v${LOCAL_DB_VERSION}`;
export const BANNER_DISMISS_KEY = `arrestdelta.portfolio.banner.v${LOCAL_DB_VERSION}`;

/**
 * Artificial latency, in milliseconds, applied to emulated backend calls.
 * Zero would make every list snap into place instantly and the loading states
 * — which are part of what this piece is showing off — would never render.
 */
export const EMULATED_LATENCY_MS = 140;

/**
 * Copy reused across the banners and notices so the framing stays consistent.
 * Each banner has a short variant for narrow screens, where the full sentence
 * wraps to five lines and swallows the page.
 */
export const EMULATION_COPY = {
    short: 'Security is emulated. No server, no auth, no real access control.',
    banner:
        'Portfolio rebuild — the live backend is gone. Access control below is emulated in your browser and enforces nothing.',
    bannerShort: 'Portfolio rebuild. Access control is emulated and enforces nothing.',
    adminBanner:
        'UNAUTHENTICATED — EMULATED ADMIN. This console is open to anyone. It emulates the original super-admin experience; it does not authenticate you and grants no real privilege.',
    adminBannerShort: 'Unauthenticated. This console is open to anyone and grants no real privilege.',
    hub:
        'Everything in this data room is unlocked. Locks, grants and access requests still work as an interactive demonstration of the original permission model, but they run against browser storage and protect nothing.',
} as const;
