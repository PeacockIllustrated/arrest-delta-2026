/**
 * POSTGREST-SHAPED QUERY BUILDER
 * ==============================
 *
 * Implements the subset of the `supabase-js` query interface this application
 * actually uses, so that call sites written against the real client keep
 * working unchanged once the backend is gone:
 *
 *   from(t).select(cols, { count, head })
 *   from(t).insert(row | rows).select().single()
 *   from(t).update(patch).eq(...)
 *   from(t).upsert(row, { onConflict })
 *   from(t).delete().eq(...)
 *
 *   filters:   eq, neq, in, gte, lte, is, not, ilike
 *   modifiers: order, limit, single, maybeSingle
 *
 * Anything outside that subset is deliberately absent rather than faked — a
 * missing method should fail loudly in development, not silently return [].
 */

import { EMULATED_LATENCY_MS } from './config';
import { emitChange, nextId, nowISO, readTable, writeTable, type Row } from './db';

export interface LocalError {
    message: string;
    code: string;
    details: string | null;
    hint: string | null;
}

export interface LocalResult<T> {
    data: T;
    error: LocalError | null;
    count: number | null;
    status: number;
    statusText: string;
}

type Operation = 'select' | 'insert' | 'update' | 'upsert' | 'delete';
type Predicate = (row: Row) => boolean;

interface TableMeta {
    /** Primary key columns, used for upsert conflict resolution defaults. */
    pk: string[];
    /** Generate an `id` on insert when the caller does not supply one. */
    autoId: boolean;
    /** Columns stamped with the current time on insert when absent. */
    timestamps: string[];
}

const DEFAULT_META: TableMeta = { pk: ['id'], autoId: true, timestamps: ['created_at'] };

const TABLE_META: Record<string, Partial<TableMeta>> = {
    profiles: { autoId: false, timestamps: ['created_at', 'updated_at'] },
    auth_users: { autoId: false },
    user_deck_read_status: { pk: ['user_id', 'deck_id'], autoId: false, timestamps: [] },
    super_admin_deck_reviews: { pk: ['deck_id', 'reviewer_name'], timestamps: ['updated_at'] },
    user_deck_access: { timestamps: ['granted_at'] },
    deck_access_requests: { timestamps: ['requested_at'] },
    leads: { timestamps: ['created_at', 'updated_at'] },
};

