import React from 'react';

/**
 * An inline panel for the admin console, placed directly above whichever
 * control it is describing. The page-level banner says the console is open;
 * this says what the specific control underneath it used to be protected by,
 * and what happens when you press it now.
 */

interface EmulatedControlNoticeProps {
    /** What the server used to enforce for this control. */
    enforcedBy: string;
    /** What pressing the control actually does in this build. */
    nowDoes: string;
    /** Optional list of the SQL functions this control called. */
    functions?: string[];
}

const EmulatedControlNotice: React.FC<EmulatedControlNoticeProps> = ({
    enforcedBy,
    nowDoes,
    functions,
}) => (
    <div
        style={{
            border: '1px solid rgba(228, 0, 40, 0.35)',
            background: 'rgba(228, 0, 40, 0.06)',
            padding: '0.9rem 1rem',
            marginBottom: '1.5rem',
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.7rem',
            lineHeight: 1.75,
            color: '#c98b95',
        }}
    >
        <div
            style={{
                display: 'inline-block',
                border: '1px solid var(--color-alert-red, #e40028)',
                color: 'var(--color-alert-red, #e40028)',
                padding: '0.1rem 0.4rem',
                fontSize: '0.6rem',
                letterSpacing: '0.12em',
                marginBottom: '0.6rem',
            }}
        >
            EMULATED CONTROL
        </div>
        <p style={{ margin: 0 }}>
            <strong style={{ color: '#e6e6e6' }}>Was:</strong> {enforcedBy}
        </p>
        <p style={{ margin: '0.35rem 0 0' }}>
            <strong style={{ color: '#e6e6e6' }}>Now:</strong> {nowDoes}
        </p>
        {functions && functions.length > 0 && (
            <p style={{ margin: '0.6rem 0 0', color: '#8a8a8a', fontSize: '0.65rem' }}>
                Reimplemented in <code>lib/localBackend/rpc.ts</code>:{' '}
                {functions.map((fn, i) => (
                    <React.Fragment key={fn}>
                        {i > 0 && ', '}
                        <code style={{ color: '#aaa' }}>{fn}</code>
                    </React.Fragment>
                ))}
            </p>
        )}
    </div>
);

export default EmulatedControlNotice;
