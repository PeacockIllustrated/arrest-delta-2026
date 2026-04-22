import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useRole } from '../../hooks/useRole';
import { isDemoMode, isLiveDemoBypass } from '../../hooks/usePortalData';
import type { UserRole } from './AuthProvider';

interface PortalProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRole;
}

export const PortalProtectedRoute: React.FC<PortalProtectedRouteProps> = ({
    children,
    requiredRole
}) => {
    // Demo mode: portal fully unlocked (no Supabase at all).
    // Live-demo bypass: live Supabase reads, but auth waived for walkthroughs.
    if (isDemoMode() || isLiveDemoBypass()) {
        return <>{children}</>;
    }

    const { user, profile, loading } = useAuth();
    const { hasRole } = useRole();
    const location = useLocation();

    // Show loading state
    if (loading) {
        return (
            <div
                className="portal-root"
                style={{
                    height: '100vh',
                    width: '100vw',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-base)',
                    color: 'var(--accent)',
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid var(--border-default)',
                            borderTopColor: 'var(--accent)',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            margin: '0 auto 16px',
                        }}
                    />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Authenticating...
                    </p>
                </div>
                <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!user) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    // SUPER ADMIN CHECK: Portal is restricted to super_admin users only
    if (profile && profile.role !== 'super_admin') {
        return (
            <div
                className="portal-root"
                style={{
                    height: '100vh',
                    width: '100vw',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0a0a0a',
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                <h1 style={{
                    color: '#e40028',
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    marginBottom: '1rem',
                    fontFamily: "'Space Mono', monospace",
                    letterSpacing: '0.05em'
                }}>
                    403 // ACCESS DENIED
                </h1>
                <p style={{
                    color: '#666',
                    fontSize: '1rem',
                    marginBottom: '2rem',
                    fontFamily: "'Space Mono', monospace"
                }}>
                    Portal access is restricted to administrators.
                </p>
                <div style={{
                    padding: '1rem 2rem',
                    border: '1px solid #333',
                    background: 'rgba(255,255,255,0.02)',
                    fontSize: '0.8rem',
                    color: '#888',
                    fontFamily: "'Space Mono', monospace",
                    marginBottom: '2rem'
                }}>
                    Logged in as: {user.email}
                </div>
                <a
                    href="/"
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'transparent',
                        border: '1px solid #e40028',
                        color: '#e40028',
                        textDecoration: 'none',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                    }}
                >
                    ← BACK TO MAIN SITE
                </a>
            </div>
        );
    }

    // Check role if required (for sub-routes like /portal/admin)
    if (requiredRole && !hasRole(requiredRole)) {
        // Redirect to dashboard with insufficient permissions
        return <Navigate to="/portal/dashboard" replace />;
    }

    return <>{children}</>;
};

export default PortalProtectedRoute;

