/**
 * NotificationsPage - Admin page for managing notifications
 * 
 * Full-page view of all admin notifications with filtering and actions.
 */

import React, { useState } from 'react';
import { useAdminNotifications, type AdminNotification } from '../../hooks/useAdminNotifications';
import { DECKS } from '../../lib/decks';

// ============ ICONS ============
const UserPlusIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
);

const KeyIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
);

const CheckIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const XIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const RefreshIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
);

const CalendarIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
);

// ============ HELPERS ============
function getDeckTitle(deckId: string): string {
    const deck = DECKS.find(d => d.id === deckId);
    return deck?.title || deckId;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============ FILTER TABS ============
type FilterType = 'all' | 'unread' | 'new_signup' | 'deck_access_request' | 'meeting_request';

// ============ NOTIFICATION ROW ============
type ActionStatus = 'approved' | 'denied' | 'granted' | null;

interface NotificationRowProps {
    notification: AdminNotification;
    onApprove?: (requestId: string, notificationId: string) => void;
    onDeny?: (requestId: string, notificationId: string) => void;
    onGrantAll?: (userId: string, notificationId: string) => void;
    onDismiss: (id: string) => void;
    isActioning?: boolean;
    actionStatus?: ActionStatus;
}

const NotificationRow: React.FC<NotificationRowProps> = ({
    notification,
    onApprove,
    onDeny,
    onGrantAll,
    onDismiss,
    isActioning,
    actionStatus
}) => {
    const isSignup = notification.type === 'new_signup';
    const isAccessRequest = notification.type === 'deck_access_request';
    const isMeetingRequest = notification.type === 'meeting_request';

    // Determine row background based on status
    const getRowBackground = () => {
        if (actionStatus === 'approved' || actionStatus === 'granted') {
            return 'rgba(76, 175, 80, 0.08)';
        }
        if (actionStatus === 'denied') {
            return 'rgba(228, 0, 40, 0.06)';
        }
        return notification.is_read ? 'transparent' : 'rgba(228, 0, 40, 0.03)';
    };

    return (
        <tr style={{
            borderBottom: '1px solid #222',
            background: getRowBackground(),
            transition: 'background 0.3s'
        }}>
            {/* Type */}
            <td style={{ padding: '1rem', width: '50px' }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: actionStatus === 'approved' || actionStatus === 'granted'
                        ? 'rgba(76, 175, 80, 0.25)'
                        : actionStatus === 'denied'
                            ? 'rgba(228, 0, 40, 0.25)'
                            : isSignup
                                ? 'rgba(76, 175, 80, 0.15)'
                                : 'rgba(228, 0, 40, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: actionStatus === 'approved' || actionStatus === 'granted'
                        ? '#4CAF50'
                        : actionStatus === 'denied'
                            ? '#e40028'
                            : isSignup ? '#4CAF50' : '#e40028',
                    transition: 'all 0.3s'
                }}>
                    {actionStatus === 'approved' || actionStatus === 'granted' ? (
                        <CheckIcon size={18} />
                    ) : actionStatus === 'denied' ? (
                        <XIcon size={18} />
                    ) : isSignup ? (
                        <UserPlusIcon size={18} />
                    ) : isMeetingRequest ? (
                        <CalendarIcon size={18} />
                    ) : (
                        <KeyIcon size={18} />
                    )}
                </div>
            </td>

            {/* Details */}
            <td style={{ padding: '1rem' }}>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>
                    {notification.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#888' }}>
                    {notification.user_email}
                </div>
                {isAccessRequest && notification.metadata?.deck_id && (
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#e40028',
                        fontFamily: 'var(--font-mono)',
                        marginTop: '0.25rem'
                    }}>
                        Deck: {getDeckTitle(notification.metadata.deck_id)}
                    </div>
                )}
                {isMeetingRequest && (
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#666',
                        marginTop: '0.25rem',
                        fontStyle: 'italic',
                        maxWidth: '400px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {notification.message || (notification.metadata as any)?.message}
                    </div>
                )}
            </td>

            {/* Status */}
            <td style={{ padding: '1rem', width: '120px' }}>
                {actionStatus ? (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        background: actionStatus === 'approved' || actionStatus === 'granted'
                            ? 'rgba(76, 175, 80, 0.2)'
                            : 'rgba(228, 0, 40, 0.15)',
                        color: actionStatus === 'approved' || actionStatus === 'granted'
                            ? '#4CAF50'
                            : '#e40028',
                        border: `1px solid ${actionStatus === 'approved' || actionStatus === 'granted' ? '#4CAF50' : '#e40028'}`
                    }}>
                        {actionStatus === 'approved' || actionStatus === 'granted' ? (
                            <CheckIcon size={12} />
                        ) : (
                            <XIcon size={12} />
                        )}
                        {actionStatus === 'approved' && 'APPROVED'}
                        {actionStatus === 'denied' && 'DENIED'}
                        {actionStatus === 'granted' && 'GRANTED'}
                    </span>
                ) : (
                    <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        background: notification.is_read ? '#222' : 'rgba(228, 0, 40, 0.15)',
                        color: notification.is_read ? '#666' : '#e40028'
                    }}>
                        {notification.is_read ? 'READ' : 'UNREAD'}
                    </span>
                )}
            </td>

            {/* Date */}
            <td style={{ padding: '1rem', color: '#666', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', width: '180px' }}>
                {formatDate(notification.created_at)}
            </td>

            {/* Actions */}
            <td style={{ padding: '1rem', width: '280px' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* Show action buttons only if no action taken */}
                    {!actionStatus && (
                        <>
                            {isAccessRequest && onApprove && notification.metadata?.request_id && (
                                <button
                                    onClick={() => onApprove(notification.metadata.request_id!, notification.id)}
                                    disabled={isActioning}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.4rem 0.6rem',
                                        background: 'rgba(76, 175, 80, 0.15)',
                                        border: '1px solid #4CAF50',
                                        color: '#4CAF50',
                                        fontSize: '0.65rem',
                                        fontFamily: 'var(--font-mono)',
                                        cursor: isActioning ? 'wait' : 'pointer',
                                        opacity: isActioning ? 0.5 : 1
                                    }}
                                >
                                    <CheckIcon size={12} /> APPROVE
                                </button>
                            )}
                            {isAccessRequest && onDeny && notification.metadata?.request_id && (
                                <button
                                    onClick={() => onDeny(notification.metadata.request_id!, notification.id)}
                                    disabled={isActioning}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.4rem 0.6rem',
                                        background: 'transparent',
                                        border: '1px solid #666',
                                        color: '#888',
                                        fontSize: '0.65rem',
                                        fontFamily: 'var(--font-mono)',
                                        cursor: isActioning ? 'wait' : 'pointer',
                                        opacity: isActioning ? 0.5 : 1
                                    }}
                                >
                                    <XIcon size={12} /> DENY
                                </button>
                            )}
                            {isSignup && onGrantAll && notification.user_id && (
                                <button
                                    onClick={() => onGrantAll(notification.user_id!, notification.id)}
                                    disabled={isActioning}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        padding: '0.4rem 0.6rem',
                                        background: 'rgba(76, 175, 80, 0.15)',
                                        border: '1px solid #4CAF50',
                                        color: '#4CAF50',
                                        fontSize: '0.65rem',
                                        fontFamily: 'var(--font-mono)',
                                        cursor: isActioning ? 'wait' : 'pointer',
                                        opacity: isActioning ? 0.5 : 1
                                    }}
                                >
                                    <CheckIcon size={12} /> GRANT ALL
                                </button>
                            )}
                            <button
                                onClick={() => onDismiss(notification.id)}
                                style={{
                                    padding: '0.4rem 0.6rem',
                                    background: 'transparent',
                                    border: '1px solid #333',
                                    color: '#666',
                                    fontSize: '0.65rem',
                                    fontFamily: 'var(--font-mono)',
                                    cursor: 'pointer'
                                }}
                            >
                                DISMISS
                            </button>
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
};

