import React, { useState } from 'react';
import { PERSONAS, getActivePersonaId, resetDatabase, setActivePersona } from '../../lib/localBackend';

/**
 * IDENTITY SWITCHER
 * =================
 *
 * Replaces the data room's LOGOUT control. Logging out of an application with
 * no authentication is a dead end — it would render every deck locked while
 * protecting nothing. Switching identity is the useful equivalent here: it is
 * how a visitor sees the permission model from each side.
 *
 * Every persona is fictional and every switch is a local one. Nothing is
 * verified; picking "Emulated Admin" grants no privilege that picking
 * "Restricted Investor" withholds — the difference is only which rows the
 * emulated database returns.
 */
const PersonaSwitcher: React.FC = () => {
    const [open, setOpen] = useState(false);
    const activeId = getActivePersonaId();
    const active = PERSONAS.find(p => p.id === activeId);

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
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'transparent',
                    border: '1px solid #333',
                    color: '#888',
                    padding: '0.4rem 0.7rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    letterSpacing: '0.08em',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
            >
                VIEW AS: {active?.name.toUpperCase() ?? 'UNKNOWN'}
                <span style={{ opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        width: 'min(320px, calc(100vw - 2rem))',
                        background: 'rgba(10,10,10,0.97)',
                        border: '1px solid #333',
                        padding: '0.75rem',
                        zIndex: 300,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                    }}
                >
                    <p
                        className="text-mono"
                        style={{
                            fontSize: '0.6rem',
                            color: '#666',
                            lineHeight: 1.6,
                            marginBottom: '0.75rem',
                            letterSpacing: '0.04em',
                        }}
                    >
                        Emulated identities. Switching changes which decks the local
                        database reports as granted — it authenticates nothing.
                    </p>

                    {PERSONAS.map(persona => {
                        const isActive = persona.id === activeId;
                        return (
                            <button
                                key={persona.id}
                                onClick={() => choose(persona.id)}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    background: isActive ? 'rgba(228,0,40,0.12)' : 'transparent',
                                    border: `1px solid ${isActive ? 'var(--color-alert-red)' : '#2a2a2a'}`,
                                    padding: '0.6rem 0.7rem',
                                    marginBottom: '0.4rem',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-mono)',
                                }}
                            >
                                <span
                                    style={{
                                        display: 'block',
                                        fontSize: '0.7rem',
                                        color: isActive ? 'var(--color-alert-red)' : '#ddd',
                                        letterSpacing: '0.06em',
                                    }}
                                >
                                    {persona.name}
                                </span>
                                <span
                                    style={{
                                        display: 'block',
                                        fontSize: '0.6rem',
                                        color: '#777',
                                        marginTop: '0.25rem',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {persona.blurb}
                                </span>
                            </button>
                        );
                    })}

                    <button
                        onClick={reset}
                        style={{
                            width: '100%',
                            marginTop: '0.4rem',
                            background: 'transparent',
                            border: '1px dashed #333',
                            color: '#666',
                            padding: '0.5rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6rem',
                            letterSpacing: '0.08em',
                            cursor: 'pointer',
                        }}
                    >
                        RESET DEMO DATA
                    </button>
                </div>
            )}
        </div>
    );
};

export default PersonaSwitcher;
