import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RadarNode from '../components/investor/ui/RadarNode';
import { ChartIcon, LockIcon } from '../components/portal/Icons';
import { DeckHubAuthProvider, useDeckHubAuth } from '../components/deckhub/DeckHubAuthContext';
import { type Deck } from '../lib/decks';
import { getDecksGroupedBySection } from '../lib/dataRoomPlan';
import { usePageTitle } from '../hooks/usePageTitle';
import { DeckReadStatusProvider, useDeckReadStatus } from '../hooks/useDeckReadStatus';
import { useDeckAccessRequests } from '../hooks/useDeckAccessRequests';
import '../styles/brand.css';
import LeadershipBiosSection from '../components/data-room/LeadershipBiosSection';
import AdminReviewPanel from '../components/data-room/AdminReviewPanel';
import { SuperAdminReviewProvider, useSuperAdminReview } from '../hooks/useSuperAdminReview';
import { supabase } from '../lib/supabase';
import EmulationBanner from '../components/portfolio/EmulationBanner';
import PersonaSwitcher from '../components/portfolio/PersonaSwitcher';
import AccessModelNote from '../components/portfolio/AccessModelNote';
import ExploreAccessPanel from '../components/portfolio/ExploreAccessPanel';
import { EMULATION_COPY } from '../lib/localBackend';

// ============ BOOK MEETING BUTTON COMPONENT ============
const BookMeetingButton: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const { isAuthenticated } = useDeckHubAuth();

    const handleBookMeeting = async () => {
        if (!isAuthenticated) return;
        setStatus('loading');

        try {
            const { data, error } = await supabase.rpc('request_meeting', {
                message: 'User requested a meeting via Data Room dashboard.'
            });

            if (error) throw error;

            if (data === 'success') {
                setStatus('success');
            } else {
                throw new Error(data || 'Failed to request meeting');
            }
        } catch (err) {
            console.error('Error booking meeting:', err);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    if (status === 'success') {
        return (
            <button
                disabled
                className="btn"
                style={{
                    background: 'rgba(76, 175, 80, 0.15)',
                    border: '1px solid #4CAF50',
                    color: '#4CAF50',
                    cursor: 'default',
                    padding: '1rem 2rem',
                    fontSize: '0.9rem'
                }}
            >
                ✓ LOGGED TO THE EMULATED ADMIN QUEUE — NOTHING WAS SENT
            </button>
        );
    }

    return (
        <button
            onClick={handleBookMeeting}
            disabled={!isAuthenticated || status === 'loading'}
            className="btn btn-primary"
            style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '1rem 3rem',
                fontSize: '1rem',
                letterSpacing: '0.1em'
            }}
        >
            {status === 'loading' ? 'TRANSMITTING...' : 'BOOK MEETING'}
            {status === 'error' && <span style={{ marginLeft: '10px', fontSize: '0.8em', color: '#ff3355' }}>ERROR</span>}
        </button>
    );
};

// ============ TYPING EFFECT COMPONENT ============
const TypingText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 50 }) => {
    const [displayed, setDisplayed] = useState('');
    const [showCursor, setShowCursor] = useState(true);

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayed(text.slice(0, i + 1));
                i++;
            } else {
                clearInterval(interval);
                setTimeout(() => setShowCursor(false), 2000);
            }
        }, delay);
        return () => clearInterval(interval);
    }, [text, delay]);

    return (
        <span className="text-mono">
            {displayed}
            <span style={{ opacity: showCursor ? 1 : 0, transition: 'opacity 0.3s' }}>_</span>
        </span>
    );
};

