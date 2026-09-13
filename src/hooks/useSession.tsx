import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/db';

type Ctx = {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single<User>()
      .then(({ data }) => setProfile(data));
  }, [session?.user?.id]);

  return (
    <SessionContext.Provider
      value={{ session, profile, loading, signOut: async () => void supabase.auth.signOut() }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
