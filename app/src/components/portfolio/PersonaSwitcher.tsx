import React, { useEffect, useRef, useState } from 'react';
import { PERSONAS, getActivePersonaId, resetDatabase, setActivePersona } from '../../lib/localBackend';

/**
 * IDENTITY SWITCHER
 * =================
 *
 * Replaces the data room's LOGOUT control. Logging out of an application with
 * no authentication is a dead end — it would render every deck locked while
 * protecting nothing. Switching identity is the useful equivalent: it is how a
 * visitor sees the permission model from each side.
 *
 * Styled as a primary action rather than a status label, because this is the
 * control most likely to be walked past and the one that demonstrates the whole
 * model. The `ExploreAccessPanel` on the hub carries the same switch at full
 * size for anyone who never looks at a header.
 *
 * Every persona is fictional and every switch is local. Nothing is verified;
 * picking "Emulated Admin" grants no privilege that picking "Restricted
 * Investor" withholds — the difference is only which rows the emulated database
 * returns.
 */
const PersonaSwitcher: React.FC = () => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const activeId = getActivePersonaId();
    const active = PERSONAS.find(p => p.id === activeId);

    // Close on outside tap and on Escape — a menu you cannot dismiss without
    // picking something is a trap on a phone.
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const choose = (id: string) => {
        setActivePersona(id);
        setOpen(false);
        // The deck hub reads grants once per session; a reload is the honest
        // way to re-run the whole permission fetch from a clean state.
        window.location.reload();
    };

    const reset = () => {
        resetDatabase();
        setActivePersona(PERSONAS[0].id);
        window.location.reload();
    };

    return (
        <div className="pf-persona" ref={rootRef}>
            <button
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="pf-persona__trigger"
            >
                VIEW AS
                <span className="pf-persona__trigger-name">{active?.name ?? 'Unknown'}</span>
                <span className="pf-persona__trigger-short">{active?.shortName ?? '?'}</span>
                <span className="pf-persona__caret" aria-hidden>{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div className="pf-persona__menu" role="menu">
                    <p className="pf-persona__hint">
                        Emulated identities. Switching changes which decks the local database
                        reports as granted — it authenticates nothing.
                    </p>

                    {PERSONAS.map(persona => {
                        const isActive = persona.id === activeId;
                        return (
                            <button
                                key={persona.id}
                                role="menuitem"
                                onClick={() => choose(persona.id)}
                                className={`pf-persona__option${isActive ? ' pf-persona__option--active' : ''}`}
                            >
                                <span className="pf-persona__option-name">
                                    {isActive ? '● ' : ''}{persona.name}
                                </span>
                                <span className="pf-persona__option-blurb">{persona.blurb}</span>
                            </button>
                        );
                    })}

                    <button onClick={reset} className="pf-persona__reset">
                        RESET DEMO DATA
                    </button>
                </div>
            )}
        </div>
    );
};

export default PersonaSwitcher;
