"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { IconCheck, IconPlus, IconSearch } from "@/components/icons";
import {
  statusColor,
  Avatar,
  ButtonLink,
  Card,
  cx,
  Empty,
  ErrorBox,
  Input,
  Money,
  Skeleton,
  Soft,
  StatusTag,
} from "@/components/ui";
import { WaButton } from "@/components/wa-button";
import { dias, fecha, fechaCorta, fechaLarga, hoyISO, mesLargo, metodoLabel, money, sumarDias, venceTexto } from "@/lib/format";
import { useNegocio, useSession } from "@/lib/session";
import { errMsg, getSupabase } from "@/lib/supabase";
import type { EstadoCuota, Metodo } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

interface CuotaPendiente {
  id: string;
  cliente_id: string;
  descripcion: string | null;
  numero: number;
  num_cuotas: number;
  saldo: number;
  fecha_vencimiento: string;
  dias_atraso: number;
  estado: EstadoCuota;
}

interface PagoReciente {
  id: string;
  cliente_id: string;
  monto: number;
  fecha: string;
  metodo: Metodo;
  clientes: { nombres: string } | null;
}

interface Datos {
  cobradoMes: number;
  cuotas: CuotaPendiente[];
  nombres: Record<string, string>;
  pagosSemana: { monto: number; fecha: string }[];
  ultimos: PagoReciente[];
}

const SEMANAS = 8;

/** Lunes (YYYY-MM-DD) de la semana de una fecha. */
function lunes(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return sumarDias(iso, -((dow + 6) % 7));
}

