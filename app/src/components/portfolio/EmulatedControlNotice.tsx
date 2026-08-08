import React, { useState } from 'react';

/**
 * An inline panel for the admin console, placed directly above whichever
 * control it is describing. The page-level banner says the console is open;
 * this says what the specific control underneath it used to be protected by,
 * and what happens when you press it now.
 *
 * Collapsible, and collapsed by default on narrow screens: at full length the
 * was/now prose runs to most of a phone screen and buries the control it is
 * annotating.
 */

interface EmulatedControlNoticeProps {
    /** What the server used to enforce for this control. */
    enforcedBy: string;
    /** What pressing the control actually does in this build. */
    nowDoes: string;
    /** Optional list of the SQL functions this control called. */
    functions?: string[];
}

/** Matches the CSS breakpoint where the notice would start to dominate. */
const NARROW_QUERY = '(max-width: 700px)';

const EmulatedControlNotice: React.FC<EmulatedControlNoticeProps> = ({
    enforcedBy,
    nowDoes,
    functions,
}) => {
    const [open, setOpen] = useState(() => {
        try {
            return !window.matchMedia(NARROW_QUERY).matches;
        } catch {
            return true;
        }
    });

    return (
        <div className="pf-control">
            <button
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                className="pf-control__toggle"
            >
                <span className="pf-control__badge">EMULATED CONTROL</span>
                <span className="pf-control__sign" aria-hidden>{open ? '−' : '+'}</span>
            </button>

            {open && (
                <div className="pf-control__body">
                    <p>
                        <strong>Was:</strong> {enforcedBy}
                    </p>
                    <p>
                        <strong>Now:</strong> {nowDoes}
                    </p>
                    {functions && functions.length > 0 && (
                        <p className="pf-control__fns">
                            Reimplemented in <code>lib/localBackend/rpc.ts</code>:{' '}
                            {functions.map((fn, i) => (
                                <React.Fragment key={fn}>
                                    {i > 0 && ', '}
                                    <code>{fn}</code>
                                </React.Fragment>
                            ))}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default EmulatedControlNotice;
