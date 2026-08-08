import React, { useState } from 'react';
import { BANNER_DISMISS_KEY, EMULATION_COPY } from '../../lib/localBackend';

/**
 * A persistent notice that the access control on the page underneath is
 * emulated. It sits above the content rather than floating over it, so it
 * cannot be mistaken for a cookie toast and dismissed on reflex.
 */

type Variant = 'hub' | 'admin';

interface EmulationBannerProps {
    variant?: Variant;
    /** Fixed to the viewport (hub) or inline in the document flow (admin). */
    position?: 'fixed' | 'inline';
    /** Extra offset from the top, for pages with their own fixed navbar. */
    topOffset?: number;
}

const EmulationBanner: React.FC<EmulationBannerProps> = ({
    variant = 'hub',
    position = 'inline',
    topOffset = 0,
}) => {
    const storageKey = `${BANNER_DISMISS_KEY}.${variant}`;
    const [dismissed, setDismissed] = useState(() => {
        try {
            return window.sessionStorage.getItem(storageKey) === '1';
        } catch {
            return false;
        }
    });

    const dismiss = () => {
        setDismissed(true);
        try {
            window.sessionStorage.setItem(storageKey, '1');
        } catch {
            // Session storage unavailable — the banner simply returns next load.
        }
    };

    if (dismissed) return null;

    const isAdmin = variant === 'admin';

    return (
        <div
            role="status"
            style={{
                position: position === 'fixed' ? 'fixed' : 'relative',
                top: position === 'fixed' ? topOffset : undefined,
                left: position === 'fixed' ? 0 : undefined,
                right: position === 'fixed' ? 0 : undefined,
                zIndex: 200,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                padding: '0.7rem 1rem',
                background: isAdmin ? 'rgba(228, 0, 40, 0.12)' : 'rgba(228, 0, 40, 0.08)',
                borderBottom: '1px solid rgba(228, 0, 40, 0.45)',
                backdropFilter: 'blur(10px)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.7rem',
                lineHeight: 1.6,
                letterSpacing: '0.03em',
                color: '#f0c8ce',
            }}
        >
            <span
                aria-hidden
                style={{
                    flexShrink: 0,
                    padding: '0.15rem 0.45rem',
                    border: '1px solid var(--color-alert-red)',
                    color: 'var(--color-alert-red)',
                    fontWeight: 700,
                    fontSize: '0.6rem',
                    letterSpacing: '0.12em',
                }}
            >
                {isAdmin ? 'NO AUTH' : 'DEMO'}
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
                {isAdmin ? EMULATION_COPY.adminBanner : EMULATION_COPY.banner}
            </span>

            <button
                onClick={dismiss}
                aria-label="Dismiss notice"
                style={{
                    flexShrink: 0,
                    background: 'transparent',
                    border: '1px solid rgba(228, 0, 40, 0.4)',
                    color: '#c98b95',
                    padding: '0.2rem 0.5rem',
                    fontFamily: 'inherit',
                    fontSize: '0.6rem',
                    cursor: 'pointer',
                    letterSpacing: '0.1em',
                }}
            >
                DISMISS
            </button>
        </div>
    );
};

export default EmulationBanner;
