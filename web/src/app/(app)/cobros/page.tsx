"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ClientPicker } from "@/components/client-picker";
import { IconCash } from "@/components/icons";
import {
  Avatar,
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Input,
  Loading,
  Money,
  PageHeader,
  Segmented,
  Select,
  Skeleton,
  Soft,
  TextArea,
} from "@/components/ui";
import { fecha, fechaCorta, hoyISO, METODOS, metodoLabel, money, parseMonto } from "@/lib/format";
import { useNegocio } from "@/lib/session";
import { useLoad } from "@/lib/use-load";
import { errMsg, getSupabase } from "@/lib/supabase";
import type { ClienteResumen, Cuota, Deuda, Metodo } from "@/lib/types";

export default function CobrosPage() {
  const params = useSearchParams();
  const router = useRouter();
  const clienteId = params.get("cliente");

  if (clienteId) return <PagoForm key={clienteId} clienteId={clienteId} />;
  return (
    <div>
      <PageHeader title="Cobros" kicker="Registrar pago" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ClientPicker soloConDeuda titulo="¿Quién te está pagando?" onPick={(id) => router.push(`/cobros?cliente=${id}`)} />
        <PagosRecientes />
      </div>
    </div>
  );
}

interface PagoConCliente {
  id: string;
  cliente_id: string;
  monto: number;
  fecha: string;
  metodo: Metodo;
  nota: string | null;
  clientes: { nombres: string } | null;
}

