/**
 * EMULATED STORED PROCEDURES
 * ==========================
 *
 * The data room leaned on Postgres functions for anything that needed to cross
 * a row-level-security boundary — resolving an email to a user, granting deck
 * access, approving a request. Those functions ran `SECURITY DEFINER` on the
 * server precisely so the browser could not do this work itself.
 *
 * Here the browser does exactly that work. Each function below reproduces the
 * observable behaviour of its SQL counterpart (same arguments, same return
 * strings) against local storage, with none of the enforcement. That inversion
 * is the whole point of the emulation, and the reason nothing here is a
 * security control.
 */

import { DECKS } from '../decks';
import { emitChange, nextId, nowISO, readTable, writeTable, type Row } from './db';
import { EMULATED_LATENCY_MS } from './config';
import type { LocalError } from './queryBuilder';

interface RpcResult {
    data: unknown;
    error: LocalError | null;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function done(data: unknown): RpcResult {
    return { data, error: null };
}

function normalise(email: unknown): string {
    return String(email ?? '').toLowerCase().trim();
}

function userByEmail(email: unknown): Row | undefined {
    const target = normalise(email);
    return readTable('auth_users').find(row => normalise(row.email) === target);
}

function insertRow(table: string, row: Row): Row {
    const created = { ...row };
    writeTable(table, [...readTable(table), created]);
    emitChange({ table, event: 'INSERT', new: created, old: null });
    return created;
}

function updateRows(table: string, predicate: (row: Row) => boolean, patch: Row): Row[] {
    const updated: Row[] = [];
    const next = readTable(table).map(row => {
        if (!predicate(row)) return row;
        const merged = { ...row, ...patch };
        updated.push(merged);
        return merged;
    });
    writeTable(table, next);
    updated.forEach(row => emitChange({ table, event: 'UPDATE', new: row, old: null }));
    return updated;
}

function grantDeck(userId: string, deckId: string, grantedBy: string): void {
    const grants = readTable('user_deck_access');
    if (grants.some(g => g.user_id === userId && g.deck_id === deckId)) return;
    insertRow('user_deck_access', {
        id: nextId('grant'),
        user_id: userId,
        lead_id: null,
        deck_id: deckId,
        granted_at: nowISO(),
        granted_by: grantedBy,
    });
}

function revokeDeck(userId: string, deckId: string): void {
    const grants = readTable('user_deck_access');
    const next = grants.filter(g => !(g.user_id === userId && g.deck_id === deckId));
    if (next.length === grants.length) return;
    writeTable('user_deck_access', next);
    emitChange({ table: 'user_deck_access', event: 'DELETE', new: null, old: null });
}

// ---------------------------------------------------------------------------
// Function table
// ---------------------------------------------------------------------------

type RpcHandler = (params: Record<string, unknown>) => RpcResult;

const HANDLERS: Record<string, RpcHandler> = {
    /** Original: inserted an admin notification of type `meeting_request`. */
    request_meeting: params => {
        const session = readTable('auth_users').find(
            row => row.id === localActiveUserId(),
        );
        insertRow('admin_notifications', {
            id: nextId('notif'),
            type: 'meeting_request',
            title: 'Meeting requested',
            message: String(params.message ?? 'A meeting was requested from the data room.'),
            user_id: session?.id ?? null,
            user_email: session?.email ?? null,
            metadata: {},
            is_read: false,
            created_at: nowISO(),
        });
        return done('success');
    },

    get_recent_users_with_access: params => {
        const limit = Number(params.p_limit ?? 10);
        const grants = readTable('user_deck_access');
        const rows = readTable('auth_users')
            .map(user => ({
                user_id: user.id,
                email: user.email,
                name: user.name ?? null,
                created_at: user.created_at,
                deck_count: grants.filter(g => g.user_id === user.id).length,
            }))
            .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
            .slice(0, limit);
        return done(rows);
    },

    check_user_exists: params => done(Boolean(userByEmail(params.p_email))),

    get_user_deck_access: params => {
        const user = userByEmail(params.p_email);
        if (!user) return done([]);
        const rows = readTable('user_deck_access')
            .filter(g => g.user_id === user.id)
            .map(g => ({ deck_id: g.deck_id, granted_at: g.granted_at }));
        return done(rows);
    },

    get_user_deck_read_status_by_email: params => {
        const user = userByEmail(params.p_email);
        if (!user) return done([]);
        const rows = readTable('user_deck_read_status')
            .filter(r => r.user_id === user.id)
            .map(r => ({
                deck_id: r.deck_id,
                opened_at: r.opened_at,
                marked_read_at: r.marked_read_at,
            }));
        return done(rows);
    },

    admin_toggle_deck_read_status: params => {
        const user = userByEmail(params.p_email);
        if (!user) return done('user_not_found');

        const deckId = String(params.p_deck_id);
        const markRead = Boolean(params.p_mark_as_read);
        const existing = readTable('user_deck_read_status').find(
            r => r.user_id === user.id && r.deck_id === deckId,
        );

        if (existing) {
            updateRows(
                'user_deck_read_status',
                r => r.user_id === user.id && r.deck_id === deckId,
                { marked_read_at: markRead ? nowISO() : null },
            );
        } else {
            insertRow('user_deck_read_status', {
                user_id: user.id,
                deck_id: deckId,
                opened_at: nowISO(),
                marked_read_at: markRead ? nowISO() : null,
            });
        }

        return done(markRead ? 'marked_read' : 'marked_unread');
    },

    set_super_admin: params => {
        const user = userByEmail(params.p_email);
        if (!user) return done('user_not_found');
        updateRows('profiles', p => p.id === user.id, { role: 'super_admin', updated_at: nowISO() });
        return done('success');
    },

    remove_super_admin: params => {
        const user = userByEmail(params.p_email);
        if (!user) return done('user_not_found');
        updateRows('profiles', p => p.id === user.id, { role: 'viewer', updated_at: nowISO() });
        return done('success');
    },

    grant_deck_access_by_email: params => {
        const user = userByEmail(params.p_email);
        if (!user) return done('user_not_found');
        grantDeck(String(user.id), String(params.p_deck_id), String(params.p_granted_by ?? 'admin'));
        return done('success');
    },

    revoke_deck_access_by_email: params => {
        const user = userByEmail(params.p_email);
        if (!user) return done('user_not_found');
        revokeDeck(String(user.id), String(params.p_deck_id));
        return done('success');
    },

    approve_deck_access: params => {
        const requestId = String(params.p_request_id);
        const request = readTable('deck_access_requests').find(r => r.id === requestId);
        if (!request) return done('request_not_found');

        grantDeck(String(request.user_id), String(request.deck_id), 'admin@portfolio.local');
        updateRows('deck_access_requests', r => r.id === requestId, {
            status: 'approved',
            resolved_at: nowISO(),
            resolved_by: 'admin@portfolio.local',
        });
        return done('success');
    },

    deny_deck_access: params => {
        const requestId = String(params.p_request_id);
        const request = readTable('deck_access_requests').find(r => r.id === requestId);
        if (!request) return done('request_not_found');

        updateRows('deck_access_requests', r => r.id === requestId, {
            status: 'denied',
            resolved_at: nowISO(),
            resolved_by: 'admin@portfolio.local',
        });
        return done('success');
    },

    grant_all_decks_to_user: params => {
        const userId = String(params.p_user_id);
        if (!readTable('auth_users').some(u => u.id === userId)) return done('user_not_found');
        DECKS.forEach(deck => grantDeck(userId, deck.id, 'admin@portfolio.local'));
        return done('success');
    },
};

/**
 * The portal's analytics functions belonged to the data pipeline, which the
 * portal already replaces with its in-memory simulator (`VITE_PORTAL_MODE`
 * defaults to `demo`). They are stubbed so a stray call degrades to an empty
 * result instead of throwing.
 */
const PIPELINE_STUBS = new Set([
    'get_dashboard_overview',
    'get_top_counties',
    'get_county_trend',
    'get_recent_errors',
]);

// Set lazily by `index.ts` to avoid a circular import with `auth.ts`.
let localActiveUserId: () => string | null = () => null;

export function bindActiveUserLookup(fn: () => string | null): void {
    localActiveUserId = fn;
}

export async function localRpc(
    name: string,
    params: Record<string, unknown> = {},
): Promise<RpcResult> {
    await sleep(EMULATED_LATENCY_MS);

    const handler = HANDLERS[name];
    if (handler) return handler(params);

    if (PIPELINE_STUBS.has(name)) return done([]);

    console.warn(`[local-backend] no emulation for rpc "${name}"`);
    return {
        data: null,
        error: {
            message: `Function "${name}" is not emulated in the portfolio build`,
            code: 'LOCAL_RPC_MISSING',
            details: null,
            hint: null,
        },
    };
}
