"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { errMsg, getSupabase } from "./supabase";
import type { Negocio } from "./types";

type Status = "loading" | "out" | "in";

interface Ctx {
  status: Status;
  session: Session | null;
  negocio: Negocio | null;
  rol: "dueno" | "empleado" | null;
  negocioError: string | null;
  reloadNegocio: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [rol, setRol] = useState<Ctx["rol"]>(null);
  const [negocioError, setNegocioError] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    const { data } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setStatus(s ? "in" : "out");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id ?? null;

  const loadNegocio = useCallback(async (userId: string) => {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("negocio_miembros")
      .select("rol, negocios(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      setNegocioError(errMsg(error));
      return;
    }
    const row = data as unknown as { rol: Ctx["rol"]; negocios: Negocio } | null;
    if (!row?.negocios) {
      setNegocioError("Tu usuario no tiene un negocio asignado.");
      return;
    }
    setNegocioError(null);
    setNegocio(row.negocios);
    setRol(row.rol);
  }, []);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    (async () => {
      if (alive) await loadNegocio(uid);
    })();
    return () => {
      alive = false;
    };
  }, [uid, loadNegocio]);

  const reloadNegocio = useCallback(async () => {
    if (uid) await loadNegocio(uid);
  }, [uid, loadNegocio]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setNegocio(null);
    setRol(null);
  }, []);

  return (
    <SessionCtx.Provider value={{ status, session, negocio, rol, negocioError, reloadNegocio, signOut }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession(): Ctx {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("useSession fuera de SessionProvider");
  return c;
}

/** Negocio garantizado (solo dentro del panel ya autenticado). */
export function useNegocio(): Negocio {
  const { negocio } = useSession();
  if (!negocio) throw new Error("Negocio no cargado");
  return negocio;
}
