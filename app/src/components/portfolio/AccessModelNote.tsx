import React, { useState } from 'react';

/**
 * The portfolio note that explains what this data room was, how its access
 * control actually worked, and precisely which parts of that are now theatre.
 * Collapsed by default so it frames the page without burying it.
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
        <section
            style={{
                maxWidth: '1400px',
                marginInline: 'auto',
                marginBottom: '4rem',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-surface)',
                backdropFilter: 'blur(10px)',
            }}
        >
            <button
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    width: '100%',
                    padding: '1.25rem 1.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                    <span
                        className="text-mono"
                        style={{
                            fontSize: '0.6rem',
                            padding: '0.2rem 0.5rem',
                            border: '1px solid var(--color-alert-red)',
                            color: 'var(--color-alert-red)',
                            letterSpacing: '0.12em',
                        }}
                    >
                        PORTFOLIO NOTE
                    </span>
                    <span
                        className="text-mono"
                        style={{ fontSize: '0.85rem', color: 'var(--color-signal-white)', letterSpacing: '0.06em' }}
                    >
                        How the access control worked — and what it does now
                    </span>
                </span>
                <span className="text-mono" style={{ color: 'var(--color-alert-red)', fontSize: '0.8rem' }}>
                    {open ? '−' : '+'}
                </span>
            </button>

            {open && (
                <div style={{ padding: '0 1.5rem 1.75rem', borderTop: '1px solid var(--color-grid)' }}>
                    <p
                        className="text-muted"
                        style={{ fontSize: '0.9rem', lineHeight: 1.7, margin: '1.25rem 0', maxWidth: '68ch' }}
                    >
                        ArrestDelta ran a staged data room. Investors signed in once, landed here, and
                        saw the core thesis immediately; partner-specific material stayed locked until
                        a conversation justified opening it. Requesting a locked deck raised a
                        notification, an admin granted it from the provisioning console, and the card
                        unlocked on the requester's next visit. Read receipts closed the loop, so it
                        was clear what had actually been looked at before a follow-up call.
                    </p>
                    <p
                        className="text-muted"
                        style={{ fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.75rem', maxWidth: '68ch' }}
                    >
                        The raise is over, the site is retired and the Supabase project has been
                        deleted. Every deck here is open. The permission machinery is still wired up
                        and still worth clicking through — but it now runs entirely in your browser,
                        which means it demonstrates the workflow rather than enforcing it.
                    </p>

                    <div style={{ overflowX: 'auto' }}>
                        <table
                            style={{
                                width: '100%',
                                minWidth: '640px',
                                borderCollapse: 'collapse',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                            }}
                        >
                            <thead>
                                <tr>
                                    {['', 'Live product', 'This build'].map(head => (
                                        <th
                                            key={head}
                                            style={{
                                                textAlign: 'left',
                                                padding: '0.6rem 0.75rem',
                                                borderBottom: '1px solid var(--color-grid)',
                                                color: '#777',
                                                letterSpacing: '0.1em',
                                                fontWeight: 400,
                                                fontSize: '0.65rem',
                                                textTransform: 'uppercase',
                                                width: head === '' ? '18%' : '41%',
                                            }}
                                        >
                                            {head}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON.map(row => (
                                    <tr key={row.label}>
                                        <td
                                            style={{
                                                padding: '0.75rem',
                                                borderBottom: '1px solid rgba(51,51,51,0.5)',
                                                color: 'var(--color-signal-white)',
                                                verticalAlign: 'top',
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            {row.label}
                                        </td>
                                        <td
                                            style={{
                                                padding: '0.75rem',
                                                borderBottom: '1px solid rgba(51,51,51,0.5)',
                                                color: '#999',
                                                verticalAlign: 'top',
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            {row.then}
                                        </td>
                                        <td
                                            style={{
                                                padding: '0.75rem',
                                                borderBottom: '1px solid rgba(51,51,51,0.5)',
                                                color: '#c98b95',
                                                verticalAlign: 'top',
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            {row.now}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p
                        className="text-mono"
                        style={{
                            fontSize: '0.7rem',
                            color: '#666',
                            marginTop: '1.5rem',
                            lineHeight: 1.7,
                            letterSpacing: '0.04em',
                        }}
                    >
                        Try it: switch to <strong style={{ color: '#999' }}>Restricted Investor</strong> to
                        see the locked cards and request a deck, then open{' '}
                        <a href="/admin/provision" style={{ color: 'var(--color-alert-red)' }}>
                            /admin/provision
                        </a>{' '}
                        to grant it. State lives in <code>localStorage</code>; "reset demo data" in the
                        identity menu puts it back.
                    </p>
                </div>
            )}
        </section>
    );
};

export default AccessModelNote;
