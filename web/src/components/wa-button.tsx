"use client";

import { useState } from "react";
import { enviarRecordatorioWhatsApp } from "@/lib/actions";
import { IconWhatsApp } from "./icons";
import { cx, Spinner } from "./ui";

export function WaButton({
  clienteId,
  negocioId,
  nombre,
  size = 40,
}: {
  clienteId: string;
  negocioId: string;
  nombre: string;
  size?: number;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Enviar recordatorio por WhatsApp a ${nombre}`}
      title="Recordar por WhatsApp"
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(true);
        await enviarRecordatorioWhatsApp(clienteId, negocioId);
        setBusy(false);
      }}
      className={cx("press grid shrink-0 place-items-center rounded-xl bg-wa hover:bg-ok-bg disabled:opacity-60")}
      style={{ width: size, height: size }}
    >
      {busy ? <Spinner className="text-ok" /> : <IconWhatsApp />}
    </button>
  );
}
