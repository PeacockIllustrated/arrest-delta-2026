import React, { useState } from 'react';
import NotificationsPanel from './NotificationsPanel';

interface AdminHeaderProps {
    onMenuClick?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ onMenuClick }) => {
    const [isLinksOpen, setIsLinksOpen] = useState(false);

    return (
        <div className="admin-header" style={{
            height: '80px',
            borderBottom: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
            background: '#0a0a0a',
            zIndex: 10
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="mobile-menu-btn"
                    style={{
                        background: 'transparent',
                        border: '1px solid #333',
                        color: '#e40028',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        display: 'none', // Hidden on desktop via CSS
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>

                <div style={{ color: '#666', fontSize: '0.9rem', letterSpacing: '1px' }}>
                    SYSTEM // OVERVIEW
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    .mobile-menu-btn {
                        display: flex !important;
                    }
                }
            `}</style>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {/* Notifications Panel */}
                <NotificationsPanel />

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: '#e40028', fontSize: '0.8rem', fontWeight: 'bold' }}>LIVE</span>
                    <div style={{
                        width: '12px',
                        height: '12px',
                        background: '#e40028',
                        borderRadius: '50%',
                        boxShadow: '0 0 10px #e40028',
                        animation: 'pulse 2s infinite'
                    }} />
                </div>

                {/* Links Dropdown */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setIsLinksOpen(!isLinksOpen)}
                        style={{
                            background: 'transparent',
                            border: '1px solid #333',
                            color: '#888',
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontFamily: "'Space Mono', monospace",
                            // This is the way back to the data room on a phone,
                            // where the sidebar is behind a hamburger.
                            minHeight: '44px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        QUICK LINKS
                        <span style={{ fontSize: '0.6rem' }}>{isLinksOpen ? '▲' : '▼'}</span>
                    </button>

                    {isLinksOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '0.5rem',
                            background: '#0a0a0a',
                            border: '1px solid #333',
                            minWidth: '180px',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            zIndex: 20
                        }}>
                            {[
                                // The data room is the surface this console
                                // administers, so it leads — a grant made here
                                // is only interesting once you go and see it.
                                { label: 'DATA ROOM', path: '/decks' },
                                { label: 'LANDING PAGE', path: '/' },
                                { label: 'INVESTOR PACK', path: '/investor' },
                                { label: 'BRAND PACK', path: '/brand' }
                            ].map((link) => (
                                <a
                                    key={link.path}
                                    href={link.path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        padding: '0.8rem 1rem',
                                        color: '#ccc',
                                        textDecoration: 'none',
                                        fontSize: '0.75rem',
                                        borderBottom: '1px solid #222',
                                        transition: 'background 0.2s',
                                        display: 'block'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#111'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {link.label} ↗
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default AdminHeader;
