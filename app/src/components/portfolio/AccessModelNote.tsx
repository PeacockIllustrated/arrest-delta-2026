import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * The portfolio note that explains what this data room was, how its access
 * control actually worked, and precisely which parts of that are now theatre.
 * Collapsed by default so it frames the page without burying it.
 *
 * The comparison renders as a table on desktop and as stacked cards below
 * ~820px. A three-column table of prose is unreadable on a phone however well
 * it scrolls, so both markups exist and CSS picks one.
 */

interface RowSpec {
    label: string;
    then: string;
    now: string;
}

const COMPARISON: RowSpec[] = [
    {
        label: 'Identity',
        then: 'Supabase Auth — email/password, server-issued JWT, session refreshed on the client.',
        now: 'A persona picked from a list. No password is checked; there is no token.',
    },
    {
        label: 'Route access',
        then: 'A site-wide gate held every marketing and deck route until a session resolved.',
        now: 'Removed. Every route renders for everyone, immediately.',
    },
    {
        label: 'Per-deck permission',
        then: '`user_deck_access` rows, one per user per deck, read under row-level security.',
        now: 'The same rows, in browser storage, readable and editable by anyone on the page.',
    },
    {
        label: 'Enforcement',
        then: 'Postgres RLS policies. The client could ask for anything; the database decided.',
        now: 'None. The lock is drawn by the component that also holds the key.',
    },
    {
        label: 'Privileged actions',
        then: '`SECURITY DEFINER` functions — grant, revoke, approve — callable only by a super admin.',
        now: 'The same function names, reimplemented in TypeScript, callable by anyone.',
    },
    {
        label: 'Admin console',
        then: 'Session plus a `super_admin` role check before the provisioning UI would mount.',
        now: 'Open at `/admin`. It emulates the experience and grants no privilege.',
    },
];

const AccessModelNote: React.FC = () => {
    const [open, setOpen] = useState(false);

    return (
        <section className="pf-note">
            <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="pf-note__toggle">
                <span className="pf-note__toggle-label">
                    <span className="pf-note__badge">PORTFOLIO NOTE</span>
                    <span className="pf-note__heading">
                        How the access control worked — and what it does now
                    </span>
                </span>
                <span className="pf-note__sign" aria-hidden>{open ? '−' : '+'}</span>
            </button>

            {open && (
                <div className="pf-note__body">
                    <p className="pf-note__para">
                        ArrestDelta ran a staged data room. Investors signed in once, landed here, and
                        saw the core thesis immediately; partner-specific material stayed locked until
                        a conversation justified opening it. Requesting a locked deck raised a
                        notification, an admin granted it from the provisioning console, and the card
                        unlocked on the requester's next visit. Read receipts closed the loop, so it
                        was clear what had actually been looked at before a follow-up call.
                    </p>
                    <p className="pf-note__para">
                        The raise is over, the site is retired and the Supabase project has been
                        deleted. Every deck here is open. The permission machinery is still wired up
                        and still worth clicking through — but it now runs entirely in your browser,
                        which means it demonstrates the workflow rather than enforcing it.
                    </p>

                    {/* Wide screens: side-by-side comparison. */}
                    <div className="pf-note__scroll">
                        <table className="pf-note__table">
                            <thead>
                                <tr>
                                    <th scope="col"></th>
                                    <th scope="col">Live product</th>
                                    <th scope="col">This build</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON.map(row => (
                                    <tr key={row.label}>
                                        <td>{row.label}</td>
                                        <td>{row.then}</td>
                                        <td>{row.now}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Narrow screens: the same content, stacked. */}
                    <div className="pf-note__stack">
                        {COMPARISON.map(row => (
                            <div key={row.label} className="pf-note__stack-item">
                                <span className="pf-note__stack-label">{row.label}</span>
                                <p className="pf-note__stack-row">
                                    <span className="pf-note__stack-key">Live product</span>
                                    <span className="pf-note__stack-then">{row.then}</span>
                                </p>
                                <p className="pf-note__stack-row">
                                    <span className="pf-note__stack-key">This build</span>
                                    <span className="pf-note__stack-now">{row.now}</span>
                                </p>
                            </div>
                        ))}
                    </div>

                    <p className="pf-note__footer">
                        Try it: switch to <strong style={{ color: '#999' }}>Restricted Investor</strong> to
                        see the locked cards and request a deck, then open{' '}
                        <Link to="/admin/provision" style={{ color: 'var(--color-alert-red)' }}>
                            the provisioning console
                        </Link>{' '}
                        to grant it. State lives in <code>localStorage</code>; "reset demo data" puts
                        it back.
                    </p>
                </div>
            )}
        </section>
    );
};

export default AccessModelNote;
