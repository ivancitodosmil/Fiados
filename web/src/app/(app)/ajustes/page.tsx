"use client";

import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApartadosManager } from "@/components/apartados-manager";
import { IconLogout } from "@/components/icons";
import { Button, Card, Field, Input, PageHeader, TextArea } from "@/components/ui";
import { useNegocio, useSession } from "@/lib/session";
import { errMsg, getSupabase, portalBase } from "@/lib/supabase";

const PLACEHOLDERS = [
  { tag: "{cliente}", label: "Cliente" },
  { tag: "{negocio}", label: "Negocio" },
  { tag: "{total}", label: "Total" },
  { tag: "{detalle}", label: "Detalle" },
  { tag: "{link}", label: "Enlace" },
];

export default function AjustesPage() {
  const negocio = useNegocio();
  const { reloadNegocio, signOut, session, rol } = useSession();
  const [v, setV] = useState({
    nombre: negocio.nombre,
    telefono: negocio.telefono ?? "",
    email: negocio.email ?? "",
    direccion: negocio.direccion ?? "",
    logo_url: negocio.logo_url ?? "",
    dias_credito: String(negocio.dias_credito),
    dias_aviso: String(negocio.dias_aviso),
    plantilla_recordatorio: negocio.plantilla_recordatorio,
  });
  const [busy, setBusy] = useState(false);
  const plantillaRef = useRef<HTMLTextAreaElement>(null);

  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));

  function insertar(tag: string) {
    const el = plantillaRef.current;
    const txt = v.plantilla_recordatorio;
    const start = el?.selectionStart ?? txt.length;
    const end = el?.selectionEnd ?? txt.length;
    const nuevo = txt.slice(0, start) + tag + txt.slice(end);
    setV((p) => ({ ...p, plantilla_recordatorio: nuevo }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const dc = parseInt(v.dias_credito, 10);
    const da = parseInt(v.dias_aviso, 10);
    if (!v.nombre.trim()) return void toast.error("El nombre del negocio es obligatorio.");
    if (!(dc >= 1 && dc <= 365)) return void toast.error("Los días de crédito deben estar entre 1 y 365.");
    if (!(da >= 0 && da <= 60)) return void toast.error("Los días de aviso deben estar entre 0 y 60.");
    if (!v.plantilla_recordatorio.trim()) return void toast.error("La plantilla del recordatorio no puede quedar vacía.");
    setBusy(true);
    const { data, error } = await getSupabase()
      .from("negocios")
      .update({
        nombre: v.nombre.trim(),
        telefono: v.telefono.trim() || null,
        email: v.email.trim() || null,
        direccion: v.direccion.trim() || null,
        logo_url: v.logo_url.trim() || null,
        dias_credito: dc,
        dias_aviso: da,
        plantilla_recordatorio: v.plantilla_recordatorio.trim(),
      })
      .eq("id", negocio.id)
      .select("id");
    setBusy(false);
    if (error) return void toast.error(errMsg(error));
    if (!data || data.length === 0) return void toast.error("Solo el dueño del negocio puede cambiar los ajustes.");
    await reloadNegocio();
    toast.success("Ajustes guardados");
  }

  const ejemplo = v.plantilla_recordatorio
    .replaceAll("{cliente}", "María")
    .replaceAll("{negocio}", v.nombre || negocio.nombre)
    .replaceAll("{total}", "$182.40")
    .replaceAll("{detalle}", "La cuota 2 de 4 por $30.00 está atrasada 7 día(s).")
    .replaceAll("{link}", `${portalBase()}/c/…`);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Ajustes" kicker={session?.user.email} />

      <form onSubmit={guardar} noValidate>
        <h2 className="mb-3 px-1 text-[13px] font-semibold tracking-[.06em] text-gris uppercase">Tu negocio</h2>
        <Card className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del negocio" htmlFor="n-nombre" className="sm:col-span-2">
              <Input id="n-nombre" value={v.nombre} onChange={set("nombre")} />
            </Field>
            <Field label="Teléfono / WhatsApp" htmlFor="n-tel" hint="Tus clientes te escriben a este número desde su portal">
              <Input id="n-tel" type="tel" inputMode="tel" value={v.telefono} onChange={set("telefono")} placeholder="099 123 4567" />
            </Field>
            <Field label="Correo" htmlFor="n-email">
              <Input id="n-email" type="email" value={v.email} onChange={set("email")} />
            </Field>
            <Field label="Dirección" htmlFor="n-dir" className="sm:col-span-2">
              <Input id="n-dir" value={v.direccion} onChange={set("direccion")} />
            </Field>
            <Field label="Logo (URL de la imagen)" htmlFor="n-logo" className="sm:col-span-2" hint="Se muestra en el portal de tus clientes">
              <Input id="n-logo" type="url" value={v.logo_url} onChange={set("logo_url")} placeholder="https://…/logo.png" />
            </Field>
          </div>
        </Card>

        <h2 className="mt-7 mb-3 px-1 text-[13px] font-semibold tracking-[.06em] text-gris uppercase">Crédito y avisos</h2>
        <Card className="p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Días de crédito" htmlFor="n-dc" hint="Plazo por defecto del pago único">
              <Input id="n-dc" inputMode="numeric" value={v.dias_credito} onChange={set("dias_credito")} />
            </Field>
            <Field label="Días de aviso" htmlFor="n-da" hint="Antes del vencimiento se marca “Por vencer”">
              <Input id="n-da" inputMode="numeric" value={v.dias_aviso} onChange={set("dias_aviso")} />
            </Field>
          </div>
        </Card>

        <h2 className="mt-7 mb-3 px-1 text-[13px] font-semibold tracking-[.06em] text-gris uppercase">Mensaje de recordatorio</h2>
        <Card className="p-5 sm:p-6">
          <Field label="Plantilla" htmlFor="n-plantilla">
            <TextArea
              id="n-plantilla"
              ref={plantillaRef}
              value={v.plantilla_recordatorio}
              onChange={set("plantilla_recordatorio")}
              className="min-h-32"
            />
          </Field>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="px-1 text-[13px] text-gris">Insertar:</span>
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.tag}
                type="button"
                onClick={() => insertar(p.tag)}
                className="press h-9 rounded-full border border-borde bg-white px-3 text-[13px] font-medium hover:bg-papel"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-wa p-4">
            <div className="mb-1 text-[12px] font-semibold tracking-[.06em] text-ok uppercase">Vista previa</div>
            <p className="text-[14px] leading-relaxed whitespace-pre-line">{ejemplo}</p>
          </div>
        </Card>

        <div className="mt-5 flex justify-end">
          <Button type="submit" size="lg" loading={busy} disabled={rol !== "dueno"} className="w-full sm:w-auto sm:min-w-52">
            Guardar ajustes
          </Button>
        </div>
        {rol !== "dueno" && (
          <p className="mt-2 text-right text-[13px] text-gris">Solo el dueño del negocio puede cambiar estos datos.</p>
        )}
      </form>

      <h2 className="mt-9 mb-3 px-1 text-[13px] font-semibold tracking-[.06em] text-gris uppercase">Apartados</h2>
      <ApartadosManager />

      <div className="mt-10 border-t border-borde pt-6">
        <Button variant="danger" onClick={signOut} className="w-full sm:w-auto">
          <IconLogout size={18} /> Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
