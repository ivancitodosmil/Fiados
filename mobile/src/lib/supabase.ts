import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
export const PORTAL_URL = (process.env.EXPO_PUBLIC_PORTAL_URL?.trim() ?? '').replace(/\/+$/, '');

function validUrl(u: string) {
  return /^https?:\/\/.+/.test(u);
}

export const isConfigured = validUrl(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;

let client: SupabaseClient | null = null;

if (isConfigured) {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });

  // Refresca el token solo mientras la app está en primer plano.
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
}

/** Cliente de Supabase. Solo se usa en pantallas que se muestran cuando `isConfigured` es true. */
export const supabase = client as SupabaseClient;

export function portalLink(token: string) {
  return PORTAL_URL ? `${PORTAL_URL}/c/${token}` : '';
}

/** Mensaje legible de un error de Supabase / red. Los mensajes de la base ya vienen en español. */
export function errorMessage(e: unknown): string {
  if (!e) return 'Ocurrió un error inesperado.';
  if (typeof e === 'string') return e;
  const msg = (e as { message?: string }).message ?? '';
  if (/Failed to fetch|Network request failed|NetworkError/i.test(msg)) {
    return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  }
  if (/Invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(msg)) return 'Confirma tu correo antes de ingresar.';
  if (/User already registered/i.test(msg)) return 'Ese correo ya tiene una cuenta. Ingresa con tu contraseña.';
  if (/Password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/Unable to validate email|invalid format/i.test(msg)) return 'El correo no es válido.';
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  if (/clientes_cedula_uk|duplicate key.*cedula/i.test(msg)) return 'Ya existe un cliente con esa cédula.';
  if (/apartados_negocio_id_nombre_key|duplicate key.*nombre/i.test(msg)) return 'Ya existe un apartado con ese nombre.';
  return msg || 'Ocurrió un error inesperado.';
}