export default function InicioPage() {
  const negocio = useNegocio();
  const { session } = useSession();
  const router = useRouter();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const hoy = hoyISO(negocio.zona_horaria);
  const desde = sumarDias(lunes(hoy), -7 * (SEMANAS - 1));

  const load = useCallback(async () => {
    const sb = getSupabase();
    const [d, cl, cu, ps, up] = await Promise.all([
      sb.from("v_dashboard").select("cobrado_mes").eq("negocio_id", negocio.id).maybeSingle(),
      sb.from("v_clientes_resumen").select("id, nombres").eq("negocio_id", negocio.id).eq("activo", true),
      sb
        .from("v_cuotas")
        .select("id, cliente_id, descripcion, numero, num_cuotas, saldo, fecha_vencimiento, dias_atraso, estado")
        .eq("negocio_id", negocio.id)
        .gt("saldo", 0),
      sb.from("pagos").select("monto, fecha").eq("negocio_id", negocio.id).gte("fecha", desde),
      sb
        .from("pagos")
        .select("id, cliente_id, monto, fecha, metodo, clientes(nombres)")
        .eq("negocio_id", negocio.id)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
    const err = d.error || cl.error || cu.error || ps.error || up.error;
    if (err) return setError(errMsg(err));
    const nombres: Record<string, string> = {};
    for (const c of (cl.data ?? []) as { id: string; nombres: string }[]) nombres[c.id] = c.nombres;
    setError(null);
    setDatos({
      cobradoMes: Number((d.data as { cobrado_mes: number } | null)?.cobrado_mes ?? 0),
      // Solo clientes activos (igual que v_dashboard).
      cuotas: ((cu.data ?? []) as CuotaPendiente[]).filter((c) => nombres[c.cliente_id] !== undefined),
      nombres,
      pagosSemana: (ps.data ?? []) as { monto: number; fecha: string }[],
      ultimos: (up.data ?? []) as unknown as PagoReciente[],
    });
  }, [negocio.id, desde]);

  useLoad(load);

  // Reparto de la deuda por estado (montos desde las cuotas pendientes).
  const reparto = useMemo(() => {
    const base = {
      vencido: { monto: 0, clientes: new Set<string>() },
      por_vencer: { monto: 0, clientes: new Set<string>() },
      al_dia: { monto: 0, clientes: new Set<string>() },
    };
    for (const c of datos?.cuotas ?? []) {
      const k = c.estado === "vencida" ? "vencido" : c.estado === "por_vencer" ? "por_vencer" : "al_dia";
      base[k].monto += Number(c.saldo);
      base[k].clientes.add(c.cliente_id);
    }
    const total = base.vencido.monto + base.por_vencer.monto + base.al_dia.monto;
    const conSaldo = new Set((datos?.cuotas ?? []).map((c) => c.cliente_id)).size;
    return { ...base, total, conSaldo };
  }, [datos]);

  // Cobrado por semana (8 semanas, la última es la actual).
  const semanas = useMemo(() => {
    const inicio = lunes(hoy);
    const arr = Array.from({ length: SEMANAS }, (_, i) => ({
      desde: sumarDias(inicio, -7 * (SEMANAS - 1 - i)),
      monto: 0,
    }));
    for (const p of datos?.pagosSemana ?? []) {
      const l = lunes(p.fecha);
      const s = arr.find((w) => w.desde === l);
      if (s) s.monto += Number(p.monto);
    }
    return arr;
  }, [datos, hoy]);
  const maxSemana = Math.max(1, ...semanas.map((s) => s.monto));

  const porCobrar = useMemo(
    () =>
      (datos?.cuotas ?? [])
        .filter((c) => c.estado === "vencida" || c.estado === "por_vencer")
        .sort(
          (a, b) =>
            Number(b.dias_atraso) - Number(a.dias_atraso) || a.fecha_vencimiento.localeCompare(b.fecha_vencimiento),
        ),
    [datos],
  );

  function buscar(e: FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/clientes?q=${encodeURIComponent(q.trim())}` : "/clientes");
  }

  const nombreUsuario = (session?.user.user_metadata?.nombre as string | undefined) ?? "";
  const mes = mesLargo(hoy);
  const LIMITE = 8;

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 lg:mb-7">
        <div className="min-w-0">
          <h1 className="font-display text-[24px] font-semibold tracking-tight lg:text-[28px]">
            Hola{nombreUsuario ? `, ${nombreUsuario}` : ""} 👋
          </h1>
          <div className="text-[14px] text-gris lg:text-[15px]">{fechaLarga(hoy)}</div>
        </div>
        <Link href="/ajustes" aria-label="Ajustes" className="lg:hidden">
          <Avatar name={negocio.nombre} />
        </Link>
        <div className="hidden items-center gap-2.5 lg:flex">
          <form onSubmit={buscar} role="search" className="relative">
            <IconSearch size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gris" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente o cédula"
              aria-label="Buscar cliente o cédula"
              className="w-[240px] rounded-full pl-11 xl:w-[300px]"
            />
          </form>
          <ButtonLink href="/cobros" variant="secondary">
            Registrar pago
          </ButtonLink>
          <ButtonLink href="/fiado">
            <IconPlus size={18} /> Nuevo fiado
          </ButtonLink>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBox message={error} onRetry={load} />
        </div>
      )}

      {/* Una sola rejilla: en móvil el orden prioriza "Cobrar hoy"; desde 1100px, 2 filas x 2 columnas. */}
      <div className="grid gap-4 min-[1100px]:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* Por cobrar */}
        <Soft className="order-1 p-5 sm:p-7 min-[1100px]:col-start-1 min-[1100px]:row-start-1">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-medium text-gris">Por cobrar</h2>
            {datos && (
              <span className="text-[13px] text-gris">
                {reparto.conSaldo} {reparto.conSaldo === 1 ? "cliente con saldo" : "clientes con saldo"}
              </span>
            )}
          </div>
          {datos ? (
            <Money value={reparto.total} splitCents className="mt-1 block text-[44px] leading-[1.1] sm:text-[52px]" />
          ) : (
            <Skeleton className="mt-3 h-12 w-56 bg-white/60" />
          )}

          {/* Barra apilada */}
          <div
            className="mt-6 flex h-3.5 gap-[3px] overflow-hidden rounded-full bg-pista"
            role="img"
            aria-label={`Vencido ${money(reparto.vencido.monto)}, por vencer ${money(reparto.por_vencer.monto)}, al día ${money(reparto.al_dia.monto)}`}
          >
            {reparto.total > 0 &&
              (["vencido", "por_vencer", "al_dia"] as const).map((k) =>
                reparto[k].monto > 0 ? (
                  <div
                    key={k}
                    className="h-full transition-[flex-grow] duration-500 ease-out first:rounded-l-full last:rounded-r-full"
                    style={{ flexGrow: reparto[k].monto, flexBasis: 0, minWidth: 6, background: statusColor[k] }}
                  />
                ) : null,
              )}
          </div>

          {/* Leyenda */}
          <dl className="mt-5 grid grid-cols-3 gap-3 sm:gap-6">
            {(
              [
                ["vencido", "Vencido", "text-bad"],
                ["por_vencer", "Por vencer", "text-warn-text"],
                ["al_dia", "Al día", "text-tinta"],
              ] as const
            ).map(([k, label, color]) => (
              <div key={k} className="min-w-0">
                <dt className="flex items-center gap-2 text-[13px] text-gris">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: statusColor[k] }} />
                  <span className="truncate">{label}</span>
                </dt>
                <dd className={cx("num mt-1 text-[18px] sm:text-[22px]", color)}>
                  {datos ? money(reparto[k].monto) : " "}
                </dd>
                <dd className="text-[13px] text-gris">
                  {datos ? `${reparto[k].clientes.size} ${reparto[k].clientes.size === 1 ? "cliente" : "clientes"}` : ""}
                </dd>
              </div>
            ))}
          </dl>
        </Soft>

        {/* Cobrado */}
        <Card className="order-4 flex flex-col p-5 sm:p-7 min-[1100px]:col-start-2 min-[1100px]:row-start-1">
          <h2 className="text-[15px] font-medium text-gris first-letter:uppercase">Cobrado en {mes}</h2>
          {datos ? (
            <Money value={datos.cobradoMes} className="mt-1 block text-[32px] leading-tight text-verde" />
          ) : (
            <Skeleton className="mt-2 h-9 w-36" />
          )}
          <div className="mt-auto pt-6">
            <div className="mb-2 flex items-baseline justify-between text-[12px] text-gris">
              <span>Cobrado por semana</span>
              <span>
                Esta semana{" "}
                <b className="num text-[13px] text-tinta">{money(semanas[semanas.length - 1]?.monto ?? 0)}</b>
              </span>
            </div>
            <div className="flex h-[104px] items-end gap-2" role="list" aria-label="Pagos recibidos por semana">
              {semanas.map((s, i) => {
                const actual = i === semanas.length - 1;
                const h = s.monto > 0 ? Math.max(6, (s.monto / maxSemana) * 100) : 0;
                return (
                  <div
                    key={s.desde}
                    role="listitem"
                    aria-label={`Semana del ${fechaCorta(s.desde)}: ${money(s.monto)}`}
                    title={`Semana del ${fechaCorta(s.desde)}: ${money(s.monto)}`}
                    className="flex h-full flex-1 flex-col justify-end rounded-[6px] bg-pista"
                  >
                    <div
                      className={cx("rounded-[6px] transition-[height] duration-500 ease-out", actual ? "bg-verde" : "bg-verde/45")}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex gap-2 text-[11px] text-gris">
              {semanas.map((s, i) => (
                <span
                  key={s.desde}
                  className={cx("flex-1 text-center whitespace-nowrap", i === semanas.length - 1 && "font-semibold text-tinta")}
                >
                  {i % 2 === 1 ? fechaCorta(s.desde) : ""}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Acciones (móvil y tablet) */}
        <div className="order-2 flex gap-2.5 lg:hidden">
        <ButtonLink href="/fiado" className="flex-1">
          <IconPlus size={18} /> Nuevo fiado
        </ButtonLink>
        <ButtonLink href="/cobros" variant="secondary" className="flex-1">
          Registrar pago
        </ButtonLink>
        </div>

        {/* Cobrar hoy */}
        <Card className="order-3 px-2 py-2 sm:px-3 min-[1100px]:col-start-1 min-[1100px]:row-start-2">
          <div className="flex items-baseline justify-between gap-3 px-3 pt-3 pb-2 sm:px-4">
            <div>
              <h2 className="font-display text-[18px] font-semibold">Cobrar hoy</h2>
              <p className="text-[13px] text-gris">Cuotas vencidas y las que vencen en {dias(negocio.dias_aviso)}</p>
            </div>
            {datos && porCobrar.length > 0 && (
              <span className="text-[13px] whitespace-nowrap text-gris">
                {porCobrar.length} {porCobrar.length === 1 ? "cuota" : "cuotas"}
              </span>
            )}
          </div>

          {!datos ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : porCobrar.length === 0 ? (
            <Empty
              icon={<IconCheck size={26} />}
              title="Nada por cobrar hoy"
              text="No hay cuotas vencidas ni por vencer. Cuando algo esté por vencer aparecerá aquí."
            />
          ) : (
            <>
              <table className="w-full border-collapse text-[14px]">
                <thead className="hidden sm:table-header-group">
                  <tr className="border-b border-borde text-left text-[12px] tracking-[.05em] text-gris uppercase">
                    <th className="py-2.5 pr-3 pl-4 font-medium">Cliente</th>
                    <th className="px-3 py-2.5 font-medium">Detalle</th>
                    <th className="px-3 py-2.5 text-right font-medium">Pendiente</th>
                    <th className="px-3 py-2.5 font-medium">Estado</th>
                    <th className="w-[56px] py-2.5 pr-3">
                      <span className="sr-only">WhatsApp</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {porCobrar.slice(0, LIMITE).map((c) => {
                    const est = c.estado === "vencida" ? "vencido" : "por_vencer";
                    const nombre = datos.nombres[c.cliente_id] ?? "Cliente";
                    const detalle = c.num_cuotas > 1 ? `Cuota ${c.numero} de ${c.num_cuotas}` : "Pago único";
                    const plazo =
                      c.estado === "vencida" ? `${dias(c.dias_atraso)} de atraso` : venceTexto(c.fecha_vencimiento, hoy);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => router.push(`/clientes/${c.cliente_id}`)}
                        className="cursor-pointer border-b border-borde transition-colors last:border-0 hover:bg-papel/70 max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1 max-sm:py-3.5 max-sm:px-3"
                      >
                        <td className="py-3 pr-3 pl-4 max-sm:contents">
                          <Link
                            href={`/clientes/${c.cliente_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex min-w-0 items-center gap-3 font-semibold hover:text-verde max-sm:flex-1"
                          >
                            <Avatar name={nombre} size={34} className="max-sm:hidden" />
                            <span className="truncate">{nombre}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-3 max-sm:order-3 max-sm:w-full max-sm:p-0">
                          <div className="truncate font-medium max-sm:text-[13px] max-sm:font-normal max-sm:text-gris">
                            {c.descripcion || "Fiado"}
                          </div>
                          <div className="text-[13px] text-gris">{detalle}</div>
                        </td>
                        <td
                          className={cx(
                            "num px-3 py-3 text-right text-[16px] max-sm:order-2 max-sm:p-0",
                            c.estado === "vencida" ? "text-bad" : "text-tinta",
                          )}
                        >
                          {money(c.saldo)}
                        </td>
                        <td className="px-3 py-3 max-sm:order-4 max-sm:flex max-sm:items-center max-sm:gap-2 max-sm:p-0">
                          <StatusTag estado={est} />
                          <div className="mt-1 text-[13px] whitespace-nowrap text-gris max-sm:mt-0">{plazo}</div>
                        </td>
                        <td className="py-2 pr-3 max-sm:order-5 max-sm:ml-auto max-sm:p-0">
                          <WaButton clienteId={c.cliente_id} negocioId={negocio.id} nombre={nombre} size={36} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {porCobrar.length > LIMITE && (
                <div className="px-4 pt-1 pb-3">
                  <Link href="/clientes" className="text-[14px] font-semibold text-verde hover:underline">
                    Ver {porCobrar.length - LIMITE} cuotas más en Clientes
                  </Link>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Últimos pagos */}
        <Card className="order-5 self-start px-2 py-2 sm:px-3 min-[1100px]:col-start-2 min-[1100px]:row-start-2">
          <div className="flex items-baseline justify-between px-3 pt-3 pb-2 sm:px-4">
            <h2 className="font-display text-[18px] font-semibold">Últimos pagos</h2>
            <Link href="/cobros" className="rounded-full px-2 py-1 text-[14px] font-semibold text-verde hover:bg-suave">
              Ver todos
            </Link>
          </div>
          {!datos ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : datos.ultimos.length === 0 ? (
            <Empty title="Aún no hay pagos" text="Los pagos que registres aparecerán aquí." />
          ) : (
            <ul>
              {datos.ultimos.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/clientes/${p.cliente_id}`}
                    className="relative flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-papel/70 sm:px-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{p.clientes?.nombres ?? "Cliente"}</div>
                      <div className="text-[13px] text-gris">{fecha(p.fecha)}</div>
                    </div>
                    <div className="text-right">
                      <Money value={p.monto} className="block text-[16px] text-verde" />
                      <div className="text-[12px] text-gris">{metodoLabel(p.metodo)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
