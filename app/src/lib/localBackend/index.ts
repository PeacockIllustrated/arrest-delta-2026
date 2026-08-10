/**
 * LOCAL BACKEND
 * =============
 *
 * Assembles the emulated client. The object returned here presents the same
 * surface the application already calls — `.from()`, `.rpc()`, `.auth`,
 * `.channel()` — so no call site had to be rewritten when the real backend was
 * decommissioned.
 *
 * See `config.ts` for what this build is and what it deliberately is not.
 */

import { getActivePersonaId, localAuth, setActivePersona } from './auth';
import { LocalQuery } from './queryBuilder';
import { LocalChannel } from './realtime';
import { bindActiveUserLookup, localRpc } from './rpc';
import { resetDatabase } from './db';

bindActiveUserLookup(() => getActivePersonaId());

export function createLocalBackendClient() {
    return {
        from(table: string) {
            return new LocalQuery(table);
        },

        rpc(name: string, params?: Record<string, unknown>) {
            return localRpc(name, params ?? {});
        },

        auth: localAuth,

        channel(topic: string) {
            return new LocalChannel(topic);
        },

        removeChannel(channel: LocalChannel) {
            channel.unsubscribe();
            return Promise.resolve('ok');
        },
    };
}

export { getActivePersonaId, setActivePersona, resetDatabase };
export { PERSONAS, DEFAULT_PERSONA_ID, type Persona } from './seed';
export {
    PORTFOLIO_MODE,
    EMULATION_COPY,
    BANNER_DISMISS_KEY,
} from './config';