function PagosRecientes() {
  const negocio = useNegocio();
  const [pagos, setPagos] = useState<PagoConCliente[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("pagos")
      .select("id, cliente_id, monto, fecha, metodo, nota, clientes(nombres)")
      .eq("negocio_id", negocio.id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return setError(errMsg(error));
    setError(null);
    setPagos((data ?? []) as unknown as PagoConCliente[]);
  }, [negocio.id]);

  useLoad(load);

  return (
    <div className="min-w-0">
      <p className="mb-3 px-1 text-[15px] text-gris">Últimos pagos recibidos</p>
      {error && <ErrorBox message={error} onRetry={load} />}
      <Card className="px-4 py-1">
        {!pagos ? (
          <Loading />
        ) : pagos.length === 0 ? (
          <Empty icon={<IconCash size={26} />} title="Aún no hay pagos" text="Los pagos que registres aparecerán aquí." />
        ) : (
          <ul className="divide-y divide-borde">
            {pagos.map((p) => (
              <li key={p.id}>
                <Link href={`/clientes/${p.cliente_id}`} className="flex items-center gap-3 rounded-2xl px-1 py-3 hover:bg-papel/60">
                  <Avatar name={p.clientes?.nombres ?? "?"} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.clientes?.nombres ?? "Cliente"}</div>
                    <div className="text-[13px] text-gris">{fecha(p.fecha)}</div>
                    <div className="text-[13px] text-gris">{metodoLabel(p.metodo)}</div>
                  </div>
                  <Money value={p.monto} className="text-[16px] text-ok" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

interface DatosPago {
  cliente: ClienteResumen;
  deudas: Deuda[];
  cuotas: Cuota[];
}

function PagoForm({ clienteId }: { clienteId: string }) {
  const negocio = useNegocio();
  const router = useRouter();
  const hoy = hoyISO(negocio.zona_horaria);
  const [datos, setDatos] = useState<DatosPago | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<Metodo>("efectivo");
  const [deudaId, setDeudaId] = useState("");
  const [fechaPago, setFechaPago] = useState(hoy);
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const [c, d, q] = await Promise.all([
      sb.from("v_clientes_resumen").select("*").eq("id", clienteId).maybeSingle(),
      sb.from("v_deudas").select("*").eq("cliente_id", clienteId).gt("saldo", 0).order("fecha"),
      sb.from("v_cuotas").select("*").eq("cliente_id", clienteId).gt("saldo", 0).order("fecha_vencimiento"),
    ]);
    const err = c.error || d.error || q.error;
    if (err) return setError(errMsg(err));
    if (!c.data) return setError("Cliente no encontrado.");
    setError(null);
    setDatos({ cliente: c.data as ClienteResumen, deudas: (d.data ?? []) as Deuda[], cuotas: (q.data ?? []) as Cuota[] });
  }, [clienteId]);

  useLoad(load);

  const calc = useMemo(() => {
    if (!datos) return { saldo: 0, vencido: 0, proxima: 0 };
    const cuotas = deudaId ? datos.cuotas.filter((q) => q.deuda_id === deudaId) : datos.cuotas;
    const saldo = cuotas.reduce((s, q) => s + Number(q.saldo), 0);
    const vencido = cuotas.filter((q) => q.estado === "vencida").reduce((s, q) => s + Number(q.saldo), 0);
    const proxima = Number(cuotas[0]?.saldo ?? 0);
    return { saldo: round2(saldo), vencido: round2(vencido), proxima: round2(proxima) };
  }, [datos, deudaId]);

  const valor = parseMonto(monto);
  const excede = valor > calc.saldo + 0.0001;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!(valor > 0)) return void toast.error("Escribe el monto del pago.");
    setSaving(true);
    const { error } = await getSupabase().from("pagos").insert({
      negocio_id: negocio.id,
      cliente_id: clienteId,
      monto: round2(valor),
      deuda_id: deudaId || null,
      metodo,
      nota: nota.trim() || null,
      fecha: fechaPago || hoy,
    });
    setSaving(false);
    if (error) return void toast.error(errMsg(error));
    toast.success(`Pago de ${money(valor)} registrado`);
    router.replace(`/clientes/${clienteId}`);
  }

  if (error)
    return (
      <div>
        <PageHeader title="Registrar pago" back="/cobros" />
        <ErrorBox message={error} onRetry={load} />
      </div>
    );

  const c = datos?.cliente;

  return (
    <form onSubmit={guardar} noValidate className="max-w-2xl">
      <PageHeader title="Registrar pago" back={`/clientes/${clienteId}`} />

      <Soft className="mb-5 flex items-center gap-3.5 p-5">
        {c ? (
          <>
            <Avatar name={c.nombres} size={46} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{c.nombres}</div>
              <div className="text-[13px] text-gris">
                Debe <b className="font-semibold text-tinta">{money(c.saldo_total)}</b>
                {Number(c.total_vencido) > 0 && (
                  <span className="block font-semibold text-bad">{money(c.total_vencido)} vencido</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <Skeleton className="h-12 w-full bg-white/60" />
        )}
      </Soft>

      {datos && datos.deudas.length === 0 ? (
        <Card>
          <Empty title="No tiene saldo pendiente" text="Este cliente no debe nada, no hay nada que cobrar." />
        </Card>
      ) : (
        <Card className="p-5 sm:p-6">
          <label htmlFor="monto" className="px-1 text-[13px] font-medium text-gris">
            Monto recibido
          </label>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="num text-[30px] text-gris">$</span>
            <input
              id="monto"
              inputMode="decimal"
              autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="0.00"
              aria-invalid={excede}
              className="num w-full min-w-0 bg-transparent text-[42px] leading-tight outline-none placeholder:text-borde"
            />
          </div>
          {excede && (
            <p className="mt-1 px-1 text-[13px] font-medium text-bad" role="alert">
              Supera lo que debe ({money(calc.saldo)}).
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {calc.vencido > 0 ? (
              <button
                type="button"
                onClick={() => setMonto(calc.vencido.toFixed(2))}
                className="press h-10 rounded-full bg-bad-bg px-4 text-[14px] font-semibold text-bad"
              >
                Pagar lo vencido: {money(calc.vencido)}
              </button>
            ) : (
              calc.proxima > 0 && (
                <button
                  type="button"
                  onClick={() => setMonto(calc.proxima.toFixed(2))}
                  className="press h-10 rounded-full bg-suave px-4 text-[14px] font-semibold text-verde"
                >
                  Pagar la próxima cuota: {money(calc.proxima)}
                </button>
              )
            )}
            {calc.saldo > 0 && (
              <button
                type="button"
                onClick={() => setMonto(calc.saldo.toFixed(2))}
                className="press h-10 rounded-full border border-borde bg-white px-4 text-[14px] font-semibold"
              >
                Pagar todo: {money(calc.saldo)}
              </button>
            )}
          </div>

          <div className="mt-5 mb-2 px-1 text-[13px] font-medium text-gris">Método</div>
          <Segmented label="Método de pago" value={metodo} onChange={setMetodo} options={METODOS} />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Aplicar a" htmlFor="deuda" hint="Por defecto se paga lo más antiguo primero">
              <Select id="deuda" value={deudaId} onChange={(e) => setDeudaId(e.target.value)}>
                <option value="">Lo más antiguo primero</option>
                {datos?.deudas.map((d) => (
                  <option key={d.id} value={d.id}>
                    {`${d.descripcion || "Fiado"} (${d.apartado}), debe ${money(d.saldo)}, del ${fechaCorta(d.fecha)}`}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fecha del pago" htmlFor="fpago">
              <Input id="fpago" type="date" value={fechaPago} max={hoy} onChange={(e) => setFechaPago(e.target.value)} />
            </Field>
            <Field label="Nota (opcional)" htmlFor="nota" className="sm:col-span-2">
              <TextArea id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Pagó por transferencia Pichincha" className="min-h-20" />
            </Field>
          </div>

          <Button type="submit" size="lg" loading={saving} disabled={!datos || !(valor > 0)} className="mt-6 w-full">
            Registrar pago{valor > 0 ? ` de ${money(valor)}` : ""}
          </Button>
        </Card>
      )}
    </form>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