// ============ MAIN PAGE ============
const NotificationsPage: React.FC = () => {
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        approveRequest,
        denyRequest,
        grantAllDecks,
        refresh
    } = useAdminNotifications();

    const [filter, setFilter] = useState<FilterType>('all');
    const [actioningId, setActioningId] = useState<string | null>(null);
    // Track action status per notification ID
    const [actionStatuses, setActionStatuses] = useState<Record<string, ActionStatus>>({});

    // Filter notifications
    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !n.is_read;
        return n.type === filter;
    });

    // Counts
    const signupCount = notifications.filter(n => n.type === 'new_signup').length;
    const requestCount = notifications.filter(n => n.type === 'deck_access_request').length;
    const meetingCount = notifications.filter(n => n.type === 'meeting_request').length;

    const handleApprove = async (requestId: string, notificationId: string) => {
        setActioningId(requestId);
        const result = await approveRequest(requestId);
        if (result.success) {
            setActionStatuses(prev => ({ ...prev, [notificationId]: 'approved' }));
        }
        setActioningId(null);
    };

    const handleDeny = async (requestId: string, notificationId: string) => {
        setActioningId(requestId);
        const result = await denyRequest(requestId);
        if (result.success) {
            setActionStatuses(prev => ({ ...prev, [notificationId]: 'denied' }));
        }
        setActioningId(null);
    };

    const handleGrantAll = async (userId: string, notificationId: string) => {
        setActioningId(userId);
        const result = await grantAllDecks(userId);
        if (result.success) {
            setActionStatuses(prev => ({ ...prev, [notificationId]: 'granted' }));
        }
        setActioningId(null);
    };

    return (
        <div style={{ padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{
                        color: '#fff',
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        marginBottom: '0.5rem'
                    }}>
                        Notifications
                    </h1>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>
                        Manage user signups and access requests
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'transparent',
                                border: '1px solid #333',
                                color: '#888',
                                fontSize: '0.75rem',
                                fontFamily: 'var(--font-mono)',
                                cursor: 'pointer'
                            }}
                        >
                            MARK ALL READ
                        </button>
                    )}
                    <button
                        onClick={refresh}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: 'transparent',
                            border: '1px solid #e40028',
                            color: '#e40028',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshIcon size={14} /> REFRESH
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                borderBottom: '1px solid #222',
                paddingBottom: '1rem'
            }}>
                {[
                    { key: 'all', label: 'All', count: notifications.length },
                    { key: 'unread', label: 'Unread', count: unreadCount },
                    { key: 'new_signup', label: 'Signups', count: signupCount },
                    { key: 'deck_access_request', label: 'Access Requests', count: requestCount },
                    { key: 'meeting_request', label: 'Meetings', count: meetingCount },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key as FilterType)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: filter === tab.key ? 'rgba(228, 0, 40, 0.1)' : 'transparent',
                            border: `1px solid ${filter === tab.key ? '#e40028' : '#333'}`,
                            color: filter === tab.key ? '#e40028' : '#666',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {tab.label}
                        <span style={{
                            background: filter === tab.key ? '#e40028' : '#333',
                            color: filter === tab.key ? '#fff' : '#888',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.65rem'
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div style={{
                background: '#0a0a0a',
                border: '1px solid #222',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                {loading ? (
                    <div style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: '#666',
                        fontFamily: 'var(--font-mono)'
                    }}>
                        Loading notifications...
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: '#666',
                        fontFamily: 'var(--font-mono)'
                    }}>
                        No notifications found
                    </div>
                ) : (
                    <div className="pf-table-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>TYPE</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>DETAILS</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>STATUS</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>DATE</th>
                                <th style={{ padding: '1rem', textAlign: 'left', color: '#666', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredNotifications.map(notification => (
                                <NotificationRow
                                    key={notification.id}
                                    notification={notification}
                                    onApprove={handleApprove}
                                    onDeny={handleDeny}
                                    onGrantAll={handleGrantAll}
                                    onDismiss={markAsRead}
                                    isActioning={
                                        actioningId === notification.metadata?.request_id ||
                                        actioningId === notification.user_id
                                    }
                                    actionStatus={actionStatuses[notification.id] || null}
                                />
                            ))}
                        </tbody>
                    </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
