import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/landing.css';

/**
 * SITE GATE — PRESERVED EXHIBIT
 * =============================
 *
 * This was the front door. Nothing on the site rendered until Supabase Auth
 * returned a session from here, and the account it created was the identity the
 * data room's per-deck grants were attached to.
 *
 * Nothing routes here any more — the guard that redirected anonymous visitors
 * has been removed (see `components/SiteProtectedRoute.tsx`). The screen is kept
 * because it is the first step of the process this portfolio piece documents,
 * and it still runs: submitting the form creates a local identity and drops you
 * into the site. It just no longer decides anything.
 */

type AuthMode = 'signin' | 'signup';

const SiteGatePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mode, setMode] = useState<AuthMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

    // Custom Red Arrow Cursor SVG
    const cursorUrl = `url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3L10.5 20.5L13.5 13.5L20.5 10.5L3 3Z" fill="%23E40028" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>') 2 2, auto`;

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message.toUpperCase());
            } else {
                navigate(from, { replace: true });
            }
        } catch (err) {
            setError('AN UNEXPECTED ERROR OCCURRED');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Validation
        if (password !== confirmPassword) {
            setError('PASSWORDS DO NOT MATCH');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('PASSWORD MUST BE AT LEAST 6 CHARACTERS');
            setLoading(false);
            return;
        }

        if (!name.trim()) {
            setError('NAME IS REQUIRED');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: name.trim(),
                    },
                },
            });

            if (error) {
                setError(error.message.toUpperCase());
            } else if (data.user) {
                // Check if email confirmation is required
                if (data.session) {
                    // User is confirmed and logged in
                    navigate(from, { replace: true });
                } else {
                    // Email confirmation required
                    setSuccess('ACCOUNT CREATED. CHECK YOUR EMAIL TO CONFIRM.');
                    setMode('signin');
                    setPassword('');
                    setConfirmPassword('');
                }
            }
        } catch (err) {
            setError('AN UNEXPECTED ERROR OCCURRED');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(mode === 'signin' ? 'signup' : 'signin');
        setError(null);
        setSuccess(null);
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div
            className="site-gate-root"
            style={{
                height: '100vh',
                width: '100vw',
                background: '#0a0a0a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Space Mono', monospace",
                color: '#e40028',
                cursor: cursorUrl
            }}
        >
            <style>{`
                /* Override global cursor: none !important from brand.css */
                .site-gate-root, .site-gate-root * {
                    cursor: ${cursorUrl} !important;
                }
                .site-gate-root button, 
                .site-gate-root input {
                    cursor: ${cursorUrl} !important;
                }
                .site-gate-root input:focus {
                    border-color: #e40028 !important;
                }
                .toggle-link {
                    color: #666;
                    font-size: 0.75rem;
                    text-decoration: none;
                    transition: color 0.2s;
                }
                .toggle-link:hover {
                    color: #e40028;
                }
            `}</style>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2rem',
                border: '1px solid #333',
                position: 'relative'
            }}>
                {/* Decorative Corner Markers */}
                <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: '10px', height: '10px', borderTop: '2px solid #e40028', borderLeft: '2px solid #e40028' }} />
                <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '10px', height: '10px', borderTop: '2px solid #e40028', borderRight: '2px solid #e40028' }} />
                <div style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: '10px', height: '10px', borderBottom: '2px solid #e40028', borderLeft: '2px solid #e40028' }} />
                <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '10px', height: '10px', borderBottom: '2px solid #e40028', borderRight: '2px solid #e40028' }} />

                <h2 style={{
                    fontSize: '1.2rem',
                    marginBottom: '2rem',
                    textAlign: 'center',
                    letterSpacing: '2px',
                    borderBottom: '1px solid #333',
                    paddingBottom: '1rem'
                }}>
                    {mode === 'signin' ? 'ACCESS RESTRICTED' : 'CREATE ACCOUNT'}
                </h2>

                <div style={{
                    border: '1px solid rgba(228, 0, 40, 0.4)',
                    background: 'rgba(228, 0, 40, 0.08)',
                    padding: '0.75rem',
                    marginBottom: '1.75rem',
                    fontSize: '0.65rem',
                    lineHeight: 1.75,
                    color: '#c98b95',
                    letterSpacing: '0.03em'
                }}>
                    PRESERVED EXHIBIT. This screen used to gate the entire site. Nothing routes
                    here now and no credentials are checked — the form creates a local identity
                    and lets you through.
                </div>

                <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Name field - only for signup */}
                    {mode === 'signup' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.5rem', opacity: 0.7 }}>IDENTITY</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Full Name"
                                required
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid #333',
                                    padding: '0.8rem',
                                    color: 'white',
                                    fontFamily: 'inherit',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                            {mode === 'signin' ? 'EMAIL' : 'EMAIL'}
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid #333',
                                padding: '0.8rem',
                                color: 'white',
                                fontFamily: 'inherit',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                            {mode === 'signin' ? 'PASSWORD' : 'CREATE PASSWORD'}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid #333',
                                padding: '0.8rem',
                                color: 'white',
                                fontFamily: 'inherit',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Confirm password - only for signup */}
                    {mode === 'signup' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.5rem', opacity: 0.7 }}>CONFIRM PASSWORD</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid #333',
                                    padding: '0.8rem',
                                    color: 'white',
                                    fontFamily: 'inherit',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    )}

                    {error && (
                        <div style={{
                            color: '#e40028',
                            fontSize: '0.8rem',
                            textAlign: 'center',
                            border: '1px solid #e40028',
                            padding: '0.5rem',
                            background: 'rgba(228, 0, 40, 0.1)'
                        }}>
                            ERROR: {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            color: '#4CAF50',
                            fontSize: '0.8rem',
                            textAlign: 'center',
                            border: '1px solid #4CAF50',
                            padding: '0.5rem',
                            background: 'rgba(76, 175, 80, 0.1)'
                        }}>
                            ✓ {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: '#e40028',
                            color: 'white',
                            border: 'none',
                            padding: '1rem',
                            fontFamily: 'inherit',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            marginTop: '0.5rem',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading
                            ? (mode === 'signin' ? 'AUTHENTICATING...' : 'CREATING ACCOUNT...')
                            : (mode === 'signin' ? 'INITIATE SESSION' : 'REGISTER')}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="toggle-link"
                            style={{ background: 'none', border: 'none', fontFamily: 'inherit' }}
                        >
                            {mode === 'signin'
                                ? 'NO ACCOUNT? REGISTER →'
                                : '← ALREADY REGISTERED? SIGN IN'}
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', borderTop: '1px solid #222', paddingTop: '1rem' }}>
                        <Link
                            to="/decks"
                            className="toggle-link"
                            style={{ fontFamily: 'inherit', fontSize: '0.7rem' }}
                        >
                            SKIP — GO STRAIGHT TO THE DATA ROOM →
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SiteGatePage;
