import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AuthUser, UserProfile, UserRole } from '@domain/entities/user-profile';
import { supabase } from '@infrastructure/auth/supabase-client';

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

interface AuthContextValue {
  isLoading: boolean;
  session: Session | null;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: UserRole;
}

const profileFromRow = (row: ProfileRow): UserProfile => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  phoneNumber: row.phone_number,
  role: row.role
});

const loadProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone_number, role')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error('[auth] Failed to load profile:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return null;
  }
  if (!data) {
    console.warn('[auth] No profile row for user', userId);
    return null;
  }
  return profileFromRow(data);
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const hydrateFromSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      setUser(null);
      return;
    }
    const profile = await loadProfile(nextSession.user.id);
    if (!profile) {
      setUser(null);
      return;
    }
    setUser({
      id: nextSession.user.id,
      email: nextSession.user.email ?? null,
      profile
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      await hydrateFromSession(data.session);
      if (isMounted) setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;
      await hydrateFromSession(nextSession);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrateFromSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          first_name: input.firstName,
          last_name: input.lastName,
          phone_number: input.phoneNumber ?? null
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;

    const requiresEmailConfirmation = !data.session;
    return { requiresEmailConfirmation };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    if (error) throw error;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const profile = await loadProfile(session.user.id);
    if (!profile) {
      setUser(null);
      return;
    }
    setUser({
      id: session.user.id,
      email: session.user.email ?? null,
      profile
    });
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      user,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      refreshProfile
    }),
    [isLoading, session, user, signIn, signUp, signOut, sendPasswordReset, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider />');
  }
  return ctx;
};
