import React from 'react';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import EmulationBanner from '../portfolio/EmulationBanner';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    // Custom Red Arrow Cursor SVG
    const cursorUrl = `url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3L10.5 20.5L13.5 13.5L20.5 10.5L3 3Z" fill="%23E40028" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>') 2 2, auto`;

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            width: '100%',
            background: '#0a0a0a',
            color: '#e0e0e0',
            fontFamily: "'Space Mono', monospace",
            overflow: 'hidden',
            cursor: cursorUrl
        }} className="admin-root">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999 }}
                    onClick={() => setSidebarOpen(false)}
                    className="mobile-overlay"
                />
            )}

            <div className={`admin-sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
                <AdminSidebar onClose={() => setSidebarOpen(false)} />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <EmulationBanner variant="admin" />
                <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
                <main style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '2rem',
                    position: 'relative'
                }}>
                    {/* Grid Background Effect */}
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                        backgroundSize: '50px 50px',
                        pointerEvents: 'none',
                        zIndex: 0
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {children}
                    </div>
                </main>
            </div>
            <style>{`
                /* Override global cursor: none !important from brand.css */
                .admin-root, .admin-root * {
                    cursor: ${cursorUrl} !important;
                }
                /* Ensure interactive elements keep the cursor */
                .admin-root button, 
                .admin-root a, 
                .admin-root input, 
                .admin-root select {
                    cursor: ${cursorUrl} !important;
                }
                /* Specific pointer cursor for clickable items if needed, but keeping brand cursor for now as requested */
                .admin-root button:hover,
                .admin-root a:hover {
                    cursor: ${cursorUrl} !important;
                }

                /* Mobile Sidebar Styles */
                @media (max-width: 768px) {
                    .admin-sidebar-wrapper {
                        position: fixed;
                        top: 0;
                        left: 0;
                        height: 100%;
                        z-index: 1000;
                        transform: translateX(-100%);
                        transition: transform 0.3s ease;
                    }
                    .admin-sidebar-wrapper.open {
                        transform: translateX(0);
                    }
                    .mobile-overlay {
                        display: block;
                    }
                }
                @media (min-width: 769px) {
                    .mobile-overlay {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminLayout;
