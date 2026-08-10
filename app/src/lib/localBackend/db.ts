/**
 * LOCAL DATABASE
 * ==============
 *
 * A tiny, synchronous, localStorage-backed stand-in for the Postgres tables the
 * application used to read from. Tables are plain arrays of row objects; there
 * are no constraints, no policies and no joins beyond what callers do in JS.
 *
 * Writes broadcast a change event so the emulated realtime channels
 * (see `realtime.ts`) can fire the same way Supabase's did.
 */

import { LOCAL_DB_KEY } from './config';
import { buildSeed } from './seed';

export type Row = Record<string, unknown>;
export type LocalDatabase = Record<string, Row[]>;

export type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface ChangePayload {
    table: string;
    event: ChangeEvent;
    new: Row | null;
    old: Row | null;
}

type ChangeListener = (payload: ChangePayload) => void;

const listeners = new Set<ChangeListener>();

/** In-memory mirror. Also the sole store when localStorage is unavailable. */
let cache: LocalDatabase | null = null;

function storage(): Storage | null {
    try {
        // Private-mode Safari and SSR both blow up on access, not just on write.
        const probe = window.localStorage;
        probe.getItem(LOCAL_DB_KEY);
        return probe;
    } catch {
        return null;
    }
}

function load(): LocalDatabase {
    if (cache) return cache;

    const store = storage();
    if (store) {
        const raw = store.getItem(LOCAL_DB_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw) as LocalDatabase;
                if (parsed && typeof parsed === 'object') {
                    cache = parsed;
                    return cache;
                }
            } catch {
                // Corrupt payload — fall through and reseed.
            }
        }
    }

    cache = buildSeed();
    persist();
    return cache;
}

function persist(): void {
    const store = storage();
    if (!store || !cache) return;
    try {
        store.setItem(LOCAL_DB_KEY, JSON.stringify(cache));
    } catch {
        // Quota exceeded, or storage disabled mid-session. The in-memory cache
        // stays authoritative for the rest of the page's life.
    }
}

/** Every row currently in `table`. Returns a copy; mutate via `writeTable`. */
export function readTable(table: string): Row[] {
    const db = load();
    return (db[table] ?? []).map(row => ({ ...row }));
}

/** Replace the contents of `table` wholesale. */
export function writeTable(table: string, rows: Row[]): void {
    const db = load();
    db[table] = rows;
    persist();
}

/** Notify realtime subscribers that a table changed. */
export function emitChange(payload: ChangePayload): void {
    listeners.forEach(listener => {
        try {
            listener(payload);
        } catch (err) {
            console.warn('[local-backend] realtime listener threw:', err);
        }
    });
}

export function onChange(listener: ChangeListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/** Wipe local state and reseed. Used by the "reset demo data" controls. */
export function resetDatabase(): void {
    cache = buildSeed();
    persist();
    emitChange({ table: '*', event: 'UPDATE', new: null, old: null });
}

/** Monotonic-enough identifiers; the real schema used uuid/bigserial. */
let idCounter = 0;
export function nextId(prefix = 'loc'): string {
    idCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function nowISO(): string {
    return new Date().toISOString();
}
