"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { parseMonto } from "@/lib/format";
import { useNegocio } from "@/lib/session";
import { errMsg, getSupabase } from "@/lib/supabase";
import type { Cliente } from "@/lib/types";
import { Button, ButtonLink, Card, Field, Input, TextArea } from "./ui";

interface Valores {
  nombres: string;
  cedula: string;
  celular: string;
  email: string;
  direccion: string;
  fecha_nacimiento: string;
  limite_credito: string;
  notas: string;
}

function inicial(c?: Cliente | null): Valores {
  return {
    nombres: c?.nombres ?? "",
    cedula: c?.cedula ?? "",
    celular: c?.celular ?? "",
    email: c?.email ?? "",
    direccion: c?.direccion ?? "",
    fecha_nacimiento: c?.fecha_nacimiento ?? "",
    limite_credito: c?.limite_credito != null ? String(c.limite_credito) : "",
    notas: c?.notas ?? "",
  };
}

export function ClientForm({ cliente }: { cliente?: Cliente | null }) {
  const negocio = useNegocio();
  const router = useRouter();
  const [v, setV] = useState<Valores>(() => inicial(cliente));
  const [errores, setErrores] = useState<Partial<Record<keyof Valores, string>>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof Valores) => (e: { target: { value: string } }) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  function validar() {
    const e: typeof errores = {};
    if (!v.nombres.trim()) e.nombres = "El nombre es obligatorio.";
    if (v.cedula && !/^\d{10}$/.test(v.cedula)) e.cedula = "La cédula debe tener exactamente 10 dígitos.";
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Revisa el correo.";
    if (v.celular && v.celular.replace(/\D/g, "").length < 9) e.celular = "Revisa el número de celular.";
    if (v.limite_credito) {
      const n = parseMonto(v.limite_credito);
      if (isNaN(n) || n < 0) e.limite_credito = "Escribe un monto válido.";
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validar()) return;
    setBusy(true);
    const payload = {
      nombres: v.nombres.trim(),
      cedula: v.cedula || null,
      celular: v.celular.trim() || null,
      email: v.email.trim() || null,
      direccion: v.direccion.trim() || null,
      fecha_nacimiento: v.fecha_nacimiento || null,
      limite_credito: v.limite_credito ? parseMonto(v.limite_credito) : null,
      notas: v.notas.trim() || null,
    };
    const sb = getSupabase();
    if (cliente) {
      const { error } = await sb.from("clientes").update(payload).eq("id", cliente.id);
      setBusy(false);
      if (error) return void toast.error(errMsg(error));
      toast.success("Cliente actualizado");
      router.replace(`/clientes/${cliente.id}`);
    } else {
      const { data, error } = await sb
        .from("clientes")
        .insert({ ...payload, negocio_id: negocio.id })
        .select("id")
        .single();
      setBusy(false);
      if (error) return void toast.error(errMsg(error));
      toast.success("Cliente creado");
      router.replace(`/clientes/${data.id}`);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl">
      <Card className="p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombres y apellidos *" htmlFor="nombres" error={errores.nombres} className="sm:col-span-2">
            <Input
              id="nombres"
              value={v.nombres}
              onChange={set("nombres")}
              placeholder="María Andrade"
              autoComplete="off"
              aria-invalid={!!errores.nombres}
              autoFocus={!cliente}
            />
          </Field>
          <Field label="Cédula" htmlFor="cedula" error={errores.cedula} hint="10 dígitos (opcional)">
            <Input
              id="cedula"
              inputMode="numeric"
              maxLength={10}
              value={v.cedula}
              onChange={(e) => setV((p) => ({ ...p, cedula: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              placeholder="1712345678"
              aria-invalid={!!errores.cedula}
            />
          </Field>
          <Field label="Celular" htmlFor="celular" error={errores.celular} hint="Para recordatorios por WhatsApp">
            <Input
              id="celular"
              type="tel"
              inputMode="tel"
              value={v.celular}
              onChange={set("celular")}
              placeholder="099 123 4567"
              aria-invalid={!!errores.celular}
            />
          </Field>
          <Field label="Correo" htmlFor="email" error={errores.email}>
            <Input
              id="email"
              type="email"
              inputMode="email"
              value={v.email}
              onChange={set("email")}
              placeholder="cliente@correo.com"
              aria-invalid={!!errores.email}
            />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="fnac">
            <Input id="fnac" type="date" value={v.fecha_nacimiento} onChange={set("fecha_nacimiento")} />
          </Field>
          <Field label="Dirección" htmlFor="direccion" className="sm:col-span-2">
            <Input id="direccion" value={v.direccion} onChange={set("direccion")} placeholder="Barrio, calle y referencia" />
          </Field>
          <Field
            label="Límite de crédito"
            htmlFor="limite"
            error={errores.limite_credito}
            hint="Déjalo vacío si no tiene límite"
          >
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gris">$</span>
              <Input
                id="limite"
                inputMode="decimal"
                value={v.limite_credito}
                onChange={set("limite_credito")}
                placeholder="0.00"
                className="pl-8"
                aria-invalid={!!errores.limite_credito}
              />
            </div>
          </Field>
          <Field label="Notas" htmlFor="notas" className="sm:col-span-2">
            <TextArea id="notas" value={v.notas} onChange={set("notas")} placeholder="Algo que debas recordar de este cliente" />
          </Field>
        </div>
      </Card>
      <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <ButtonLink href={cliente ? `/clientes/${cliente.id}` : "/clientes"} variant="secondary">
          Cancelar
        </ButtonLink>
        <Button type="submit" loading={busy} size="lg" className="sm:min-w-48">
          {cliente ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}
