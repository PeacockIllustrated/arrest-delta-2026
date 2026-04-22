import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Load Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const portalMode = import.meta.env.VITE_PORTAL_MODE || 'demo';

// In demo mode (default), we don't require real Supabase credentials — the app
// runs entirely off the in-memory simulator. We still export a client so imports
// don't break; it just points at a placeholder and is never actually hit.
const hasRealCreds = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project') &&
    !supabaseAnonKey.includes('your-anon-key')
);

if (!hasRealCreds && portalMode === 'live') {
    throw new Error(
        'VITE_PORTAL_MODE=live but Supabase credentials are missing or unset. ' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in app/.env, or switch to VITE_PORTAL_MODE=demo.'
    );
}

const effectiveUrl = hasRealCreds ? supabaseUrl : 'https://demo.local.invalid';
const effectiveKey = hasRealCreds ? supabaseAnonKey : 'demo-anon-key-not-used';

export const supabase: SupabaseClient = createClient(effectiveUrl, effectiveKey, {
    auth: {
        persistSession: hasRealCreds,
        autoRefreshToken: hasRealCreds,
        detectSessionInUrl: hasRealCreds,
    },
});

export const isSupabaseConfigured = hasRealCreds;

// Connectivity test — only runs when we actually have real creds AND live mode
if (hasRealCreds && portalMode === 'live') {
    setTimeout(async () => {
        console.log('[Supabase] Testing connectivity to:', supabaseUrl);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            console.log('[Supabase] Session:', session ? `Logged in as ${session.user.email}` : 'No session');

            const startTime = Date.now();
            const { error } = await supabase.from('escalations').select('count', { count: 'exact', head: true });
            const duration = Date.now() - startTime;
            if (error) {
                console.error('[Supabase] Connectivity test failed:', error.message);
            } else {
                console.log(`[Supabase] Connectivity OK (${duration}ms)`);
            }
        } catch (err) {
            console.error('[Supabase] Connectivity test threw:', err);
        }
    }, 500);
} else {
    console.log(`[Supabase] ${hasRealCreds ? 'Credentials present' : 'No credentials'} — portal mode: ${portalMode}. ${portalMode === 'demo' ? 'Using in-memory simulator.' : ''}`);
}
