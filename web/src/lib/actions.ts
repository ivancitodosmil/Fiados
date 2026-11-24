"use client";

import { toast } from "sonner";
import { telefonoWa, waLink } from "./format";
import { errMsg, getSupabase, portalBase } from "./supabase";
import type { Recordatorio } from "./types";

/**
 * Genera el mensaje con generar_recordatorio, abre WhatsApp (wa.me/593…)
 * y deja registro en la tabla recordatorios.
 */
export async function enviarRecordatorioWhatsApp(clienteId: string, negocioId: string): Promise<boolean> {
  // Se abre la pestaña antes del await para que el navegador no la bloquee.
  const win = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
  const sb = getSupabase();
  const { data, error } = await sb.rpc("generar_recordatorio", {
    p_cliente: clienteId,
    p_url_base: portalBase() || null,
  });
  if (error || !data) {
    win?.close();
    toast.error(errMsg(error, "No se pudo generar el recordatorio."));
    return false;
  }
  const r = data as Recordatorio;
  if (!telefonoWa(r.celular)) {
    win?.close();
    toast.error("Este cliente no tiene celular registrado. Agrégalo en Editar.");
    return false;
  }
  const url = waLink(r.celular, r.mensaje);
  if (win) win.location.href = url;
  else window.location.href = url;

  const { error: e2 } = await sb.from("recordatorios").insert({
    negocio_id: negocioId,
    cliente_id: clienteId,
    canal: "whatsapp",
    mensaje: r.mensaje,
  });
  if (e2) toast.error(`WhatsApp abierto, pero no se guardó el registro: ${errMsg(e2)}`);
  else toast.success("Recordatorio listo en WhatsApp");
  return true;
}
