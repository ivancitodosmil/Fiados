"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, type ConfirmState } from "@/components/confirm";
import {
  IconBack,
  IconCash,
  IconChevron,
  IconEdit,
  IconPlus,
  IconPower,
  IconQr,
  IconTrash,
  IconWhatsApp,
} from "@/components/icons";
import { QrModal } from "@/components/qr-modal";
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  cx,
  Empty,
  ErrorBox,
  IconButton,
  Loading,
  estadoDeCuota,
  estadoSemaforo,
  Money,
  Soft,
  StatusTag,
} from "@/components/ui";
import { enviarRecordatorioWhatsApp } from "@/lib/actions";
import {
  detalleCliente,
  detalleCuota,
  dias,
  fecha,
  fechaCorta,
  hoyISO,
  metodoLabel,
  money,
} from "@/lib/format";
import { useNegocio } from "@/lib/session";
import { useLoad } from "@/lib/use-load";
import { errMsg, getSupabase } from "@/lib/supabase";
import type { ClienteResumen, Cuota, Deuda, Pago, SaldoApartado } from "@/lib/types";

interface Datos {
  cliente: ClienteResumen;
  apartados: SaldoApartado[];
  deudas: Deuda[];
  cuotas: Record<string, Cuota[]>;
  pagos: Pago[];
}

