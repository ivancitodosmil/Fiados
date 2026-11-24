import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Next.js inyecta las NEXT_PUBLIC_* en tiempo de compilación.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const PORTAL_URL = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "").replace(/\/+$/, "");

/** Base pública del portal del cliente (QR). Si falta, usa el dominio actual. */
export function portalBase(): string {
  return PORTAL_URL || (typeof window !== "undefined" ? window.location.origin : "");
}

export function isConfigured(): boolean {
  if (!URL || !ANON) return false;
  try {
    new globalThis.URL(URL);
    return true;
  } catch {
    return false;
  }
}

let client: SupabaseClient | null = null;

/** Cliente único del navegador. La sesión se guarda en localStorage. */
export function getSupabase(): SupabaseClient {
  if (!isConfigured()) throw new Error("Supabase no está configurado");
  if (!client) {
    client = createClient(URL, ANON, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "fiados-auth",
      },
    });
  }
  return client;
}

export function portalLink(token: string): string {
  return `${portalBase()}/c/${token}`;
}

/** Mensaje legible de un error de Supabase (ya viene en español). */
export function errMsg(e: unknown, fallback = "Ocurrió un error. Intenta de nuevo."): string {
  if (!e) return fallback;
  if (typeof e === "string") return e;
  if (typeof e === "object" && e && "message" in e) {
    const m = String((e as { message: unknown }).message || "");
    if (/Failed to fetch|NetworkError|fetch failed/i.test(m))
      return "No hay conexión con el servidor. Revisa tu internet.";
    if (/Invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
    if (/Email not confirmed/i.test(m)) return "Confirma tu correo antes de ingresar.";
    if (/User already registered/i.test(m)) return "Ese correo ya está registrado.";
    if (/Password should be at least/i.test(m))
      return "La contraseña debe tener al menos 6 caracteres.";
    if (/clientes_cedula_uk|duplicate key.*cedula/i.test(m))
      return "Ya existe un cliente con esa cédula.";
    if (/apartados_negocio_id_nombre_key/i.test(m)) return "Ya existe un apartado con ese nombre.";
    return m || fallback;
  }
  return fallback;
}
