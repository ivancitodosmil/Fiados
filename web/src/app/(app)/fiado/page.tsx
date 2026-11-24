"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ClientPicker } from "@/components/client-picker";
import {
  Avatar,
  Button,
  Card,
  Chip,
  cx,
  Field,
  Input,
  PageHeader,
  Segmented,
  Skeleton,
  Soft,
  Spinner,
  Switch,
} from "@/components/ui";
import { FRECUENCIAS, fechaCorta, hoyISO, money, parseMonto, sumarDias } from "@/lib/format";
import { useNegocio } from "@/lib/session";
import { errMsg, getSupabase } from "@/lib/supabase";
import type { Apartado, Frecuencia, Simulacion } from "@/lib/types";

type Modo = "unico" | "fechas" | "cuotas";

export default function NuevoFiadoPage() {
  const params = useSearchParams();
  const router = useRouter();
  const clienteId = params.get("cliente");

  if (!clienteId)
    return (
      <div>
        <PageHeader title="Nuevo fiado" back="/inicio" />
        <ClientPicker titulo="¿A quién le vas a fiar?" onPick={(id) => router.replace(`/fiado?cliente=${id}`)} />
      </div>
    );
  return <FiadoForm key={clienteId} clienteId={clienteId} />;
}

function FiadoForm({ clienteId }: { clienteId: string }) {
  const negocio = useNegocio();
  const router = useRouter();
  const hoy = hoyISO(negocio.zona_horaria);

  const [cliente, setCliente] = useState<{ nombres: string } | null>(null);
  const [apartados, setApartados] = useState<Apartado[] | null>(null);

  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [apartadoId, setApartadoId] = useState<string | null>(null);
  const [tasa, setTasa] = useState("0");
  const [modo, setModo] = useState<Modo>("unico");
  const [inicio, setInicio] = useState(hoy);
  const [vence, setVence] = useState(sumarDias(hoy, negocio.dias_credito));
  const [fin, setFin] = useState(sumarDias(hoy, 28));
  const [frecuencia, setFrecuencia] = useState<Frecuencia>("semanal");
  const [numCuotas, setNumCuotas] = useState("4");
  const [primer, setPrimer] = useState("");
  const [sinDomingos, setSinDomingos] = useState(false);

  const [preview, setPreview] = useState<{ key: string; sim: Simulacion | null; error: string | null } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    const sb = getSupabase();
    Promise.all([
      sb.from("clientes").select("nombres").eq("id", clienteId).maybeSingle(),
      sb.from("apartados").select("*").eq("negocio_id", negocio.id).order("nombre"),
    ]).then(([c, a]) => {
      if (!alive) return;
      if (c.error || !c.data) toast.error(c.error ? errMsg(c.error) : "Cliente no encontrado");
      else setCliente(c.data);
      if (a.error) toast.error(errMsg(a.error));
      setApartados((a.data ?? []) as Apartado[]);
    });
    return () => {
      alive = false;
    };
  }, [clienteId, negocio.id]);

  const capital = parseMonto(monto);
  const tasaNum = tasa.trim() === "" ? 0 : parseMonto(tasa);
  const n = parseInt(numCuotas, 10);

  // Parámetros comunes a simular_deuda y crear_deuda.
  const plan = useMemo(() => {
    if (!(capital > 0) || isNaN(tasaNum) || tasaNum < 0) return null;
    const base: Record<string, unknown> = {
      p_capital: Math.round(capital * 100) / 100,
      p_tasa_interes: tasaNum,
      p_apartado: apartadoId,
      p_fecha_inicio: inicio || hoy,
    };
    if (modo === "unico") {
      if (!vence) return null;
      return { ...base, p_num_cuotas: 1, p_primer_vencimiento: vence };
    }
    if (modo === "fechas") {
      if (!fin) return null;
      return { ...base, p_fecha_fin: fin, p_frecuencia: frecuencia, p_excluir_domingos: sinDomingos };
    }
    if (!(n >= 1 && n <= 400)) return null;
    return {
      ...base,
      p_num_cuotas: n,
      p_frecuencia: frecuencia,
      p_primer_vencimiento: primer || null,
      p_excluir_domingos: sinDomingos,
    };
  }, [capital, tasaNum, apartadoId, inicio, hoy, modo, vence, fin, frecuencia, sinDomingos, n, primer]);

  const planKey = plan ? JSON.stringify(plan) : null;

  // Vista previa con simular_deuda (con espera de 400 ms).
  useEffect(() => {
    if (!plan || !planKey) return;
    let alive = true;
    const t = setTimeout(async () => {
      const { data, error } = await getSupabase().rpc("simular_deuda", { p_negocio: negocio.id, ...plan });
      if (!alive) return;
      setPreview({ key: planKey, sim: error ? null : (data as Simulacion), error: error ? errMsg(error) : null });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [plan, planKey, negocio.id]);

  const vigente = preview && preview.key === planKey ? preview : null;
  const sim = vigente?.sim ?? null;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!plan) {
      toast.error(capital > 0 ? "Revisa los datos del plan de pago." : "Escribe el monto del fiado.");
      return;
    }
    setSaving(true);
    const { error } = await getSupabase().rpc("crear_deuda", {
      p_cliente: clienteId,
      p_descripcion: descripcion.trim() || null,
      ...plan,
    });
    setSaving(false);
    if (error) return void toast.error(errMsg(error));
    toast.success("Fiado guardado");
    router.replace(`/clientes/${clienteId}`);
  }

  function elegirApartado(a: Apartado | null) {
    setApartadoId(a?.id ?? null);
    setTasa(String(a ? Number(a.tasa_interes) : 0));
  }

  return (
    <form onSubmit={guardar} noValidate>
      <PageHeader title="Nuevo fiado" back={`/clientes/${clienteId}`} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Monto */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2.5 text-[14px] text-gris">
              {cliente ? (
                <>
                  <Avatar name={cliente.nombres} size={28} />
                  <span>
                    Monto fiado a <b className="font-semibold text-tinta">{cliente.nombres}</b>
                  </span>
                </>
              ) : (
                <Skeleton className="h-7 w-48" />
              )}
            </div>
            <label htmlFor="monto" className="sr-only">
              Monto
            </label>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="num text-[34px] text-gris">$</span>
              <input
                id="monto"
                inputMode="decimal"
                autoFocus
                value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0.00"
                className="num w-full min-w-0 bg-transparent text-[46px] leading-tight outline-none placeholder:text-borde"
              />
            </div>
            <Field label="Descripción" htmlFor="desc" className="mt-4">
              <Input
                id="desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Chompa, víveres de la semana…"
              />
            </Field>
          </Card>

          {/* Apartado e interés */}
          <Card className="p-5 sm:p-6">
            <div className="mb-2.5 px-1 text-[13px] font-medium text-gris">Apartado</div>
            <div className="flex flex-wrap gap-2">
              <Chip on={apartadoId === null} onClick={() => elegirApartado(null)}>
                General
              </Chip>
              {apartados === null ? (
                <Skeleton className="h-10 w-28 rounded-full" />
              ) : (
                apartados.map((a) => (
                  <Chip key={a.id} on={apartadoId === a.id} onClick={() => elegirApartado(a)}>
                    {a.color && <span className="size-2.5 rounded-full" style={{ background: a.color }} aria-hidden />}
                    {a.nombre}
                    {Number(a.tasa_interes) > 0 && <span className="opacity-70">{Number(a.tasa_interes)}%</span>}
                  </Chip>
                ))
              )}
            </div>
            <Field label="Interés (%)" htmlFor="tasa" className="mt-4 max-w-[200px]" hint="Fijo sobre el monto">
              <div className="relative">
                <Input
                  id="tasa"
                  inputMode="decimal"
                  value={tasa}
                  onChange={(e) => setTasa(e.target.value.replace(/[^\d.,]/g, ""))}
                  className="pr-10"
                />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-gris">%</span>
              </div>
            </Field>
          </Card>

          {/* Plan */}
          <Card className="p-5 sm:p-6">
            <div className="mb-2.5 px-1 text-[13px] font-medium text-gris">¿Cómo te va a pagar?</div>
            <Segmented
              label="Forma de pago"
              value={modo}
              onChange={setModo}
              options={[
                { value: "unico", label: "Pago único" },
                { value: "fechas", label: "Por fechas" },
                { value: "cuotas", label: "N° cuotas" },
              ]}
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Inicio" htmlFor="inicio">
                <Input id="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </Field>
              {modo === "unico" && (
                <Field label="Vence" htmlFor="vence">
                  <Input id="vence" type="date" value={vence} min={inicio} onChange={(e) => setVence(e.target.value)} />
                </Field>
              )}
              {modo === "fechas" && (
                <Field label="Fin (última cuota)" htmlFor="fin">
                  <Input id="fin" type="date" value={fin} min={inicio} onChange={(e) => setFin(e.target.value)} />
                </Field>
              )}
              {modo === "cuotas" && (
                <Field label="Número de cuotas" htmlFor="ncuotas">
                  <Input
                    id="ncuotas"
                    inputMode="numeric"
                    value={numCuotas}
                    onChange={(e) => setNumCuotas(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  />
                </Field>
              )}
            </div>

            {modo === "unico" && (
              <p className="mt-2 px-1 text-[13px] text-gris">
                Por defecto vence en {negocio.dias_credito} días (lo cambias en Ajustes).
              </p>
            )}

            {modo !== "unico" && (
              <>
                <Segmented
                  label="Frecuencia"
                  className="mt-4"
                  value={frecuencia}
                  onChange={setFrecuencia}
                  options={FRECUENCIAS}
                />
                {modo === "cuotas" && (
                  <Field label="Primer vencimiento (opcional)" htmlFor="primer" className="mt-4" hint="Si lo dejas vacío, es un periodo después del inicio">
                    <Input id="primer" type="date" value={primer} min={inicio} onChange={(e) => setPrimer(e.target.value)} />
                  </Field>
                )}
                <div className="mt-4">
                  <Switch
                    checked={sinDomingos}
                    onChange={setSinDomingos}
                    label="No cobrar domingos"
                    description={frecuencia === "diaria" ? "Se saltan los domingos" : "Si cae domingo, pasa al lunes"}
                  />
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Vista previa */}
        <div className="lg:sticky lg:top-8">
          <Soft className="p-5 sm:p-6" >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[17px] font-semibold">Resumen</h2>
              {plan && !vigente && <Spinner className="text-verde" />}
            </div>
            {!plan ? (
              <p className="py-6 text-center text-[15px] text-gris">
                {capital > 0 ? "Revisa los datos del plan." : "Escribe el monto para ver las cuotas."}
              </p>
            ) : vigente?.error ? (
              <p className="rounded-2xl bg-bad-bg px-4 py-3 text-[14px] font-medium text-bad" role="alert">
                {vigente.error}
              </p>
            ) : (
              <div className={cx("transition-opacity", !sim && "opacity-50")} aria-live="polite">
                <div className="flex justify-between py-1 text-[15px]">
                  <span className="text-gris">Capital</span>
                  <span className="num">{money(sim?.capital ?? capital)}</span>
                </div>
                <div className="flex justify-between py-1 text-[15px]">
                  <span className="text-gris">+ Interés {Number(sim?.tasa_interes ?? tasaNum)}%</span>
                  <span className="num">{money(sim?.interes ?? 0)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-verde/15 pt-3">
                  <span className="font-semibold">Total</span>
                  <span className="num text-[26px] text-verde">{money(sim?.total ?? 0)}</span>
                </div>
                {sim && (
                  <>
                    <div className="mt-3 font-semibold">
                      {sim.num_cuotas === 1 ? (
                        <>Un solo pago el {fechaCorta(sim.cuotas[0]?.vence)}</>
                      ) : (
                        <>
                          {sim.num_cuotas} cuotas de <span className="num">{money(sim.valor_cuota)}</span>
                        </>
                      )}
                    </div>
                    {sim.num_cuotas > 1 && (
                      <div className="mt-3 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
                        {sim.cuotas.map((q) => (
                          <span
                            key={q.numero}
                            title={money(q.monto)}
                            className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[13px] font-medium"
                          >
                            {fechaCorta(q.vence)}
                            {Number(q.monto) !== Number(sim.valor_cuota) && (
                              <span className="ml-1.5 text-gris">{money(q.monto)}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Soft>
          <Button type="submit" size="lg" loading={saving} disabled={!plan || !!vigente?.error} className="mt-4 w-full">
            Guardar fiado
          </Button>
        </div>
      </div>
    </form>
  );
}