export default function ClienteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const negocio = useNegocio();
  const router = useRouter();
  const hoy = hoyISO(negocio.zona_horaria);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Record<string, boolean>>({});
  const [qrOpen, setQrOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [verPagadas, setVerPagadas] = useState(false);
  const [waBusy, setWaBusy] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const [c, a, d, q, p] = await Promise.all([
      sb.from("v_clientes_resumen").select("*").eq("id", id).maybeSingle(),
      sb.from("v_saldo_por_apartado").select("*").eq("cliente_id", id).order("saldo", { ascending: false }),
      sb.from("v_deudas").select("*").eq("cliente_id", id).order("fecha", { ascending: false }).order("created_at", { ascending: false }),
      sb.from("v_cuotas").select("*").eq("cliente_id", id).order("numero", { ascending: true }),
      sb.from("pagos").select("*").eq("cliente_id", id).order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(50),
    ]);
    const err = c.error || a.error || d.error || q.error || p.error;
    if (err) return setError(errMsg(err));
    if (!c.data) return setError("Cliente no encontrado.");
    const cuotas = agruparCuotas((q.data ?? []) as Cuota[]);
    setError(null);
    setDatos({
      cliente: c.data as ClienteResumen,
      apartados: (a.data ?? []) as SaldoApartado[],
      deudas: (d.data ?? []) as Deuda[],
      cuotas,
      pagos: (p.data ?? []) as Pago[],
    });
  }, [id, setDatos]);

  useLoad(load);

  if (error)
    return (
      <div>
        <BackLink />
        <ErrorBox message={error} onRetry={load} />
      </div>
    );
  if (!datos)
    return (
      <div>
        <BackLink />
        <Loading />
      </div>
    );

  const { cliente: c, apartados, deudas, cuotas, pagos } = datos;
  const saldo = Number(c.saldo_total);
  const activas = deudas.filter((d) => Number(d.saldo) > 0);
  const pagadas = deudas.filter((d) => Number(d.saldo) <= 0);

  const estadoCli = estadoSemaforo(c.semaforo, saldo);
  const detalleCli = detalleCliente(c, hoy);

  async function recordar() {
    setWaBusy(true);
    await enviarRecordatorioWhatsApp(c.id, negocio.id);
    setWaBusy(false);
  }

  function anular(d: Deuda) {
    setConfirm({
      title: "Anular fiado",
      text: `Se anulará “${d.descripcion || "Fiado"}” por ${money(d.monto)}. Solo se puede anular si no tiene pagos.`,
      confirmLabel: "Anular fiado",
      danger: true,
      action: async () => {
        const { error } = await getSupabase().from("deudas").update({ anulada: true }).eq("id", d.id);
        if (error) return void toast.error(errMsg(error));
        toast.success("Fiado anulado");
        await load();
      },
    });
  }

  function borrarPago(p: Pago) {
    setConfirm({
      title: "Eliminar pago",
      text: `Se eliminará el pago de ${money(p.monto)} del ${fecha(p.fecha)} y el saldo volverá a las cuotas.`,
      confirmLabel: "Eliminar pago",
      danger: true,
      action: async () => {
        const { error } = await getSupabase().from("pagos").delete().eq("id", p.id);
        if (error) return void toast.error(errMsg(error));
        toast.success("Pago eliminado");
        await load();
      },
    });
  }

  function toggleActivo() {
    const activar = !c.activo;
    setConfirm({
      title: activar ? "Reactivar cliente" : "Desactivar cliente",
      text: activar
        ? "El cliente volverá a aparecer en tu lista y en los totales."
        : "El cliente dejará de aparecer en tu lista y su portal QR dejará de funcionar. Sus datos no se borran.",
      confirmLabel: activar ? "Reactivar" : "Desactivar",
      danger: !activar,
      action: async () => {
        const { error } = await getSupabase().from("clientes").update({ activo: activar }).eq("id", c.id);
        if (error) return void toast.error(errMsg(error));
        toast.success(activar ? "Cliente reactivado" : "Cliente desactivado");
        if (!activar) router.push("/clientes");
        else await load();
      },
    });
  }

  const deudaCard = (d: Deuda) => {
    const open = !!abierta[d.id];
    const lista = cuotas[d.id] ?? [];
    const pct = Number(d.monto) > 0 ? (Number(d.pagado) / Number(d.monto)) * 100 : 0;
    const pagada = Number(d.saldo) <= 0;
    const est = pagada ? ("pagada" as const) : estadoSemaforo(d.semaforo);
    const prox = d.proximo_vencimiento;
    return (
      <Card key={d.id} className="overflow-hidden">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setAbierta((s) => ({ ...s, [d.id]: !open }))}
          className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-papel/60"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{d.descripcion || "Fiado"}</div>
            <div className="mt-0.5 text-[13px] text-gris">
              {d.apartado}
              {Number(d.tasa_interes) > 0 && ` con ${Number(d.tasa_interes)}% de interés`}
            </div>
            <div className="text-[13px] text-gris">
              {d.num_cuotas === 1 ? "Pago único" : `${d.num_cuotas} cuotas ${frecuenciaPlural(d.frecuencia)}`.trim()}
              {` desde el ${fecha(d.fecha)}`}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <StatusTag estado={est} label={pagada ? "Pagado" : undefined} />
              {!pagada && (
                <span className="text-[13px] text-gris">
                  {d.semaforo === "rojo"
                    ? `${dias(d.dias_atraso)} de atraso`
                    : prox
                      ? `próximo pago ${fechaCorta(prox)}`
                      : ""}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <Money value={d.saldo} className="block text-[18px]" />
            <div className="text-[12px] text-gris">de {money(d.monto)}</div>
          </div>
          <IconChevron size={20} className={cx("mt-1 shrink-0 text-gris transition-transform", open && "rotate-180")} />
        </button>
        <div className="px-5 pb-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-pista">
            <div className="h-full rounded-full bg-verde" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {open && (
          <div className="px-5 pt-2 pb-4">
            <div className="mb-2 grid grid-cols-3 gap-2 rounded-2xl bg-papel px-4 py-3 text-[13px]">
              <div>
                <div className="text-gris">Capital</div>
                <div className="num text-[15px]">{money(d.capital)}</div>
              </div>
              <div>
                <div className="text-gris">Interés</div>
                <div className="num text-[15px]">{money(d.interes)}</div>
              </div>
              <div>
                <div className="text-gris">Pagado</div>
                <div className="num text-[15px] text-ok">{money(d.pagado)}</div>
              </div>
            </div>
            <ul className="divide-y divide-borde">
              {lista.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="num grid size-7 place-items-center rounded-lg bg-papel text-[13px]">{q.numero}</span>
                    <div>
                      <div className={cx("font-medium tabular-nums", q.estado === "vencida" && "text-bad")}>
                        {money(q.monto)}
                        {Number(q.pagado) > 0 && Number(q.saldo) > 0 && (
                          <span className="ml-1.5 text-[12px] font-normal text-gris">(debe {money(q.saldo)})</span>
                        )}
                      </div>
                      <div className="text-[12px] text-gris">
                        {detalleCuota(q.estado, q.dias_atraso, q.fecha_vencimiento, hoy)}
                      </div>
                    </div>
                  </div>
                  <StatusTag estado={estadoDeCuota(q.estado)} label={q.estado === "vencida" ? "Vencida" : undefined} />
                </li>
              ))}
            </ul>
            {Number(d.pagado) <= 0 && (
              <button
                type="button"
                onClick={() => anular(d)}
                className="press mt-2 inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13px] font-semibold text-gris hover:bg-bad-bg hover:text-bad"
              >
                <IconTrash size={16} /> Anular fiado
              </button>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-4 flex items-center justify-between">
        <BackLink inline />
        <Link
          href={`/clientes/${c.id}/editar`}
          className="press inline-flex h-11 items-center gap-2 rounded-full px-4 font-semibold text-verde hover:bg-suave"
        >
          <IconEdit size={18} /> Editar
        </Link>
      </div>

      <div className="mb-5 flex items-center gap-3.5">
        <Avatar name={c.nombres} size={52} />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[22px] font-semibold tracking-tight lg:text-[26px]">{c.nombres}</h1>
          <div className="mt-0.5 flex flex-col text-[14px] leading-snug text-gris sm:flex-row sm:gap-5">
            {c.cedula && <span>CI {c.cedula}</span>}
            {c.celular && <span>Cel. {c.celular}</span>}
            {!c.cedula && !c.celular && <span>Sin cédula ni celular</span>}
          </div>
        </div>
        {!c.activo && <StatusTag estado="neutral" label="Inactivo" />}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-6">
        {/* Columna principal */}
        <div className="min-w-0">
          <Soft className="p-5 lg:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[14px] text-gris">Debe en total</div>
                <Money value={saldo} className="mt-0.5 block text-[38px] leading-tight lg:text-[42px]" />
              </div>
              <div className="flex flex-col items-end gap-1 pt-1">
                <StatusTag estado={estadoCli} />
                {detalleCli && <span className="text-[13px] text-gris">{detalleCli}</span>}
              </div>
            </div>
            {saldo > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <div>
                  <dt className="text-[12px] text-gris">Vencido</dt>
                  <dd className={cx("num text-[16px]", Number(c.total_vencido) > 0 ? "text-bad" : "text-tinta")}>
                    {money(c.total_vencido)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-gris">Próximo pago</dt>
                  <dd className="num text-[16px]">{fechaCorta(c.proximo_vencimiento)}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-gris">Debiendo hace</dt>
                  <dd className="num text-[16px]">{dias(c.dias_deuda)}</dd>
                </div>
                {c.limite_credito != null && (
                  <div>
                    <dt className="text-[12px] text-gris">Crédito disponible</dt>
                    <dd className="num text-[16px]">{money(c.credito_disponible)}</dd>
                  </div>
                )}
              </dl>
            )}
            {apartados.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {apartados.map((a) => (
                  <span
                    key={a.apartado_id ?? "general"}
                    className="inline-flex h-9 items-center rounded-full bg-white px-3.5 text-[14px] font-medium"
                  >
                    {a.apartado} <span className="num ml-1.5 text-[14px]">{money(a.saldo)}</span>
                  </span>
                ))}
              </div>
            )}
          </Soft>

          {/* Acciones */}
          <div className="mt-4 grid grid-cols-[1.3fr_1fr_auto] gap-2.5 sm:flex sm:flex-wrap">
            <Button onClick={recordar} loading={waBusy} disabled={saldo <= 0} className="sm:min-w-40">
              {!waBusy && <IconWhatsApp color="#fff" />} Recordar
            </Button>
            <ButtonLink href={`/cobros?cliente=${c.id}`} variant="secondary">
              <IconCash size={18} /> Pago
            </ButtonLink>
            <Button variant="secondary" onClick={() => setQrOpen(true)} aria-label="Ver QR" className="px-4">
              <IconQr size={18} /> <span className="hidden sm:inline">Ver QR</span>
            </Button>
            <ButtonLink href={`/fiado?cliente=${c.id}`} variant="secondary" className="col-span-3 sm:col-span-1">
              <IconPlus size={18} /> Nuevo fiado
            </ButtonLink>
          </div>

          <h2 className="mt-7 mb-3 px-1 text-[13px] font-semibold tracking-[.06em] text-gris uppercase">
            Fiados {activas.length > 0 && `(${activas.length})`}
          </h2>
          {activas.length === 0 ? (
            <Card>
              <Empty
                title="No debe nada"
                text="Este cliente no tiene fiados pendientes."
                action={
                  <ButtonLink href={`/fiado?cliente=${c.id}`}>
                    <IconPlus size={18} /> Nuevo fiado
                  </ButtonLink>
                }
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-3">{activas.map(deudaCard)}</div>
          )}

          {pagadas.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setVerPagadas((v) => !v)}
                className="press inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-verde hover:bg-suave"
              >
                {verPagadas ? "Ocultar" : "Ver"} fiados pagados ({pagadas.length})
                <IconChevron size={16} className={cx("transition-transform", verPagadas && "rotate-180")} />
              </button>
              {verPagadas && <div className="mt-3 flex flex-col gap-3">{pagadas.map(deudaCard)}</div>}
            </div>
          )}
        </div>

        {/* Columna lateral */}
        <div className="min-w-0">
          <h2 className="mb-3 px-1 text-[13px] font-semibold tracking-[.06em] text-gris uppercase lg:mt-0">Pagos recientes</h2>
          <Card className="px-5 py-1">
            {pagos.length === 0 ? (
              <Empty title="Sin pagos todavía" text="Cuando registres un pago aparecerá aquí." />
            ) : (
              <ul className="divide-y divide-borde">
                {pagos.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-ok-bg text-ok">
                      <IconCash size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{fecha(p.fecha)}</div>
                      <div className="truncate text-[13px] text-gris">{metodoLabel(p.metodo)}</div>
                      {p.nota && <div className="truncate text-[13px] text-gris">{p.nota}</div>}
                    </div>
                    <Money value={p.monto} className="text-[16px] text-ok" />
                    <IconButton label="Eliminar pago" onClick={() => borrarPago(p)} className="size-9 hover:text-bad">
                      <IconTrash size={17} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {(c.direccion || c.email || c.notas) && (
            <>
              <h2 className="mt-7 mb-3 px-1 text-[13px] font-semibold tracking-[.06em] text-gris uppercase">Datos</h2>
              <Card className="space-y-3 p-5 text-[14px]">
                {c.email && (
                  <div>
                    <div className="text-gris">Correo</div>
                    <div className="break-all">{c.email}</div>
                  </div>
                )}
                {c.direccion && (
                  <div>
                    <div className="text-gris">Dirección</div>
                    <div>{c.direccion}</div>
                  </div>
                )}
                {c.notas && (
                  <div>
                    <div className="text-gris">Notas</div>
                    <div className="whitespace-pre-line">{c.notas}</div>
                  </div>
                )}
              </Card>
            </>
          )}

          <button
            type="button"
            onClick={toggleActivo}
            className={cx(
              "press mt-5 inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-semibold",
              c.activo ? "text-gris hover:bg-bad-bg hover:text-bad" : "text-verde hover:bg-suave",
            )}
          >
            <IconPower size={17} /> {c.activo ? "Desactivar cliente" : "Reactivar cliente"}
          </button>
        </div>
      </div>

      <QrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        clienteId={c.id}
        nombre={c.nombres}
        token={c.portal_token}
        portalActivo={c.portal_activo && c.activo}
        onToken={(t) => setDatos((d) => (d ? { ...d, cliente: { ...d.cliente, portal_token: t } } : d))}
      />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function frecuenciaPlural(f: string | null): string {
  return f === "diaria" ? "diarias" : f === "semanal" ? "semanales" : f === "quincenal" ? "quincenales" : f === "mensual" ? "mensuales" : "";
}

function agruparCuotas(lista: Cuota[]): Record<string, Cuota[]> {
  const out: Record<string, Cuota[]> = {};
  for (const cu of lista) {
    if (!out[cu.deuda_id]) out[cu.deuda_id] = [];
    out[cu.deuda_id].push(cu);
  }
  return out;
}

function BackLink({ inline }: { inline?: boolean }) {
  return (
    <Link
      href="/clientes"
      className={cx(
        "press -ml-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-[15px] font-medium text-gris hover:text-tinta",
        !inline && "mb-4",
      )}
    >
      <IconBack size={20} /> Clientes
    </Link>
  );
}
