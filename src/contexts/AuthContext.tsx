'use client';
import * as React from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = getSupabaseBrowserClient();
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (alive) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_evt, sess) => {
      if (alive) setSession(sess);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  const signIn = React.useCallback(async (email: string, senha: string) => {
    const { error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(error.message);
  }, [sb]);

  const signOut = React.useCallback(async () => {
    await sb.auth.signOut();
  }, [sb]);

  const value = React.useMemo<AuthState>(
    () => ({ user: session?.user ?? null, session, loading, signIn, signOut }),
    [session, loading, signIn, signOut]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const v = React.useContext(AuthCtx);
  if (!v) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return v;
}
