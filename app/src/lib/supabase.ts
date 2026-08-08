import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createLocalBackendClient } from './localBackend';
import { PORTFOLIO_MODE } from './localBackend/config';

/**
 * BACKEND ENTRY POINT
 * ===================
 *
 * ArrestDelta's Supabase project has been deleted. In portfolio mode — the
 * default, and the only mode that works without it — every call that used to
 * cross the network is served by `lib/localBackend`, an in-browser emulation
 * of the tables, functions, auth and change streams the app depended on.
 *
 * The real client is kept below, unchanged, because it documents what the
 * application actually talked to. Restore a project, set `VITE_APP_MODE=live`
 * plus the two Supabase variables, and this file will hand back the genuine
 * client with no other change to the codebase.
 *
 * Consumers are typed against `SupabaseClient` so no call site needed
 * rewriting; the single cast below is where that fiction is declared. The
 * emulation implements only the subset of the client this app uses.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const portalMode = import.meta.env.VITE_PORTAL_MODE || 'demo';

const hasRealCreds = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseAnonKey.includes('your-anon-key')
);

if (!PORTFOLIO_MODE && !hasRealCreds) {
    throw new Error(
        'VITE_APP_MODE=live but Supabase credentials are missing or unset. ' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in app/.env, or drop the ' +
        'VITE_APP_MODE override to run the portfolio build.'
    );
}

function createBackend(): SupabaseClient {
    if (PORTFOLIO_MODE) {
        return createLocalBackendClient() as unknown as SupabaseClient;
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });
}

export const supabase: SupabaseClient = createBackend();

/** True only when a genuine Supabase project is wired up. */
export const isSupabaseConfigured = !PORTFOLIO_MODE && hasRealCreds;

/** True when reads and writes are served by the in-browser emulation. */
export const isEmulatedBackend = PORTFOLIO_MODE;

if (PORTFOLIO_MODE) {
    console.info(
        '%c[ArrestDelta] Portfolio build — backend emulated in-browser. ' +
        'No network calls, no authentication, no real access control.',
        'color:#e40028',
    );
} else {
    console.log(`[Supabase] Live mode — portal mode: ${portalMode}.`);
}
