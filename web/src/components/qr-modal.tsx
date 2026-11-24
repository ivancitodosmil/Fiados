"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { errMsg, getSupabase, portalLink } from "@/lib/supabase";
import { IconCopy, IconRefresh, IconShare } from "./icons";
import { Button, Modal, Spinner } from "./ui";

export function QrModal({
  open,
  onClose,
  clienteId,
  nombre,
  token,
  portalActivo,
  onToken,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  nombre: string;
  token: string;
  portalActivo: boolean;
  onToken: (t: string) => void;
}) {
  const link = portalLink(token);
  const [qr, setQr] = useState<{ link: string; src: string } | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    QRCode.toDataURL(link, { width: 560, margin: 1, color: { dark: "#18282A", light: "#FFFFFF" } })
      .then((src) => alive && setQr({ link, src }))
      .catch(() => alive && toast.error("No se pudo generar el código QR."));
    return () => {
      alive = false;
    };
  }, [open, link]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar. Mantén presionado el enlace para copiarlo.");
    }
  }

  async function compartir() {
    try {
      await navigator.share({ title: "Tu estado de cuenta", text: `Hola ${nombre.split(" ")[0]}, aquí puedes ver tu saldo:`, url: link });
    } catch {
      /* cancelado */
    }
  }

  async function regenerar() {
    setBusy(true);
    const { data, error } = await getSupabase().rpc("regenerar_qr", { p_cliente: clienteId });
    setBusy(false);
    setConfirmar(false);
    if (error) return void toast.error(errMsg(error));
    onToken(String(data));
    toast.success("Nuevo QR generado. El anterior ya no funciona.");
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const ready = qr && qr.link === link;

  return (
    <Modal open={open} onClose={onClose} title={`QR de ${nombre.split(" ")[0]}`}>
      <p className="text-[14px] text-gris">
        Tu cliente escanea este código y ve lo que debe, sin instalar nada ni crear cuenta.
      </p>
      {!portalActivo && (
        <p className="mt-3 rounded-2xl bg-warn-bg px-4 py-3 text-[14px] font-medium text-warn-text">
          El portal de este cliente está desactivado; el enlace mostrará “Enlace no válido”.
        </p>
      )}
      <div className="mx-auto mt-5 grid aspect-square w-full max-w-[280px] place-items-center rounded-[24px] bg-white p-3 shadow-card">
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr.src} alt={`Código QR del portal de ${nombre}`} className="h-full w-full" />
        ) : (
          <Spinner className="size-6 text-verde" />
        )}
      </div>
      <div className="mt-4 rounded-2xl bg-papel px-4 py-3 text-center text-[13px] break-all text-gris select-all">{link}</div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Button variant="secondary" onClick={copiar}>
          <IconCopy size={18} /> Copiar enlace
        </Button>
        {canShare ? (
          <Button variant="secondary" onClick={compartir}>
            <IconShare size={18} /> Compartir
          </Button>
        ) : (
          <a
            href={ready ? qr.src : undefined}
            download={`qr-${nombre.replace(/\s+/g, "-").toLowerCase()}.png`}
            className="press inline-flex h-12 items-center justify-center gap-2 rounded-full border border-borde bg-white px-5 text-[15px] font-semibold hover:bg-papel"
          >
            Descargar
          </a>
        )}
      </div>

      {confirmar ? (
        <div className="mt-4 rounded-2xl bg-warn-bg p-4">
          <p className="text-[14px] font-medium text-tinta">
            ¿Generar un QR nuevo? El código y el enlace actuales dejarán de funcionar.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="dark" loading={busy} onClick={regenerar}>
              Sí, generar nuevo
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmar(true)}
          className="press mx-auto mt-4 flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-gris hover:bg-papel hover:text-tinta"
        >
          <IconRefresh size={17} /> Regenerar QR
        </button>
      )}
    </Modal>
  );
}
