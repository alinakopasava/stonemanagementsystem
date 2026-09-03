import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AuthUser } from '@domain/entities/user-profile';
import { supabase } from '@infrastructure/auth/supabase-client';
import {
  establishSessionRequest,
  fetchCurrentUser,
  forgotPasswordRequest,
  resetPasswordRequest,
  signInRequest,
  signOutRequest,
  signUpRequest
} from '@infrastructure/api/auth-api';

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

interface AuthContextValue {
  isLoading: boolean;
  authHandoffError: boolean;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [authHandoffError, setAuthHandoffError] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const handoffInFlight = useRef<Promise<void> | null>(null);

  const meInFlight = useRef<Promise<void> | null>(null);

  /*
   * One profile request at a time. Boot, the sign-in call and a page that
   * asks for a refresh can all land together, and each extra request spends
   * the same rotating refresh cookie for nothing.
   */
  const loadMe = useCallback(async () => {
    if (meInFlight.current) {
      return meInFlight.current;
    }

    const run = (async () => {
      try {
        const nextUser = await fetchCurrentUser();
        setUser(nextUser);
      } catch {
        setUser(null);
      }
    })();

    meInFlight.current = run;
    try {
      await run;
    } finally {
      meInFlight.current = null;
    }
  }, []);

  const handoffSupabaseSession = useCallback(async (providedSession?: Session | null) => {
    if (handoffInFlight.current) {
      return handoffInFlight.current;
    }

    const run = (async () => {
      const session = providedSession ?? (await supabase.auth.getSession()).data.session;
      if (!session?.access_token || !session.refresh_token) {
        return;
      }
      await establishSessionRequest(session.access_token, session.refresh_token);
      // Do not call supabase.auth.signOut(): even "local" scope revokes the
      // refresh-token family that was just moved into the httpOnly cookie.
      // A one-time reload discards the non-persistent JS session without
      // contacting Supabase; the next boot restores the user from the cookie.
      window.location.replace(`${window.location.pathname}${window.location.search}`);
    })();

    handoffInFlight.current = run;
    try {
      await run;
    } finally {
      handoffInFlight.current = null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const boot = async () => {
      try {
        setAuthHandoffError(false);
        await handoffSupabaseSession();
        if (!isMounted) return;
        await loadMe();
      } catch {
        if (isMounted) {
          setUser(null);
          setAuthHandoffError(true);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void boot();

    const pendingTimers = new Set<number>();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
        // Supabase holds an internal auth lock while invoking this callback.
        // Calling another auth method synchronously here can deadlock, so hand the
        // session to the API only after the callback has returned.
        setIsLoading(true);
        setAuthHandoffError(false);
        const timer = window.setTimeout(() => {
          pendingTimers.delete(timer);
          if (!isMounted) return;
          void handoffSupabaseSession(session)
            .catch(() => {
              if (isMounted) {
                setUser(null);
                setAuthHandoffError(true);
              }
            })
            .finally(() => {
              if (isMounted) setIsLoading(false);
            });
        }, 0);
        pendingTimers.add(timer);
      }
    });

    return () => {
      isMounted = false;
      pendingTimers.forEach((timer) => window.clearTimeout(timer));
      sub.subscription.unsubscribe();
    };
  }, [handoffSupabaseSession, loadMe]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await signInRequest(email, password);
      await loadMe();
    },
    [loadMe]
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const result = await signUpRequest(input);
      if (!result.requiresEmailConfirmation) {
        await loadMe();
      }
      return { requiresEmailConfirmation: result.requiresEmailConfirmation };
    },
    [loadMe]
  );

  const signOut = useCallback(async () => {
    await signOutRequest();
    setUser(null);

    /*
     * The worklist kept for offline use carries customers' names, telephone
     * numbers and the addresses of their graves. A crew phone is passed around
     * and shared, so signing out has to take that copy with it — otherwise the
     * next person to open the application reads the previous one's jobs.
     */
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((key) => key.includes('installer-worklist')).map((key) => caches.delete(key))
        );
      } catch {
        // Storage the browser refuses to open is storage it is not serving from.
      }
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await forgotPasswordRequest(email);
  }, []);

  const resetPassword = useCallback(async (password: string) => {
    await resetPasswordRequest(password);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      authHandoffError,
      user,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      resetPassword,
      refreshProfile
    }),
    [
      isLoading,
      authHandoffError,
      user,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      resetPassword,
      refreshProfile
    ]
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
