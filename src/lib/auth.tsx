import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getAppConfig } from './api';
import type { AppConfig } from './types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  config: AppConfig | null;
  loading: boolean;
  needsSetup: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshConfig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshConfig = async () => {
    try {
      const cfg = await getAppConfig();
      setConfig(cfg);
    } catch {
      setConfig(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        setUser(sess?.user ?? null);
        await refreshConfig();
      })();
    });

    refreshConfig().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Mark admin as created
    if (data.user) {
      const { error: upErr } = await supabase.from('app_config')
        .update({ admin_created: true, admin_email: email })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (upErr) throw upErr;
      await refreshConfig();
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setConfig(null);
  };

  const needsSetup = !config?.admin_created;
  const isAdmin = !!user && !!config?.admin_created && config.admin_email === user.email;

  return (
    <AuthContext.Provider value={{ session, user, config, loading, needsSetup, isAdmin, signIn, signUp, signOut, refreshConfig }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
