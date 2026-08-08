import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../hooks/usePageTitle';

/**
 * ADMIN LOGIN — PRESERVED EXHIBIT
 * ===============================
 *
 * The sign-in flow is intact and still runs end to end: authenticate, read the
 * caller's role from `profiles`, refuse anything that is not `super_admin`.
 * What changed underneath is that all three steps now execute in the browser
 * against the local emulation, so the password field is decorative and the role
 * check consults a table the visitor can edit.
 *
 * The console itself is reachable without any of this — the route guard is
 * disarmed (see `components/admin/ProtectedRoute.tsx`). The form is kept, and
 * the bypass below is made explicit, because pretending the check still means
 * something would be the dishonest option.
 */

const DEMO_ADMIN_EMAIL = 'admin@portfolio.local';

const AdminLogin: React.FC = () => {
    usePageTitle('Admin Login');
    const [email, setEmail] = useState(DEMO_ADMIN_EMAIL);
    const [password, setPassword] = useState('not-checked');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Authenticate
            const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (user) {
                // 2. Check Role
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    // Profile might not exist yet, treat as unauthorized for admin
                    console.error('Profile check failed:', profileError);
                    await supabase.auth.signOut();
                    setError(`ACCESS DENIED: PROFILE ERROR (${profileError.message})`);
                    setLoading(false);
                    return;
                }

                if (profile?.role !== 'super_admin') {
                    await supabase.auth.signOut();
                    setError(`ACCESS DENIED: ROLE IS '${profile?.role?.toUpperCase() || 'NULL'}' NOT SUPER_ADMIN`);
                    setLoading(false);
                    return;
                }

                // 3. Success
                navigate('/admin/dashboard');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message.toUpperCase() : 'AUTHENTICATION FAILED');
            setLoading(false);
        }
    };

    // Custom Red Arrow Cursor SVG
    const cursorUrl = `url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3L10.5 20.5L13.5 13.5L20.5 10.5L3 3Z" fill="%23E40028" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>') 2 2, auto`;

    return (
        <div
            className="admin-login-root"
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
                .admin-login-root, .admin-login-root * {
                    cursor: ${cursorUrl} !important;
                }
                /* Ensure interactive elements keep the cursor */
                .admin-login-root button, 
                .admin-login-root input {
                    cursor: ${cursorUrl} !important;
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
                    SYSTEM ACCESS // <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>RESTRICTED</span> OPEN
                </h2>

                <div style={{
                    border: '1px solid rgba(228, 0, 40, 0.4)',
                    background: 'rgba(228, 0, 40, 0.08)',
                    padding: '0.75rem',
                    marginBottom: '1.5rem',
                    fontSize: '0.65rem',
                    lineHeight: 1.7,
                    color: '#c98b95',
                    letterSpacing: '0.03em'
                }}>
                    EMULATED LOGIN. The password is never checked — there is no server to check it
                    against. The role lookup that follows still runs, but against browser storage.
                    The console behind this screen is open to anyone either way.
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.5rem', opacity: 0.7 }}>EMAIL</label>
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
                        <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '0.5rem', opacity: 0.7 }}>PASSWORD</label>
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
                            marginTop: '1rem',
                            opacity: loading ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading ? 'AUTHENTICATING...' : 'INITIATE SESSION'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/dashboard')}
                        style={{
                            background: 'transparent',
                            color: '#888',
                            border: '1px dashed #333',
                            padding: '0.75rem',
                            fontFamily: 'inherit',
                            fontSize: '0.7rem',
                            letterSpacing: '0.08em',
                            cursor: 'pointer'
                        }}
                    >
                        SKIP — OPEN THE CONSOLE UNAUTHENTICATED
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
