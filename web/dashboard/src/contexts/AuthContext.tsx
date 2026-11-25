import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchIsOwner } from '../api/supabase-data-client';

// Normalized user shape compatible with what App.tsx expects
export interface AppUser {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  id: string;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  /** Owner account: sees finances. False for every other account. */
  isOwner: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function toAppUser(user: User): AppUser {
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
    photoURL: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [owner, setOwner] = useState<{ userId: string; value: boolean } | null>(null);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ? toAppUser(session.user) : null);
      setSessionLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ? toAppUser(session.user) : null);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Ownership is resolved once per account; a failed lookup means no finance access.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchIsOwner()
      .then(value => { if (active) setOwner({ userId, value }); })
      .catch(error => {
        console.error('Error checking account owner:', error);
        if (active) setOwner({ userId, value: false });
      });
    return () => { active = false; };
  }, [userId]);

  const ownerKnown = !userId || owner?.userId === userId;
  const isOwner = Boolean(userId && owner?.userId === userId && owner.value);
  const loading = sessionLoading || !ownerKnown;

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${globalThis.location.origin}/app` },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = useMemo(
    () => ({ user, session, loading, isOwner, signInWithGoogle, signOut }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, session, loading, isOwner],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