// ============ DATA STREAM PARTICLE ============
const DataStreamParticle: React.FC<{ index: number }> = ({ index }) => {
    const chars = ['0', '1', 'A', 'F', '>', '<', '/', '\\', '|', '█'];
    const [char, setChar] = useState(chars[Math.floor(Math.random() * chars.length)]);

    useEffect(() => {
        const interval = setInterval(() => {
            setChar(chars[Math.floor(Math.random() * chars.length)]);
        }, 200 + Math.random() * 500);
        return () => clearInterval(interval);
    }, []);

    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${5 + (index * 7) % 90}%`,
        bottom: '-20px',
        fontSize: '0.8rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-alert-red)',
        opacity: 0.06,
        animation: `floatUp ${12 + Math.random() * 8}s linear ${index * 0.5}s infinite`,
    };

    return <span style={style}>{char}</span>;
};

// ============ LOCKED OVERLAY COMPONENT ============
const LockedOverlay: React.FC<{
    deckId: string;
    hasRequestedAccess: boolean;
    onRequestAccess: (deckId: string) => void;
    isRequesting?: boolean;
}> = ({ deckId, hasRequestedAccess, onRequestAccess, isRequesting }) => (
    <div
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!hasRequestedAccess && !isRequesting) {
                onRequestAccess(deckId);
            }
        }}
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(20,0,5,0.9) 100%)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
        }}
    >
        {/* Diagonal scan lines */}
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(228, 0, 40, 0.03) 2px, rgba(228, 0, 40, 0.03) 4px)',
            pointerEvents: 'none'
        }} />

        <LockIcon size={32} color="#e40028" />
        <div style={{
            marginTop: '1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.9rem',
            color: '#e40028',
            letterSpacing: '0.15em',
            textShadow: '0 0 10px rgba(228, 0, 40, 0.5)'
        }}>
            CLASSIFIED
        </div>
        <div style={{
            marginTop: '0.5rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: '#666',
            letterSpacing: '0.1em'
        }}>
            ACCESS RESTRICTED
        </div>
        <button
            disabled={hasRequestedAccess || isRequesting}
            style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                background: hasRequestedAccess ? 'rgba(76, 175, 80, 0.15)' : 'transparent',
                border: `1px solid ${hasRequestedAccess ? '#4CAF50' : '#e40028'}`,
                color: hasRequestedAccess ? '#4CAF50' : '#e40028',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                cursor: hasRequestedAccess || isRequesting ? 'not-allowed' : 'pointer',
                opacity: isRequesting ? 0.6 : 1,
                transition: 'all 0.2s'
            }}
        >
            {isRequesting ? 'REQUESTING...' : hasRequestedAccess ? '✓ REQUESTED' : 'REQUEST ACCESS'}
        </button>
    </div>
);

// ============ DECK CARD COMPONENT ============
const DeckCard: React.FC<{
    deck: Deck;
    index: number;
    isLocked: boolean;
    sectionTitle: string;
    hasRequestedAccess: boolean;
    isRequesting: boolean;
    onRequestAccess: (deckId: string) => void;
}> = ({ deck, index, isLocked, sectionTitle, hasRequestedAccess, isRequesting, onRequestAccess }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [checkHovered, setCheckHovered] = useState(false);
    const { hasOpened, isRead, toggleRead } = useDeckReadStatus();

    const CardContent = (
        <div
            className="deck-card"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                position: 'relative',
                background: 'var(--glass-surface)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--glass-border)',
                padding: '2rem',
                transition: 'all 0.3s var(--ease-snap)',
                transform: isHovered && !isLocked ? 'scale(1.02) translateY(-4px)' : 'scale(1)',
                boxShadow: isHovered && !isLocked
                    ? '0 0 30px rgba(228, 0, 40, 0.3), inset 0 0 20px rgba(228, 0, 40, 0.05)'
                    : 'none',
                borderColor: isHovered && !isLocked ? 'var(--color-alert-red)' : 'var(--glass-border)',
                animationDelay: `${index * 0.1}s`,
                overflow: 'hidden',
            }}
        >
            {/* Corner Brackets */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', borderTop: '2px solid var(--color-alert-red)', borderLeft: '2px solid var(--color-alert-red)' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', borderTop: '2px solid var(--color-alert-red)', borderRight: '2px solid var(--color-alert-red)' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '20px', height: '20px', borderBottom: '2px solid var(--color-alert-red)', borderLeft: '2px solid var(--color-alert-red)' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderBottom: '2px solid var(--color-alert-red)', borderRight: '2px solid var(--color-alert-red)' }} />

            {/* Status Indicator */}
            <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isLocked ? '#666' : 'var(--color-alert-red)',
                    animation: isLocked ? 'none' : 'pulse 2s ease-in-out infinite',
                    boxShadow: isLocked ? 'none' : '0 0 10px var(--color-alert-red)',
                }} />
                <span className="text-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: isLocked ? '#666' : 'var(--color-alert-red)' }}>
                    {isLocked ? 'LOCKED' : deck.status}
                </span>
            </div>

            {/* Category Badge */}
            <div style={{ marginBottom: '1rem' }}>
                <span className="text-mono text-muted" style={{
                    fontSize: '0.7rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    padding: '0.25rem 0.5rem',
                    border: '1px solid var(--color-grid)',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                }}>
                    <ChartIcon size={12} color="currentColor" /> {sectionTitle}
                </span>
            </div>

            {/* Title */}
            <h3 style={{
                fontFamily: 'var(--font-head)',
                fontSize: '1.4rem',
                fontWeight: 700,
                marginBottom: '0.75rem',
                color: 'var(--color-signal-white)',
                letterSpacing: '-0.02em',
            }}>
                {deck.title}
            </h3>

            {/* Description */}
            <p className="text-muted" style={{
                fontSize: '0.9rem',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
            }}>
                {deck.description}
            </p>

            {/* CTA Arrow */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: isLocked ? '#666' : 'var(--color-alert-red)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                fontWeight: 500,
            }}>
                <span>{isLocked ? 'RESTRICTED' : 'VIEW DECK'}</span>
                {!isLocked && (
                    <span style={{
                        display: 'inline-block',
                        transition: 'transform 0.3s var(--ease-snap)',
                        transform: isHovered ? 'translateX(8px)' : 'translateX(0)',
                    }}>
                        →
                    </span>
                )}
            </div>

            {/* Scan Line Sweep on Hover (unlocked only) */}
            {isHovered && !isLocked && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, var(--color-alert-red), transparent)',
                    animation: 'scanSweep 1s ease-out',
                }} />
            )}

            {/* Locked Overlay */}
            {isLocked && (
                <LockedOverlay
                    deckId={deck.id}
                    hasRequestedAccess={hasRequestedAccess}
                    onRequestAccess={onRequestAccess}
                    isRequesting={isRequesting}
                />
            )}

            {/* Read Status Checkmark (bottom-right) */}
            {!isLocked && (
                <div
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (hasOpened(deck.id)) {
                            toggleRead(deck.id);
                        }
                    }}
                    onMouseEnter={() => setCheckHovered(true)}
                    onMouseLeave={() => setCheckHovered(false)}
                    style={{
                        position: 'absolute',
                        bottom: '1rem',
                        right: '1.5rem',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: hasOpened(deck.id) ? 'pointer' : 'not-allowed',
                        opacity: hasOpened(deck.id) ? 1 : 0.25,
                        transition: 'all 0.2s ease',
                        transform: checkHovered && hasOpened(deck.id) ? 'scale(1.15)' : 'scale(1)',
                        zIndex: 5,
                    }}
                    title={
                        isRead(deck.id)
                            ? 'Marked as read ✓'
                            : hasOpened(deck.id)
                                ? 'Click to mark as read'
                                : 'Open deck to enable read mark'
                    }
                >
                    {/* Checkmark box */}
                    <div style={{
                        width: '18px',
                        height: '18px',
                        border: `2px solid ${isRead(deck.id) ? '#4CAF50' : hasOpened(deck.id) ? 'var(--color-alert-red)' : '#444'}`,
                        borderRadius: '3px',
                        background: isRead(deck.id) ? '#4CAF50' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: isRead(deck.id) ? '0 0 8px rgba(76, 175, 80, 0.5)' : checkHovered && hasOpened(deck.id) ? '0 0 8px rgba(228, 0, 40, 0.3)' : 'none',
                    }}>
                        {isRead(deck.id) && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </div>
                </div>
            )}

            {/* Super Admin Review Panel - ONLY for super_admin with review mode ON */}
            {!isLocked && <AdminReviewPanel deckId={deck.id} />}
        </div>
    );

    // If locked, render as div; if unlocked, render as Link
    if (isLocked) {
        return CardContent;
    }

    return (
        <Link to={deck.route} style={{ textDecoration: 'none', color: 'inherit' }}>
            {CardContent}
        </Link>
    );
};

// ============ DECK HUB CONTENT ============
const DeckHubContent: React.FC = () => {
    usePageTitle('Data Room');
    const { isAuthenticated, user, accessibleDecks, loading } = useDeckHubAuth();
    const { hasPendingRequest, requestAccess } = useDeckAccessRequests();
    const [requestingDeckId, setRequestingDeckId] = useState<string | null>(null);

    // Get decks organized by section from config
    const sectionedDecks = getDecksGroupedBySection();

    const isDeckLocked = (deckId: string): boolean => {
        if (!isAuthenticated) return true;
        return !accessibleDecks.includes(deckId);
    };

    // Count what is actually on the page. The registry carries entries the data
    // room plan does not place in a section (the one-pager is the site home),
    // so `DECKS.length` overstates the number of cards a visitor can see.
    const visibleDecks = Array.from(sectionedDecks.values()).flat();
    const visibleCount = visibleDecks.length;
    const unlockedCount = visibleDecks.filter(deck => !isDeckLocked(deck.id)).length;

    const handleRequestAccess = async (deckId: string) => {
        setRequestingDeckId(deckId);
        const result = await requestAccess(deckId);
        if (!result.success) {
            console.error('Failed to request access:', result.error);
        }
        setRequestingDeckId(null);
    };

    // Override body styles for scrolling
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalHeight = document.body.style.height;
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.height = originalHeight;
        };
    }, []);

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-void)'
            }}>
                <div className="text-mono text-muted">INITIALIZING ACCESS MATRIX...</div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--color-void)',
            position: 'relative',
            overflowX: 'hidden',
            overflowY: 'auto',
        }}>
            {/* Background Effects */}
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `
                    linear-gradient(30deg, var(--color-grid) 12%, transparent 12.5%, transparent 87%, var(--color-grid) 87.5%, var(--color-grid)),
                    linear-gradient(150deg, var(--color-grid) 12%, transparent 12.5%, transparent 87%, var(--color-grid) 87.5%, var(--color-grid)),
                    linear-gradient(30deg, var(--color-grid) 12%, transparent 12.5%, transparent 87%, var(--color-grid) 87.5%, var(--color-grid)),
                    linear-gradient(150deg, var(--color-grid) 12%, transparent 12.5%, transparent 87%, var(--color-grid) 87.5%, var(--color-grid)),
                    linear-gradient(60deg, rgba(51,51,51,0.5) 25%, transparent 25.5%, transparent 75%, rgba(51,51,51,0.5) 75%, rgba(51,51,51,0.5)),
                    linear-gradient(60deg, rgba(51,51,51,0.5) 25%, transparent 25.5%, transparent 75%, rgba(51,51,51,0.5) 75%, rgba(51,51,51,0.5))
                `,
                backgroundSize: '80px 140px',
                backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px',
                opacity: 0.03,
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
                pointerEvents: 'none',
                zIndex: 1,
                opacity: 0.3,
            }} />

            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
                {[...Array(6)].map((_, i) => (
                    <DataStreamParticle key={i} index={i} />
                ))}
            </div>

            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.07, pointerEvents: 'none', zIndex: 0 }}>
                <RadarNode size="1200px" type="radar" />
            </div>

            {/* Identity bar. Deliberately one slim row that never wraps into a
                block — the long emulation notice sits in the page flow below,
                where it can scroll away instead of holding a fifth of a phone
                screen for the whole session. */}
            <div className="pf-topbar">
                <div className="pf-topbar__left">
                    <Link to="/" className="pf-topbar__home">
                        ←&nbsp;<span className="pf-topbar__home-label">ARRESTDELTA</span>
                    </Link>
                </div>
                <div className="pf-topbar__right">
                    {isAuthenticated ? (
                        <>
                            {/* Review mode toggle — emulated super admin only */}
                            <SuperAdminReviewToggle />
                            <span className="pf-topbar__identity">● {user?.email}</span>
                            <span className="pf-topbar__count">{unlockedCount}/{visibleCount}</span>
                            <Link to="/admin/provision" className="pf-topbar__admin">
                                ADMIN
                            </Link>
                            {/* Replaces LOGOUT: with no auth to end, switching
                                identity is the meaningful control here. */}
                            <PersonaSwitcher />
                        </>
                    ) : (
                        <span className="pf-topbar__count">LOADING...</span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="pf-hub__content">
                <EmulationBanner variant="hub" />

                {/* Hero Section */}
                <header className="pf-hub__hero">
                    <div className="animate-fade-in-up" style={{ marginBottom: '1.5rem' }}>
                        <span className="text-mono text-muted" style={{
                            fontSize: '0.75rem',
                            letterSpacing: '0.2em',
                            padding: '0.5rem 1rem',
                            border: '1px solid var(--color-grid)',
                            display: 'inline-block',
                        }}>
                            ARRESTDELTA // ARCHIVED DATA ROOM
                        </span>
                    </div>

                    <h1
                        className="text-huge animate-fade-in-up"
                        style={{
                            fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                            marginBottom: '1.5rem',
                            lineHeight: 0.95,
                        }}
                    >
                        DATA <span className="text-red">ROOM</span>
                    </h1>

                    <div className="text-muted animate-fade-in-up" style={{ fontSize: '1.1rem', animationDelay: '0.2s' }}>
                        <TypingText text="Investor materials organised for efficient diligence. Every deck is open." delay={50} />
                    </div>

                    {/* Stats Row */}
                    <div className="pf-hub__stats animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        {[
                            { label: 'TOTAL DECKS', value: visibleCount },
                            { label: 'UNLOCKED', value: isAuthenticated ? unlockedCount : '-' },
                            { label: 'ENFORCEMENT', value: 'NONE' },
                        ].map((stat, i) => (
                            <div key={i} className="pf-hub__stat">
                                <div className="pf-hub__stat-value">{stat.value}</div>
                                <div className="pf-hub__stat-label">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="animate-fade-in-up" style={{
                        marginTop: '2.5rem',
                        fontSize: '0.8rem',
                        color: '#666',
                        fontFamily: 'var(--font-mono)',
                        animationDelay: '0.4s',
                        maxWidth: '640px',
                        marginInline: 'auto',
                        lineHeight: 1.7,
                    }}>
                        {EMULATION_COPY.hub}
                    </div>
                </header>

                {/* The discovery surface for the permission model. The header
                    switcher is easy to walk past; this is not. */}
                <ExploreAccessPanel unlockedCount={unlockedCount} totalCount={visibleCount} />

                <AccessModelNote />

                {/* Data Room Sections */}
                {Array.from(sectionedDecks.entries()).map(([section, decks], sectionIndex) => (
                    <section key={section.id} style={{ maxWidth: '1400px', marginInline: 'auto', marginBottom: '4rem' }}>
                        {/* Section Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: section.isGated ? '1rem' : '2rem' }}>
                            <div style={{ width: '30px', height: '2px', background: 'var(--color-alert-red)' }} />
                            <h2 className="text-mono" style={{ fontSize: '0.9rem', letterSpacing: '0.15em', color: 'var(--color-signal-white)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {section.title}
                                {section.isGated && section.gatedBadge && (
                                    <span style={{
                                        fontSize: '0.65rem',
                                        padding: '0.25rem 0.5rem',
                                        border: '1px solid var(--color-alert-red)',
                                        color: 'var(--color-alert-red)',
                                        background: 'rgba(228, 0, 40, 0.1)',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {section.gatedBadge}
                                    </span>
                                )}
                            </h2>
                            <div style={{ flex: 1, height: '1px', background: 'var(--color-grid)' }} />
                        </div>

                        {/* Section Description (for non-gated) or Subheader (for gated) */}
                        {section.description && !section.isGated && (
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '2rem', maxWidth: '600px' }}>
                                {section.description}
                            </p>
                        )}
                        {section.isGated && section.gatedSubheader && (
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '2rem', fontStyle: 'italic' }}>
                                {section.gatedSubheader}
                            </p>
                        )}

                        {/* Deck Grid */}
                        <div className="pf-hub__grid">
                            {decks.map((deck, i) => (
                                <DeckCard
                                    key={deck.id}
                                    deck={deck}
                                    index={sectionIndex * 10 + i}
                                    isLocked={isDeckLocked(deck.id)}
                                    sectionTitle={section.title}
                                    hasRequestedAccess={hasPendingRequest(deck.id)}
                                    isRequesting={requestingDeckId === deck.id}
                                    onRequestAccess={handleRequestAccess}
                                />
                            ))}
                        </div>

                        {/* Gated Section Footer */}
                        {section.isGated && section.gatedFooter && (
                            <p className="text-muted text-mono" style={{
                                fontSize: '0.75rem',
                                marginTop: '1.5rem',
                                textAlign: 'center',
                                letterSpacing: '0.05em'
                            }}>
                                {section.gatedFooter}
                            </p>
                        )}
                    </section>
                ))}

                {/* Leadership Bios Section */}
                {/* Book Meeting Section */}
                <div style={{
                    maxWidth: '1400px',
                    marginInline: 'auto',
                    marginBottom: '6rem',
                    textAlign: 'center',
                    padding: '3rem',
                    background: 'linear-gradient(180deg, rgba(228, 0, 40, 0.05) 0%, transparent 100%)',
                    borderTop: '1px solid rgba(228, 0, 40, 0.2)',
                    borderBottom: '1px solid rgba(228, 0, 40, 0.2)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(228, 0, 40, 0.02) 10px, rgba(228, 0, 40, 0.02) 20px)',
                        pointerEvents: 'none'
                    }} />

                    <h3 className="text-huge" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                        READY TO <span className="text-red">ENGAGE?</span>
                    </h3>
                    <p className="text-muted" style={{ maxWidth: '600px', marginInline: 'auto', marginBottom: '0.75rem' }}>
                        Schedule a direct briefing with our leadership team to discuss the opportunity.
                    </p>
                    <p className="text-mono" style={{ maxWidth: '600px', marginInline: 'auto', marginBottom: '2rem', fontSize: '0.7rem', color: '#777', lineHeight: 1.7 }}>
                        Preserved from the live data room. The button still fires the original
                        <code style={{ color: '#999' }}> request_meeting </code>
                        call — now against the local emulation, where it lands in the admin
                        notification queue. No email, no calendar, no network request.
                    </p>

                    <BookMeetingButton />
                </div>

                <LeadershipBiosSection />

                {/* Footer */}
                <footer style={{ textAlign: 'center', marginTop: '4rem', paddingBottom: '2rem' }}>
                    <Link to="/" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                        ← BACK TO MAIN SITE
                    </Link>
                </footer>
            </div>

            {/* Keyframes */}
            <style>{`
                @keyframes floatUp {
                    0% { transform: translateY(0); opacity: 0; }
                    10% { opacity: 0.15; }
                    90% { opacity: 0.15; }
                    100% { transform: translateY(-100vh); opacity: 0; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.9); }
                }
                @keyframes scanSweep {
                    0% { transform: translateY(0); opacity: 1; }
                    100% { transform: translateY(100%); opacity: 0; }
                }
                body::-webkit-scrollbar {
                    width: 6px;
                    height: 0;
                }
                body {
                    scrollbar-width: thin;
                    overflow-x: hidden !important;
                }
            `}</style>
        </div>
    );
};

// ============ SUPER ADMIN REVIEW TOGGLE (only for super_admin) ============
const SuperAdminReviewToggle: React.FC = () => {
    const { isSuperAdmin, reviewModeEnabled, toggleReviewMode } = useSuperAdminReview();

    // CRITICAL: Render absolutely nothing for non-super-admins
    if (!isSuperAdmin) return null;

    return (
        <button
            onClick={toggleReviewMode}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.6rem',
                background: reviewModeEnabled ? 'rgba(228, 0, 40, 0.15)' : 'transparent',
                border: `1px solid ${reviewModeEnabled ? 'var(--color-alert-red)' : '#333'}`,
                color: reviewModeEnabled ? 'var(--color-alert-red)' : '#666',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
            }}
        >
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: reviewModeEnabled ? '#e40028' : '#444',
                transition: 'all 0.2s ease',
            }} />
            REVIEW
        </button>
    );
};

// ============ MAIN COMPONENT WITH PROVIDER ============
const DeckHubWithReadStatus: React.FC = () => {
    const { user } = useDeckHubAuth();
    return (
        <SuperAdminReviewProvider>
            <DeckReadStatusProvider userId={user?.id}>
                <DeckHubContent />
            </DeckReadStatusProvider>
        </SuperAdminReviewProvider>
    );
};

const DeckDashboard: React.FC = () => {
    return (
        <DeckHubAuthProvider>
            <DeckHubWithReadStatus />
        </DeckHubAuthProvider>
    );
};

export default DeckDashboard;
