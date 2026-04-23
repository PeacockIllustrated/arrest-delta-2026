import React from 'react';
import type { BiometricResult } from '../../hooks/usePortalData';

// =============================================================================
// BIOMETRIC BADGE — renders a face-match status chip inline with alert rows.
// =============================================================================
// Intentionally small/unobtrusive: a dot + verb + percentage, colour-coded by
// verification outcome. Reads from usePortalData's BiometricResult, which is
// either pulled from the live escalation payload or computed deterministically
// from the personId in demo mode.

interface Props {
    biometric: BiometricResult | undefined | null;
    compact?: boolean; // 1-line, smaller font (for sidebar feeds)
}

function labelFor(b: BiometricResult): { text: string; dotBg: string; fg: string; bg: string; border: string } {
    if (b.method === 'none') {
        return {
            text: 'Biometric pending',
            dotBg: 'var(--text-muted)',
            fg: 'var(--text-muted)',
            bg: 'transparent',
            border: 'var(--border-subtle)',
        };
    }
    if (b.verified) {
        return {
            text: `Face match ${b.confidence}%`,
            dotBg: 'var(--success, #22c55e)',
            fg: 'var(--success, #22c55e)',
            bg: 'rgba(34,197,94,0.08)',
            border: 'rgba(34,197,94,0.35)',
        };
    }
    return {
        text: `Face match ${b.confidence}%`,
        dotBg: 'var(--warning, #f59e0b)',
        fg: 'var(--warning, #f59e0b)',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.35)',
    };
}

export const BiometricBadge: React.FC<Props> = ({ biometric, compact = false }) => {
    if (!biometric) return null;
    const c = labelFor(biometric);
    const fontSize = compact ? '0.62rem' : '0.7rem';
    const padding = compact ? '2px 6px' : '3px 8px';

    return (
        <span
            title={`Biometric method: ${biometric.method} • Confidence: ${biometric.confidence}% • ${biometric.verified ? 'Verified match' : 'Below threshold'}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding,
                fontSize,
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: c.fg,
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: '3px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
            }}
        >
            <span
                aria-hidden
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: c.dotBg,
                    display: 'inline-block',
                }}
            />
            {c.text}
        </span>
    );
};

export default BiometricBadge;
