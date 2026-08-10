/**
 * EMULATED REALTIME
 * =================
 *
 * The original console subscribed to Postgres change streams so a new access
 * request appeared in the notification tray without a refresh. Local writes
 * already broadcast a change event (see `db.ts`), so the same subscriptions can
 * be served from within the page — for this tab only. There is no socket and no
 * cross-device sync; open the console in two windows and they will not agree.
 */

import { onChange, type ChangeEvent, type ChangePayload } from './db';

interface PostgresChangeFilter {
    event: ChangeEvent | '*';
    schema?: string;
    table?: string;
}

type ChangeCallback = (payload: {
    eventType: ChangeEvent;
    schema: string;
    table: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
}) => void;

export class LocalChannel {
    private bindings: Array<{ filter: PostgresChangeFilter; callback: ChangeCallback }> = [];
    private detach: (() => void) | null = null;
    readonly topic: string;

    constructor(topic: string) {
        this.topic = topic;
    }

    on(_type: 'postgres_changes', filter: PostgresChangeFilter, callback: ChangeCallback): this {
        this.bindings.push({ filter, callback });
        return this;
    }

    subscribe(callback?: (status: string) => void): this {
        this.detach = onChange((payload: ChangePayload) => {
            this.bindings.forEach(({ filter, callback: handler }) => {
                if (filter.table && filter.table !== payload.table) return;
                if (filter.event !== '*' && filter.event !== payload.event) return;
                handler({
                    eventType: payload.event,
                    schema: filter.schema ?? 'public',
                    table: payload.table,
                    new: (payload.new ?? {}) as Record<string, unknown>,
                    old: (payload.old ?? {}) as Record<string, unknown>,
                });
            });
        });

        callback?.('SUBSCRIBED');
        return this;
    }

    unsubscribe(): void {
        this.detach?.();
        this.detach = null;
        this.bindings = [];
    }
}
