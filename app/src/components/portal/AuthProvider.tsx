import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export type UserRole = 'super_admin' | 'owner' | 'admin' | 'analyst' | 'viewer';

export interface UserProfile {
    id: string;
    name: string | null;
    role: UserRole;
    org_id: string | null;
    created_at: string;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Track if initial auth has completed
    const initialAuthComplete = useRef(false);

    // Fetch user profile from profiles table
    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                // Profile may not exist yet - that's OK for Phase 1
                console.warn('Profile not found:', error.message);
                // Return a default profile stub
                setProfile({
                    id: userId,
                    name: null,
                    role: 'viewer', // Default role
                    org_id: null,
                    created_at: new Date().toISOString(),
                });
            } else {
                setProfile(data as UserProfile);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
    }, []);

    // Initial session check
    useEffect(() => {
        let mounted = true;
        let timeoutId: ReturnType<typeof setTimeout>;

        const initAuth = async () => {
            try {
                const { data: { session: fetchedSession }, error } = await supabase.auth.getSession();

                if (!mounted) return;

                if (error) {
                    console.warn('Error getting session:', error.message);
                }

                setSession(fetchedSession);
                setUser(fetchedSession?.user ?? null);

                if (fetchedSession?.user) {
                    await fetchProfile(fetchedSession.user.id);
                }
            } catch (err) {
                console.error('Error initialising auth:', err);
                if (mounted) {
                    setSession(null);
                    setUser(null);
                }
            } finally {
                if (mounted) {
                    initialAuthComplete.current = true;
                    setLoading(false);
                }
            }
        };

        // Start auth initialization
        initAuth();

        // Safety fallback: if Supabase auth init hangs beyond 15s, unblock the
        // UI so the portal doesn't stay in the loading spinner forever. Longer
        // than before (was 8s) because Vercel→Supabase auth can be slow on cold
        // starts and the old cutoff fired in normal-latency conditions.
        timeoutId = setTimeout(() => {
            if (mounted && !initialAuthComplete.current) {
                initialAuthComplete.current = true;
                setLoading(false);
            }
        }, 15000);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                // Only update if initial auth is complete to prevent race condition
                // OR if this is a sign_in/sign_out event which should always be processed
                if (!initialAuthComplete.current && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') {
                    return;
                }

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                }

                // Ensure loading is false after any auth state change
                setLoading(false);
            }
        );

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
