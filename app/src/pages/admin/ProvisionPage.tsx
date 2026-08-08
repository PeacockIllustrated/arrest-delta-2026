import React, { useState, useEffect } from 'react';
import { supabase, isEmulatedBackend } from '../../lib/supabase';
import { DECKS } from '../../lib/decks';
import { usePageTitle } from '../../hooks/usePageTitle';
import EmulatedControlNotice from '../../components/portfolio/EmulatedControlNotice';

interface ProvisionedAccess {
    email: string;
    decks: string[];
    grantedAt: string;
}

interface UserWithAccess {
    id: string;
    email: string;
    name: string | null;
    created_at: string;
    decks: string[];
}

interface DeckReadStatus {
    deck_id: string;
    opened_at: string | null;
    marked_read_at: string | null;
}

// Toggle Switch Component
const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
    <div
        onClick={disabled ? undefined : onChange}
        style={{
            width: '36px',
            height: '20px',
            background: checked ? '#e40028' : '#333',
            borderRadius: '10px',
            position: 'relative',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            opacity: disabled ? 0.5 : 1,
            flexShrink: 0
        }}
    >
        <div
            style={{
                width: '16px',
                height: '16px',
                background: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: checked ? '18px' : '2px',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}
        />
    </div>
);

const ProvisionPage: React.FC = () => {
    usePageTitle('Provision Access');

    // Form state
    const [email, setEmail] = useState('');
    const [selectedDecks, setSelectedDecks] = useState<string[]>([]);
    const [existingAccess, setExistingAccess] = useState<string[]>([]);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<ProvisionedAccess | null>(null);
    const [recentUsers, setRecentUsers] = useState<UserWithAccess[]>([]);
    const [allUsers, setAllUsers] = useState<UserWithAccess[]>([]);
    const [userExists, setUserExists] = useState<boolean | null>(null);
    const [checkingUser, setCheckingUser] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Super Admin State
    const [currentUserRole, setCurrentUserRole] = useState<string>('viewer');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminLoading, setAdminLoading] = useState(false);
    const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Deck Read Status State
    const [deckReadStatus, setDeckReadStatus] = useState<Map<string, DeckReadStatus>>(new Map());
    const [togglingRead, setTogglingRead] = useState<string | null>(null);

    // Fetch recent provisioned users on mount
    useEffect(() => {
        fetchRecentUsers();
        fetchAllUsers();
    }, []);

    const fetchAllUsers = async () => {
        try {
            const { data, error } = await supabase
                .rpc('get_recent_users_with_access', { p_limit: 100 });

            if (error) {
                console.error('Error fetching all users:', error);
                return;
            }

            if (data) {
                const users: UserWithAccess[] = data.map((user: { user_id: string; email: string; name: string | null; created_at: string; deck_count: number }) => ({
                    id: user.user_id,
                    email: user.email,
                    name: user.name,
                    created_at: user.created_at,
                    decks: Array(user.deck_count).fill('')
                }));
                setAllUsers(users);
            }
        } catch (err) {
            console.error('Error fetching all users:', err);
        }
    };

    const fetchRecentUsers = async () => {
        try {
            const { data, error } = await supabase
                .rpc('get_recent_users_with_access', { p_limit: 10 });

            if (error) {
                console.error('Error fetching recent users:', error);
                return;
            }

            if (data) {
                const usersWithAccess: UserWithAccess[] = data.map((user: { user_id: string; email: string; name: string | null; created_at: string; deck_count: number }) => ({
                    id: user.user_id,
                    email: user.email,
                    name: user.name,
                    created_at: user.created_at,
                    decks: Array(user.deck_count).fill('')
                }));
                setRecentUsers(usersWithAccess);
            }
        } catch (err) {
            console.error('Error fetching recent users:', err);
        }
    };

    const fetchCurrentUserRole = async () => {
        // In the portfolio build this console *is* the super-admin exhibit, and
        // the route guard in front of it has been disarmed — so whoever opened
        // it sees the full surface regardless of which persona is active on the
        // data room. The original lookup is kept below because it is what the
        // page actually did: resolve the session, read `profiles.role`, and hide
        // the privileged controls from anyone who was not a super admin.
        if (isEmulatedBackend) {
            setCurrentUserRole('super_admin');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            if (data) {
                setCurrentUserRole(data.role || 'viewer');
            }
        }
    };

    useEffect(() => {
        fetchCurrentUserRole();
    }, []);

    const handleSuperAdminAction = async (action: 'promote' | 'demote') => {
        if (!adminEmail || !adminEmail.includes('@')) {
            setAdminMessage({ type: 'error', text: 'Invalid email' });
            return;
        }

        setAdminLoading(true);
        setAdminMessage(null);

        try {
            const rpcName = action === 'promote' ? 'set_super_admin' : 'remove_super_admin';
            const { data, error } = await supabase.rpc(rpcName, { p_email: adminEmail });

            if (error) throw error;

            if (data === 'user_not_found') {
                setAdminMessage({ type: 'error', text: 'User not found' });
            } else {
                setAdminMessage({
                    type: 'success',
                    text: action === 'promote' ? 'User promoted to Super Admin' : 'User demoted to Viewer'
                });
                setAdminEmail('');
            }
        } catch (err) {
            console.error('Super Admin Action Error:', err);
            setAdminMessage({ type: 'error', text: 'Action failed' });
        } finally {
            setAdminLoading(false);
        }
    };

    const handleDeckToggle = (deckId: string) => {
        setSelectedDecks(prev =>
            prev.includes(deckId)
                ? prev.filter(d => d !== deckId)
                : [...prev, deckId]
        );
    };

    const handleGrantAll = () => {
        setSelectedDecks(DECKS.map(d => d.id));
    };

    const handleClearAll = () => {
        setSelectedDecks([]);
    };

    // Check if user exists and fetch their current deck access
    const checkUserAndFetchAccess = async (emailToCheck: string) => {
        if (!emailToCheck.trim() || !emailToCheck.includes('@')) {
            setUserExists(null);
            setExistingAccess([]);
            setSelectedDecks([]);
            return;
        }

        setCheckingUser(true);
        try {
            const normalizedEmail = emailToCheck.toLowerCase().trim();

            // Check if user exists
            const { data: exists, error: existsError } = await supabase
                .rpc('check_user_exists', { p_email: normalizedEmail });

            if (existsError) {
                console.error('Error checking user:', existsError);
                setUserExists(null);
                setExistingAccess([]);
                return;
            }

            setUserExists(exists);

            if (exists) {
                // Fetch their existing deck access
                const { data: accessData, error: accessError } = await supabase
                    .rpc('get_user_deck_access', { p_email: normalizedEmail });

                if (accessError) {
                    console.error('Error fetching deck access:', accessError);
                    setExistingAccess([]);
                    setSelectedDecks([]);
                } else if (accessData) {
                    const deckIds = accessData.map((item: { deck_id: string }) => item.deck_id);
                    setExistingAccess(deckIds);
                    setSelectedDecks(deckIds); // Pre-select their existing access
                } else {
                    setExistingAccess([]);
                    setSelectedDecks([]);
                }

                // Fetch deck read status (super_admin only)
                if (currentUserRole === 'super_admin') {
                    const { data: readData, error: readError } = await supabase
                        .rpc('get_user_deck_read_status_by_email', { p_email: normalizedEmail });

                    if (readError) {
                        console.warn('Error fetching deck read status:', readError);
                        setDeckReadStatus(new Map());
                    } else if (readData) {
                        const statusMap = new Map<string, DeckReadStatus>();
                        readData.forEach((item: DeckReadStatus) => {
                            statusMap.set(item.deck_id, item);
                        });
                        setDeckReadStatus(statusMap);
                    } else {
                        setDeckReadStatus(new Map());
                    }
                }
            } else {
                setExistingAccess([]);
                setSelectedDecks([]);
                setDeckReadStatus(new Map());
            }
        } catch (err) {
            console.error('Error checking user:', err);
            setUserExists(null);
            setExistingAccess([]);
            setDeckReadStatus(new Map());
        } finally {
            setCheckingUser(false);
        }
    };

    // Toggle deck read status (admin action)
    const handleToggleReadStatus = async (deckId: string) => {
        if (!email || !userExists || currentUserRole !== 'super_admin') return;

        const currentStatus = deckReadStatus.get(deckId);
        const isCurrentlyRead = currentStatus?.marked_read_at !== null;

        setTogglingRead(deckId);
        try {
            const { data, error } = await supabase.rpc('admin_toggle_deck_read_status', {
                p_email: email.toLowerCase().trim(),
                p_deck_id: deckId,
                p_mark_as_read: !isCurrentlyRead
            });

            if (error) {
                console.error('Error toggling read status:', error);
                return;
            }

            // Update local state
            setDeckReadStatus(prev => {
                const newMap = new Map(prev);
                if (data === 'marked_read') {
                    newMap.set(deckId, {
                        deck_id: deckId,
                        opened_at: currentStatus?.opened_at || new Date().toISOString(),
                        marked_read_at: new Date().toISOString()
                    });
                } else if (data === 'marked_unread') {
                    const existing = newMap.get(deckId);
                    if (existing) {
                        newMap.set(deckId, { ...existing, marked_read_at: null });
                    }
                }
                return newMap;
            });
        } catch (err) {
            console.error('Error toggling read status:', err);
        } finally {
            setTogglingRead(null);
        }
    };

    // Debounce email check
    useEffect(() => {
        const timer = setTimeout(() => {
            checkUserAndFetchAccess(email);
        }, 500);

        return () => clearTimeout(timer);
    }, [email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const normalizedEmail = email.toLowerCase().trim();

        // Find decks to grant (newly selected) and revoke (deselected from existing)
        const decksToGrant = selectedDecks.filter(d => !existingAccess.includes(d));
        const decksToRevoke = existingAccess.filter(d => !selectedDecks.includes(d));

        if (decksToGrant.length === 0 && decksToRevoke.length === 0) {
            setError('No changes to apply');
            setLoading(false);
            return;
        }

        try {
            // Grant new access
            for (const deckId of decksToGrant) {
                const { error } = await supabase
                    .rpc('grant_deck_access_by_email', {
                        p_email: normalizedEmail,
                        p_deck_id: deckId,
                        p_granted_by: 'admin'
                    });

                if (error) {
                    throw new Error(`Failed to grant access to ${deckId}: ${error.message}`);
                }
            }

            // Revoke removed access
            for (const deckId of decksToRevoke) {
                const { error } = await supabase
                    .rpc('revoke_deck_access_by_email', {
                        p_email: normalizedEmail,
                        p_deck_id: deckId
                    });

                if (error) {
                    throw new Error(`Failed to revoke access to ${deckId}: ${error.message}`);
                }
            }

            // Success!
            setSuccess({
                email: normalizedEmail,
                decks: selectedDecks,
                grantedAt: new Date().toISOString()
            });

            // Update existing access to match current selection
            setExistingAccess(selectedDecks);

            // Refresh the recent users list
            fetchRecentUsers();

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update access');
        } finally {
            setLoading(false);
        }
    };

    const getDeckTitle = (deckId: string): string => {
        return DECKS.find(d => d.id === deckId)?.title || deckId;
    };

    // Calculate changes for display
    const newlyGranted = selectedDecks.filter(d => !existingAccess.includes(d));
    const toBeRevoked = existingAccess.filter(d => !selectedDecks.includes(d));
    const hasChanges = newlyGranted.length > 0 || toBeRevoked.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'white' }}>
                PROVISION DECK ACCESS
            </h2>
            <p style={{ color: '#666', fontSize: '0.85rem', marginTop: 0 }}>
                Grant or revoke deck access for registered users. Users must sign up at the site gate first.
            </p>

            <EmulatedControlNotice
                enforcedBy={
                    'a super-admin-only console, with every grant and revoke executed by a SECURITY DEFINER ' +
                    'function that re-checked the caller\'s role inside Postgres before touching user_deck_access.'
                }
                nowDoes={
                    'the same operations against browser storage. Grants really do lock and unlock cards in the ' +
                    'data room — switch to the Restricted Investor persona to watch it happen — but nothing is ' +
                    'authorised, nothing is persisted beyond this browser, and no other visitor is affected.'
                }
                functions={[
                    'grant_deck_access_by_email',
                    'revoke_deck_access_by_email',
                    'get_user_deck_access',
                    'check_user_exists',
                ]}
            />

            <div className="pf-admin-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Form Section */}
                <div style={{
                    border: '1px solid #333',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        fontSize: '0.8rem',
                        letterSpacing: '1px',
                        color: '#888',
                        marginBottom: '1.5rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid #333'
                    }}>
                        MANAGE ACCESS
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Email */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
                                USER EMAIL *
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    onBlur={() => {
                                        // Delay hiding to allow click on dropdown
                                        setTimeout(() => setShowDropdown(false), 200);
                                    }}
                                    required
                                    placeholder="Start typing to search users..."
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        paddingRight: '6rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: userExists === false
                                            ? '1px solid #e40028'
                                            : userExists === true
                                                ? '1px solid #4CAF50'
                                                : '1px solid #333',
                                        color: 'white',
                                        fontFamily: 'inherit',
                                        fontSize: '0.9rem'
                                    }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '0.65rem',
                                    fontFamily: 'inherit'
                                }}>
                                    {checkingUser && (
                                        <span style={{ color: '#666' }}>CHECKING...</span>
                                    )}
                                    {!checkingUser && userExists === true && (
                                        <span style={{ color: '#4CAF50' }}>✓ REGISTERED</span>
                                    )}
                                    {!checkingUser && userExists === false && (
                                        <span style={{ color: '#e40028' }}>✗ NOT FOUND</span>
                                    )}
                                </div>

                                {/* Autocomplete Dropdown */}
                                {showDropdown && email.length > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        background: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderTop: 'none',
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                        zIndex: 100
                                    }}>
                                        {allUsers
                                            .filter(u =>
                                                u.email.toLowerCase().includes(email.toLowerCase()) ||
                                                (u.name && u.name.toLowerCase().includes(email.toLowerCase()))
                                            )
                                            .slice(0, 8)
                                            .map(user => (
                                                <div
                                                    key={user.id}
                                                    onClick={() => {
                                                        setEmail(user.email);
                                                        setShowDropdown(false);
                                                    }}
                                                    style={{
                                                        padding: '0.6rem 0.75rem',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid #222',
                                                        transition: 'background 0.15s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(228, 0, 40, 0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ color: 'white', fontSize: '0.8rem' }}>
                                                        {user.name || user.email}
                                                    </div>
                                                    {user.name && (
                                                        <div style={{ color: '#666', fontSize: '0.7rem' }}>
                                                            {user.email}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        }
                                        {allUsers.filter(u =>
                                            u.email.toLowerCase().includes(email.toLowerCase()) ||
                                            (u.name && u.name.toLowerCase().includes(email.toLowerCase()))
                                        ).length === 0 && (
                                                <div style={{ padding: '0.6rem 0.75rem', color: '#666', fontSize: '0.8rem' }}>
                                                    No matching users
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>
                            {userExists === false && (
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: '#e40028',
                                    marginTop: '0.5rem'
                                }}>
                                    This user hasn't signed up yet. They need to register at /gate first.
                                </div>
                            )}
                            {userExists && existingAccess.length > 0 && (
                                <div style={{
                                    fontSize: '0.7rem',
                                    color: '#4CAF50',
                                    marginTop: '0.5rem'
                                }}>
                                    User has access to {existingAccess.length} deck{existingAccess.length !== 1 ? 's' : ''}
                                </div>
                            )}
                        </div>

                        {/* Deck Access with Toggle Switches */}
                        <div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.75rem'
                            }}>
                                <label style={{ fontSize: '0.75rem', color: '#666' }}>
                                    DECK ACCESS
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={handleGrantAll}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#e40028',
                                            fontSize: '0.7rem',
                                            cursor: 'pointer',
                                            fontFamily: 'inherit'
                                        }}
                                    >
                                        ALL ON
                                    </button>
                                    <span style={{ color: '#333' }}>|</span>
                                    <button
                                        type="button"
                                        onClick={handleClearAll}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#666',
                                            fontSize: '0.7rem',
                                            cursor: 'pointer',
                                            fontFamily: 'inherit'
                                        }}
                                    >
                                        ALL OFF
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                padding: '0.75rem',
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid #222'
                            }}>
                                {DECKS.map((deck) => {
                                    const isSelected = selectedDecks.includes(deck.id);
                                    const hadAccess = existingAccess.includes(deck.id);
                                    const isNewGrant = isSelected && !hadAccess;
                                    const isRevoke = !isSelected && hadAccess;

                                    return (
                                        <div
                                            key={deck.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '0.6rem 0.75rem',
                                                background: isNewGrant
                                                    ? 'rgba(76, 175, 80, 0.1)'
                                                    : isRevoke
                                                        ? 'rgba(228, 0, 40, 0.1)'
                                                        : 'transparent',
                                                border: isNewGrant
                                                    ? '1px solid rgba(76, 175, 80, 0.3)'
                                                    : isRevoke
                                                        ? '1px solid rgba(228, 0, 40, 0.3)'
                                                        : '1px solid #222',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                                <span style={{
                                                    fontSize: '0.8rem',
                                                    color: isSelected ? 'white' : '#666'
                                                }}>
                                                    {deck.title}
                                                </span>
                                                {isNewGrant && (
                                                    <span style={{
                                                        fontSize: '0.6rem',
                                                        color: '#4CAF50',
                                                        background: 'rgba(76, 175, 80, 0.2)',
                                                        padding: '0.15rem 0.4rem',
                                                        borderRadius: '2px'
                                                    }}>
                                                        + NEW
                                                    </span>
                                                )}
                                                {isRevoke && (
                                                    <span style={{
                                                        fontSize: '0.6rem',
                                                        color: '#e40028',
                                                        background: 'rgba(228, 0, 40, 0.2)',
                                                        padding: '0.15rem 0.4rem',
                                                        borderRadius: '2px'
                                                    }}>
                                                        - REMOVE
                                                    </span>
                                                )}
                                            </div>

                                            {/* Read Status Badge & Toggle (super_admin only) */}
                                            {currentUserRole === 'super_admin' && userExists && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.75rem' }}>
                                                    {(() => {
                                                        const status = deckReadStatus.get(deck.id);
                                                        const isRead = status?.marked_read_at !== null && status?.marked_read_at !== undefined;
                                                        const hasOpened = status?.opened_at !== null && status?.opened_at !== undefined;

                                                        return (
                                                            <button
                                                                onClick={() => handleToggleReadStatus(deck.id)}
                                                                disabled={togglingRead === deck.id}
                                                                title={hasOpened
                                                                    ? (isRead ? 'Mark as unread' : 'Mark as read')
                                                                    : 'User has not opened this deck'
                                                                }
                                                                style={{
                                                                    background: isRead
                                                                        ? 'rgba(76, 175, 80, 0.15)'
                                                                        : hasOpened
                                                                            ? 'rgba(255, 193, 7, 0.15)'
                                                                            : 'rgba(102, 102, 102, 0.15)',
                                                                    border: `1px solid ${isRead
                                                                        ? 'rgba(76, 175, 80, 0.4)'
                                                                        : hasOpened
                                                                            ? 'rgba(255, 193, 7, 0.4)'
                                                                            : 'rgba(102, 102, 102, 0.3)'}`,
                                                                    color: isRead
                                                                        ? '#4CAF50'
                                                                        : hasOpened
                                                                            ? '#FFC107'
                                                                            : '#666',
                                                                    padding: '0.2rem 0.5rem',
                                                                    borderRadius: '3px',
                                                                    fontSize: '0.6rem',
                                                                    fontFamily: 'inherit',
                                                                    cursor: togglingRead === deck.id ? 'wait' : 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    opacity: togglingRead === deck.id ? 0.6 : 1,
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                {togglingRead === deck.id
                                                                    ? '...'
                                                                    : isRead
                                                                        ? '✓ READ'
                                                                        : hasOpened
                                                                            ? '○ OPENED'
                                                                            : '- NOT OPENED'}
                                                            </button>
                                                        );
                                                    })()}
                                                </div>
                                            )}

                                            <ToggleSwitch
                                                checked={isSelected}
                                                onChange={() => handleDeckToggle(deck.id)}
                                                disabled={!userExists}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Changes Summary */}
                        {hasChanges && userExists && (
                            <div style={{
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid #333',
                                fontSize: '0.75rem'
                            }}>
                                <div style={{ color: '#888', marginBottom: '0.5rem' }}>PENDING CHANGES:</div>
                                {newlyGranted.length > 0 && (
                                    <div style={{ color: '#4CAF50' }}>
                                        + Granting: {newlyGranted.map(getDeckTitle).join(', ')}
                                    </div>
                                )}
                                {toBeRevoked.length > 0 && (
                                    <div style={{ color: '#e40028' }}>
                                        - Revoking: {toBeRevoked.map(getDeckTitle).join(', ')}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '0.75rem',
                                background: 'rgba(228, 0, 40, 0.1)',
                                border: '1px solid #e40028',
                                color: '#e40028',
                                fontSize: '0.85rem'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !userExists || !hasChanges}
                            style={{
                                padding: '1rem',
                                background: (loading || !userExists || !hasChanges) ? '#333' : '#e40028',
                                border: 'none',
                                color: 'white',
                                fontFamily: 'inherit',
                                fontSize: '0.9rem',
                                letterSpacing: '1px',
                                cursor: (loading || !userExists || !hasChanges) ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            {loading ? 'UPDATING...' : hasChanges ? 'APPLY CHANGES' : 'NO CHANGES'}
                        </button>
                    </form>
                </div>

                {/* Success / Info Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Success Message */}
                    {success && (
                        <div style={{
                            border: '1px solid #2a5a2a',
                            background: 'rgba(42, 90, 42, 0.1)',
                            padding: '1.5rem'
                        }}>
                            <div style={{
                                fontSize: '0.8rem',
                                letterSpacing: '1px',
                                color: '#4a9a4a',
                                marginBottom: '1rem'
                            }}>
                                ✓ ACCESS UPDATED
                            </div>
                            <div style={{ color: 'white', marginBottom: '0.5rem' }}>
                                <strong>{success.email}</strong>
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#666',
                                marginTop: '1rem'
                            }}>
                                Now has access to {success.decks.length} deck{success.decks.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}

                    {/* How it works */}
                    <div style={{
                        border: '1px solid #333',
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '1.5rem'
                    }}>
                        <div style={{
                            fontSize: '0.8rem',
                            letterSpacing: '1px',
                            color: '#888',
                            marginBottom: '1rem',
                            paddingBottom: '1rem',
                            borderBottom: '1px solid #333'
                        }}>
                            HOW IT WORKS
                        </div>
                        <ol style={{
                            margin: 0,
                            padding: '0 0 0 1.25rem',
                            color: '#888',
                            fontSize: '0.8rem',
                            lineHeight: 1.8
                        }}>
                            <li>User signs up at <code style={{ color: '#e40028' }}>/gate</code></li>
                            <li>Enter their email above to see current access</li>
                            <li>Toggle decks ON/OFF as needed</li>
                            <li>Click "Apply Changes" to update</li>
                            <li>User refreshes Data Room to see changes</li>
                        </ol>
                    </div>

                    {/* Recent Users */}
                    <div style={{
                        border: '1px solid #333',
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '1.5rem'
                    }}>
                        <div style={{
                            fontSize: '0.8rem',
                            letterSpacing: '1px',
                            color: '#888',
                            marginBottom: '1rem',
                            paddingBottom: '1rem',
                            borderBottom: '1px solid #333'
                        }}>
                            RECENT USERS
                        </div>

                        {recentUsers.length === 0 ? (
                            <div style={{ color: '#666', fontSize: '0.85rem' }}>
                                No users yet
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {recentUsers.slice(0, 5).map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => setEmail(user.email)}
                                        style={{
                                            padding: '0.75rem',
                                            background: 'rgba(0, 0, 0, 0.2)',
                                            borderLeft: user.decks.length > 0
                                                ? '3px solid #4CAF50'
                                                : '3px solid #333',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '0.25rem'
                                        }}>
                                            <span style={{ color: 'white', fontSize: '0.85rem' }}>
                                                {user.name || user.email}
                                            </span>
                                            <span style={{ color: '#666', fontSize: '0.7rem' }}>
                                                {user.decks.length} deck{user.decks.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div style={{ color: '#888', fontSize: '0.7rem' }}>
                                            {user.email}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* All Users */}
                    <div style={{
                        border: '1px solid #333',
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '1.5rem'
                    }}>
                        <div style={{
                            fontSize: '0.8rem',
                            letterSpacing: '1px',
                            color: '#888',
                            marginBottom: '1rem',
                            paddingBottom: '1rem',
                            borderBottom: '1px solid #333'
                        }}>
                            ALL USERS ({allUsers.length})
                        </div>

                        {allUsers.length === 0 ? (
                            <div style={{ color: '#666', fontSize: '0.85rem' }}>
                                Loading users...
                            </div>
                        ) : (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                {allUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => setEmail(user.email)}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            background: 'rgba(0, 0, 0, 0.2)',
                                            borderLeft: user.decks.length > 0
                                                ? '3px solid #4CAF50'
                                                : '3px solid #333',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div>
                                                <span style={{ color: 'white', fontSize: '0.8rem' }}>
                                                    {user.name || user.email}
                                                </span>
                                                {user.name && (
                                                    <div style={{ color: '#666', fontSize: '0.65rem' }}>
                                                        {user.email}
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{ color: '#666', fontSize: '0.65rem' }}>
                                                {user.decks.length} deck{user.decks.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* SUPER ADMIN CONTROLS */}
            {
                currentUserRole === 'super_admin' && (
                    <div style={{
                        marginTop: '2rem',
                        border: '1px solid #e40028',
                        background: 'rgba(228, 0, 40, 0.05)',
                        padding: '1.5rem'
                    }}>
                        <h3 style={{
                            fontSize: '1rem',
                            color: '#e40028',
                            marginBottom: '1rem',
                            letterSpacing: '1px',
                            borderBottom: '1px solid rgba(228, 0, 40, 0.3)',
                            paddingBottom: '0.5rem'
                        }}>
                            SUPER ADMIN CONTROLS
                        </h3>
                        <p style={{ fontSize: '0.7rem', color: '#c98b95', lineHeight: 1.75, marginBottom: '1.25rem' }}>
                            Role escalation. On the live product this was the most closely held control in the
                            system — <code>set_super_admin</code> ran as a definer function that only an existing
                            super admin could call, because it handed over the keys to the entire console. Here it
                            rewrites a row in browser storage, and this panel is visible to anyone who opened the
                            page.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '250px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#e40028', marginBottom: '0.5rem' }}>
                                    TARGET USER EMAIL
                                </label>
                                <input
                                    type="email"
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: '1px solid #e40028',
                                        color: 'white',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => handleSuperAdminAction('promote')}
                                disabled={adminLoading || !adminEmail}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: '#e40028',
                                    border: 'none',
                                    color: 'white',
                                    cursor: (adminLoading || !adminEmail) ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    fontFamily: 'inherit',
                                    opacity: (adminLoading || !adminEmail) ? 0.6 : 1
                                }}
                            >
                                PROMOTE TO SUPER ADMIN
                            </button>
                            <button
                                onClick={() => handleSuperAdminAction('demote')}
                                disabled={adminLoading || !adminEmail}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'transparent',
                                    border: '1px solid #666',
                                    color: '#aaa',
                                    cursor: (adminLoading || !adminEmail) ? 'not-allowed' : 'pointer',
                                    fontFamily: 'inherit',
                                    opacity: (adminLoading || !adminEmail) ? 0.6 : 1
                                }}
                            >
                                REMOVE SUPER ADMIN
                            </button>
                        </div>
                        {adminMessage && (
                            <div style={{
                                marginTop: '1rem',
                                color: adminMessage.type === 'success' ? '#4CAF50' : '#e40028',
                                fontSize: '0.85rem'
                            }}>
                                {adminMessage.type === 'success' ? '✓ ' : '⚠ '} {adminMessage.text}
                            </div>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default ProvisionPage;
