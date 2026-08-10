import React from 'react';
import { Link } from 'react-router-dom';
import { PERSONAS, getActivePersonaId, resetDatabase, setActivePersona } from '../../lib/localBackend';

/**
 * EXPLORE THE ACCESS CONTROL
 * ==========================
 *
 * The discovery surface for the permission model, sat directly under the hero.
 *
 * The switcher in the header is a fine control once you know it exists, but it
 * is a small chip in a corner and reads as a status label — most visitors will
 * never press it, and the emulated access control is the whole point of the
 * piece. This panel states the invitation in full, gives each identity a target
 * you cannot miss on any screen size, and puts the admin console one tap away
 * from the room it administers.
 */

interface ExploreAccessPanelProps {
    /** How many of the visible decks the current identity can open. */
    unlockedCount: number;
    /** How many decks the hub is rendering. */
    totalCount: number;
}

const ExploreAccessPanel: React.FC<ExploreAccessPanelProps> = ({ unlockedCount, totalCount }) => {
    const activeId = getActivePersonaId();

    const choose = (id: string) => {
        if (id === activeId) return;
        setActivePersona(id);
        // Re-run the permission fetch from a clean state rather than patching
        // the grants into the live context.
        window.location.reload();
    };

    const reset = () => {
        resetDatabase();
        setActivePersona(PERSONAS[0].id);
        window.location.reload();
    };

    return (
        <section className="pf-explore" aria-labelledby="pf-explore-title">
            <span className="pf-explore__eyebrow">TRY IT</span>

            <h2 id="pf-explore-title" className="pf-explore__title">
                Explore the access control
            </h2>

            <p className="pf-explore__lede">
                Every deck below is open to you right now. The permission model that used to
                decide otherwise is still wired up — pick an identity to see the room the way
                that person saw it, then open the admin console and change what they can reach.
            </p>

            <div className="pf-explore__grid">
                {PERSONAS.map(persona => {
                    const isActive = persona.id === activeId;
                    return (
                        <button
                            key={persona.id}
                            onClick={() => choose(persona.id)}
                            aria-current={isActive}
                            className={`pf-explore__card${isActive ? ' pf-explore__card--active' : ''}`}
                        >
                            <span className="pf-explore__card-head">
                                <span className="pf-explore__card-name">{persona.name}</span>
                                {isActive && (
                                    <span className="pf-explore__card-state">
                                        {unlockedCount}/{totalCount}
                                    </span>
                                )}
                            </span>
                            <span className="pf-explore__card-blurb">{persona.blurb}</span>
                        </button>
                    );
                })}
            </div>

            <div className="pf-explore__actions">
                <Link to="/admin/provision" className="pf-explore__admin-link">
                    OPEN THE ADMIN CONSOLE →
                </Link>
                <button onClick={reset} className="pf-explore__reset">
                    RESET DEMO DATA
                </button>
            </div>

            <p className="pf-explore__note">
                No sign-in, for any of them. The console is open to anyone and grants no real
                privilege; identities and grants live in this browser's storage and are visible
                to nobody else.
            </p>
        </section>
    );
};

export default ExploreAccessPanel;
