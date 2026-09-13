import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/db';

type Ctx = {
  session: Session | null;
  profile: User | null;
  loading: boolean;
  /** Relee el perfil: se llama después de editar "Mi negocio". */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
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

  const refreshProfile = useCallback(async () => {
    const id = session?.user?.id;
    if (!id) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('users').select('*').eq('id', id).single<User>();
    setProfile(data);
  }, [session?.user?.id]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <SessionContext.Provider
      value={{
        session,
        profile,
        loading,
        refreshProfile,
        signOut: async () => void supabase.auth.signOut(),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
