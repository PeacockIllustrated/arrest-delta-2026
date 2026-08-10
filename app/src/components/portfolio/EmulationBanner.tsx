import React, { useState } from 'react';
import { BANNER_DISMISS_KEY, EMULATION_COPY } from '../../lib/localBackend';

/**
 * A notice that the access control on the page underneath is emulated. It sits
 * in the document flow rather than floating over it, so it cannot be mistaken
 * for a cookie toast — and, on a phone, so it cannot eat a fifth of the
 * viewport for the whole session.
 *
 * Both copy variants are rendered and swapped in CSS rather than measured in
 * JS: no resize listener, no flash of the wrong one on first paint.
 */

type Variant = 'hub' | 'admin';

/**
 * `hub` renders as a bordered card inset in the page content; `admin` renders
 * full-bleed across the top of the console's main column.
 */
const EmulationBanner: React.FC<{ variant?: Variant }> = ({ variant = 'hub' }) => {
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
        <div role="status" className={`pf-banner ${isAdmin ? 'pf-banner--admin' : 'pf-banner--inset'}`}>
            <span aria-hidden className="pf-banner__tag">
                {isAdmin ? 'NO AUTH' : 'DEMO'}
            </span>

            <span className="pf-banner__text">
                <span className="pf-banner__long">
                    {isAdmin ? EMULATION_COPY.adminBanner : EMULATION_COPY.banner}
                </span>
                <span className="pf-banner__short">
                    {isAdmin ? EMULATION_COPY.adminBannerShort : EMULATION_COPY.bannerShort}
                </span>
            </span>

            <button onClick={dismiss} aria-label="Dismiss notice" className="pf-banner__dismiss">
                <span className="pf-banner__long">DISMISS</span>
                <span className="pf-banner__short" aria-hidden>✕</span>
            </button>
        </div>
    );
};

export default EmulationBanner;