function metaFor(table: string): TableMeta {
    return { ...DEFAULT_META, ...(TABLE_META[table] ?? {}) };
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ok<T>(data: T, count: number | null = null): LocalResult<T> {
    return { data, error: null, count, status: 200, statusText: 'OK' };
}

function fail<T>(message: string, code: string, data: T): LocalResult<T> {
    return {
        data,
        error: { message, code, details: null, hint: null },
        count: null,
        status: 400,
        statusText: 'Bad Request',
    };
}

/** `select('id, name')` projects; `select('*')` and embedded selects do not. */
function project(rows: Row[], columns: string): Row[] {
    const trimmed = columns.trim();
    if (!trimmed || trimmed === '*' || /[(\n]/.test(trimmed)) return rows;

    const wanted = trimmed.split(',').map(c => c.trim()).filter(Boolean);
    if (wanted.some(c => !/^[\w]+$/.test(c))) return rows;

    return rows.map(row => {
        const out: Row = {};
        wanted.forEach(col => {
            out[col] = row[col];
        });
        return out;
    });
}

function compare(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (a === null || a === undefined) return -1;
    if (b === null || b === undefined) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
}

export class LocalQuery<T = Row[]> implements PromiseLike<LocalResult<T>> {
    private operation: Operation = 'select';
    private columns = '*';
    private payload: Row[] = [];
    private patch: Row = {};
    private predicates: Predicate[] = [];
    private orderBy: { column: string; ascending: boolean } | null = null;
    private limitCount: number | null = null;
    private conflictKeys: string[] | null = null;
    private wantsRows = true;
    private headOnly = false;
    private wantsCount = false;
    private cardinality: 'many' | 'one' | 'maybeOne' = 'many';
    private readonly table: string;

    constructor(table: string) {
        this.table = table;
    }

    // ---------------------------------------------------------------- verbs

    select(columns = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
        if (this.operation === 'select') {
            this.columns = columns;
        } else {
            // `.insert(...).select()` — ask the mutation to return its rows.
            this.wantsRows = true;
            this.columns = columns;
        }
        if (options?.count) this.wantsCount = true;
        if (options?.head) this.headOnly = true;
        return this;
    }

    insert(values: Row | Row[]): this {
        this.operation = 'insert';
        this.payload = Array.isArray(values) ? values : [values];
        this.wantsRows = false;
        return this;
    }

    update(values: Row): this {
        this.operation = 'update';
        this.patch = values;
        this.wantsRows = false;
        return this;
    }

    upsert(values: Row | Row[], options?: { onConflict?: string }): this {
        this.operation = 'upsert';
        this.payload = Array.isArray(values) ? values : [values];
        this.conflictKeys = options?.onConflict
            ? options.onConflict.split(',').map(c => c.trim()).filter(Boolean)
            : null;
        this.wantsRows = false;
        return this;
    }

    delete(): this {
        this.operation = 'delete';
        this.wantsRows = false;
        return this;
    }

    // -------------------------------------------------------------- filters

    eq(column: string, value: unknown): this {
        this.predicates.push(row => row[column] === value);
        return this;
    }

    neq(column: string, value: unknown): this {
        this.predicates.push(row => row[column] !== value);
        return this;
    }

    in(column: string, values: readonly unknown[]): this {
        this.predicates.push(row => values.includes(row[column]));
        return this;
    }

    gte(column: string, value: unknown): this {
        this.predicates.push(row => compare(row[column], value) >= 0);
        return this;
    }

    lte(column: string, value: unknown): this {
        this.predicates.push(row => compare(row[column], value) <= 0);
        return this;
    }

    is(column: string, value: null | boolean): this {
        this.predicates.push(row => (row[column] ?? null) === value);
        return this;
    }

    not(column: string, operator: string, value: unknown): this {
        if (operator === 'is') {
            this.predicates.push(row => (row[column] ?? null) !== value);
        } else {
            this.predicates.push(row => row[column] !== value);
        }
        return this;
    }

    ilike(column: string, pattern: string): this {
        const rx = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`, 'i');
        this.predicates.push(row => rx.test(String(row[column] ?? '')));
        return this;
    }

    // ------------------------------------------------------------ modifiers

    order(column: string, options?: { ascending?: boolean }): this {
        this.orderBy = { column, ascending: options?.ascending ?? true };
        return this;
    }

    limit(count: number): this {
        this.limitCount = count;
        return this;
    }

    single(): LocalQuery<T> {
        this.cardinality = 'one';
        this.wantsRows = true;
        return this;
    }

    maybeSingle(): LocalQuery<T> {
        this.cardinality = 'maybeOne';
        this.wantsRows = true;
        return this;
    }

    // ------------------------------------------------------------ execution

    then<TResult1 = LocalResult<T>, TResult2 = never>(
        onfulfilled?: ((value: LocalResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    private matches(rows: Row[]): Row[] {
        return rows.filter(row => this.predicates.every(p => p(row)));
    }

    private applyDefaults(row: Row): Row {
        const meta = metaFor(this.table);
        const next: Row = { ...row };
        if (meta.autoId && next.id === undefined) next.id = nextId(this.table);
        meta.timestamps.forEach(col => {
            if (next[col] === undefined) next[col] = nowISO();
        });
        return next;
    }

    private shape(rows: Row[]): LocalResult<T> {
        const projected = project(rows, this.columns);

        if (this.cardinality === 'one') {
            if (projected.length !== 1) {
                return fail(
                    projected.length === 0
                        ? 'JSON object requested, multiple (or no) rows returned'
                        : 'More than one row returned by a single-row query',
                    'PGRST116',
                    null as T,
                );
            }
            return ok(projected[0] as T);
        }

        if (this.cardinality === 'maybeOne') {
            return ok((projected[0] ?? null) as T);
        }

        return ok(projected as T);
    }

    private async execute(): Promise<LocalResult<T>> {
        await sleep(EMULATED_LATENCY_MS);

        try {
            const rows = readTable(this.table);

            switch (this.operation) {
                case 'select': {
                    let matched = this.matches(rows);
                    const total = matched.length;

                    if (this.orderBy) {
                        const { column, ascending } = this.orderBy;
                        matched = [...matched].sort(
                            (a, b) => compare(a[column], b[column]) * (ascending ? 1 : -1),
                        );
                    }
                    if (this.limitCount !== null) matched = matched.slice(0, this.limitCount);

                    if (this.headOnly) {
                        return { ...ok(null as T), count: total };
                    }

                    const result = this.shape(matched);
                    return this.wantsCount ? { ...result, count: total } : result;
                }

                case 'insert': {
                    const inserted = this.payload.map(row => this.applyDefaults(row));
                    writeTable(this.table, [...rows, ...inserted]);
                    inserted.forEach(row =>
                        emitChange({ table: this.table, event: 'INSERT', new: row, old: null }),
                    );
                    return this.wantsRows ? this.shape(inserted) : ok(null as T);
                }

                case 'update': {
                    const updated: Row[] = [];
                    const next = rows.map(row => {
                        if (!this.predicates.every(p => p(row))) return row;
                        const merged = { ...row, ...this.patch };
                        updated.push(merged);
                        return merged;
                    });
                    writeTable(this.table, next);
                    updated.forEach(row =>
                        emitChange({ table: this.table, event: 'UPDATE', new: row, old: null }),
                    );
                    return this.wantsRows ? this.shape(updated) : ok(null as T);
                }

                case 'upsert': {
                    const keys = this.conflictKeys ?? metaFor(this.table).pk;
                    const next = [...rows];
                    const affected: Row[] = [];

                    this.payload.forEach(incoming => {
                        const index = next.findIndex(row => keys.every(k => row[k] === incoming[k]));
                        if (index >= 0) {
                            const merged = { ...next[index], ...incoming, updated_at: nowISO() };
                            next[index] = merged;
                            affected.push(merged);
                            emitChange({ table: this.table, event: 'UPDATE', new: merged, old: null });
                        } else {
                            const created = this.applyDefaults(incoming);
                            next.push(created);
                            affected.push(created);
                            emitChange({ table: this.table, event: 'INSERT', new: created, old: null });
                        }
                    });

                    writeTable(this.table, next);
                    return this.wantsRows ? this.shape(affected) : ok(null as T);
                }

                case 'delete': {
                    const removed = this.matches(rows);
                    const removedKeys = new Set(removed);
                    writeTable(this.table, rows.filter(row => !removedKeys.has(row)));
                    removed.forEach(row =>
                        emitChange({ table: this.table, event: 'DELETE', new: null, old: row }),
                    );
                    return this.wantsRows ? this.shape(removed) : ok(null as T);
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Local backend error';
            console.warn(`[local-backend] ${this.table}: ${message}`);
            return fail(message, 'LOCAL_ERROR', (this.cardinality === 'many' ? [] : null) as T);
        }
    }
}
