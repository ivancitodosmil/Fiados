import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';
import type { Negocio } from './types';

type Ctx = {
  ready: boolean;
  session: Session | null;
  negocio: Negocio | null;
  negocioError: string | null;
  reloadNegocio: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [negocioError, setNegocioError] = useState<string | null>(null);

  const userId = session?.user.id;

  const loadNegocio = useCallback(async () => {
    if (!userId) {
      setNegocio(null);
      return;
    }
    const { data, error } = await supabase
      .from('negocios')
      .select('id,nombre,telefono,email,direccion,logo_url,simbolo,dias_credito,dias_aviso,plantilla_recordatorio')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) setNegocioError(error.message);
    else {
      setNegocioError(data ? null : 'Tu usuario no tiene un negocio asignado.');
      setNegocio(data as Negocio | null);
    }
  }, [userId]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (!data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setNegocio(null);
        setReady(true);
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    loadNegocio().finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [userId, loadNegocio]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <SessionContext value={{ ready, session, negocio, negocioError, reloadNegocio: loadNegocio, signOut }}>
      {children}
    </SessionContext>
  );
}

export function useSession() {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error('useSession fuera de SessionProvider');
  return ctx;
}

/** Negocio actual (las pantallas protegidas solo se montan cuando existe). */
export function useNegocio(): Negocio {
  const { negocio } = useSession();
  return negocio as Negocio;
}
