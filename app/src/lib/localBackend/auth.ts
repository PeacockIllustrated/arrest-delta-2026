/**
 * EMULATED AUTH
 * =============
 *
 * A stand-in for `supabase.auth` that keeps the original call shapes but does
 * no authentication whatsoever. There is no password check, no token, no
 * server. Signing in means "adopt this identity locally"; signing out means
 * "go back to the default portfolio identity".
 *
 * The identity still matters, because the data room's permission model is
 * keyed on it — switching personas is how a visitor sees the locked-deck and
 * request-access experience that real investors got. It is a viewing mode,
 * not a security boundary.
 */

import { LOCAL_SESSION_KEY } from './config';
import { nowISO, readTable, writeTable, type Row } from './db';
import { DEFAULT_PERSONA_ID, PERSONAS } from './seed';

export interface LocalUser {
    id: string;
    email: string;
    user_metadata: { name?: string };
    app_metadata: Record<string, unknown>;
    aud: string;
    created_at: string;
}

export interface LocalSession {
    user: LocalUser;
    access_token: string;
    token_type: string;
    expires_in: number;
    /** Always present, always fake. Nothing verifies it. */
    emulated: true;
}

type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT';
type AuthListener = (event: AuthEvent, session: LocalSession | null) => void;

const listeners = new Set<AuthListener>();

function storage(): Storage | null {
    try {
        const probe = window.localStorage;
        probe.getItem(LOCAL_SESSION_KEY);
        return probe;
    } catch {
        return null;
    }
}

let activeUserId: string | null = null;

function readStoredUserId(): string {
    if (activeUserId) return activeUserId;
    const stored = storage()?.getItem(LOCAL_SESSION_KEY);
    activeUserId = stored && findAuthUser(stored) ? stored : DEFAULT_PERSONA_ID;
    return activeUserId;
}

function writeStoredUserId(userId: string): void {
    activeUserId = userId;
    try {
        storage()?.setItem(LOCAL_SESSION_KEY, userId);
    } catch {
        // Storage unavailable — the in-memory value carries the session.
    }
}

function findAuthUser(userId: string): Row | undefined {
    return readTable('auth_users').find(row => row.id === userId);
}

function findAuthUserByEmail(email: string): Row | undefined {
    const normalized = email.toLowerCase().trim();
    return readTable('auth_users').find(
        row => String(row.email ?? '').toLowerCase() === normalized,
    );
}

function toUser(row: Row): LocalUser {
    return {
        id: String(row.id),
        email: String(row.email ?? ''),
        user_metadata: { name: row.name ? String(row.name) : undefined },
        app_metadata: { provider: 'emulated' },
        aud: 'authenticated',
        created_at: String(row.created_at ?? nowISO()),
    };
}

function toSession(row: Row): LocalSession {
    return {
        user: toUser(row),
        access_token: 'emulated-no-token',
        token_type: 'bearer',
        expires_in: 3600,
        emulated: true,
    };
}

function currentSession(): LocalSession | null {
    const row = findAuthUser(readStoredUserId());
    return row ? toSession(row) : null;
}

function broadcast(event: AuthEvent, session: LocalSession | null): void {
    listeners.forEach(listener => {
        try {
            listener(event, session);
        } catch (err) {
            console.warn('[local-backend] auth listener threw:', err);
        }
    });
}

/** Create an identity on demand so "sign up" and unknown emails still work. */
function ensureUser(email: string, name?: string): Row {
    const existing = findAuthUserByEmail(email);
    if (existing) return existing;

    const normalized = email.toLowerCase().trim();
    const created: Row = {
        id: `local-${normalized.replace(/[^a-z0-9]+/g, '-')}`,
        email: normalized,
        name: name ?? normalized.split('@')[0],
        created_at: nowISO(),
    };

    writeTable('auth_users', [...readTable('auth_users'), created]);
    writeTable('profiles', [
        ...readTable('profiles'),
        {
            id: created.id,
            name: created.name,
            role: 'viewer',
            org_id: null,
            created_at: created.created_at,
            updated_at: created.created_at,
        },
    ]);

    return created;
}

/** Switch the active identity. Used by the persona switcher in the UI. */
export function setActivePersona(userId: string): void {
    writeStoredUserId(userId);
    broadcast('SIGNED_IN', currentSession());
}

export function getActivePersonaId(): string {
    return readStoredUserId();
}

export const localAuth = {
    async getSession() {
        return { data: { session: currentSession() }, error: null };
    },

    async getUser() {
        return { data: { user: currentSession()?.user ?? null }, error: null };
    },

    /**
     * Accepts any credentials. The password argument is ignored entirely —
     * there is nothing to check it against.
     */
    async signInWithPassword({ email }: { email: string; password?: string }) {
        const row = ensureUser(email);
        writeStoredUserId(String(row.id));
        const session = currentSession();
        broadcast('SIGNED_IN', session);
        return { data: { user: session?.user ?? null, session }, error: null };
    },

    async signUp({ email, options }: { email: string; password?: string; options?: { data?: { name?: string } } }) {
        const row = ensureUser(email, options?.data?.name);
        writeStoredUserId(String(row.id));
        const session = currentSession();
        broadcast('SIGNED_IN', session);
        return { data: { user: session?.user ?? null, session }, error: null };
    },

    /**
     * Returns to the default portfolio identity rather than leaving the app in
     * a signed-out state. With no backend and every route open, a null session
     * would only produce empty screens — the deck hub would render every card
     * locked while protecting nothing.
     */
    async signOut() {
        writeStoredUserId(DEFAULT_PERSONA_ID);
        broadcast('SIGNED_OUT', currentSession());
        return { error: null };
    },

    onAuthStateChange(callback: AuthListener) {
        listeners.add(callback);
        // Mirror supabase-js, which replays the current session asynchronously.
        setTimeout(() => callback('INITIAL_SESSION', currentSession()), 0);
        return {
            data: {
                subscription: {
                    id: 'emulated',
                    callback,
                    unsubscribe: () => {
                        listeners.delete(callback);
                    },
                },
            },
        };
    },
};

export { PERSONAS };
