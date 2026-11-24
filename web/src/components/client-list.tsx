"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { detalleCliente, fechaCorta, hoyISO } from "@/lib/format";
import type { ClienteResumen } from "@/lib/types";
import { Avatar, estadoSemaforo, Money, StatusTag } from "./ui";
import { WaButton } from "./wa-button";

function est(c: ClienteResumen) {
  return estadoSemaforo(c.semaforo, c.saldo_total);
}

/** Lista en móvil, tabla en escritorio. */
export function ClientList({
  clientes,
  negocioId,
  zona,
}: {
  clientes: ClienteResumen[];
  negocioId: string;
  zona?: string;
}) {
  const router = useRouter();
  const hoy = hoyISO(zona);

  return (
    <>
      {/* Móvil / tablet */}
      <ul className="divide-y divide-borde lg:hidden">
        {clientes.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-3.5">
            <Link href={`/clientes/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl">
              <Avatar name={c.nombres} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{c.nombres}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusTag estado={est(c)} />
                  {detalleCliente(c, hoy) && <span className="text-[13px] text-gris">{detalleCliente(c, hoy)}</span>}
                </div>
              </div>
              <Money value={c.saldo_total} className="text-[17px]" />
            </Link>
            {Number(c.saldo_total) > 0 && <WaButton clienteId={c.id} negocioId={negocioId} nombre={c.nombres} />}
          </li>
        ))}
      </ul>

      {/* Escritorio */}
      <table className="hidden w-full border-collapse text-[14px] lg:table">
        <thead>
          <tr className="border-b border-borde text-left text-[12px] tracking-[.05em] text-gris uppercase">
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Cédula</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Próximo pago</th>
            <th className="px-4 py-3 text-right font-medium">Saldo</th>
            <th className="w-[64px] px-4 py-3">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr
              key={c.id}
              onClick={() => router.push(`/clientes/${c.id}`)}
              className="cursor-pointer border-b border-borde transition-colors last:border-0 hover:bg-papel/70"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/clientes/${c.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-3 font-semibold hover:text-verde"
                >
                  <Avatar name={c.nombres} size={36} />
                  {c.nombres}
                </Link>
              </td>
              <td className="px-4 py-3 text-gris tabular-nums">{c.cedula || "—"}</td>
              <td className="px-4 py-3">
                <StatusTag estado={est(c)} />
                {c.semaforo !== "verde" && detalleCliente(c, hoy) && (
                  <div className="mt-1 text-[13px] text-gris">{detalleCliente(c, hoy)}</div>
                )}
              </td>
              <td className="px-4 py-3 text-gris">{fechaCorta(c.proximo_vencimiento)}</td>
              <td className="px-4 py-3 text-right">
                <Money value={c.saldo_total} className="text-[16px]" />
              </td>
              <td className="px-4 py-2">
                {Number(c.saldo_total) > 0 && (
                  <WaButton clienteId={c.id} negocioId={negocioId} nombre={c.nombres} size={36} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export function ClientListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-borde" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-1 py-3.5">
          <div className="size-10 animate-pulse rounded-full bg-pista" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded-full bg-pista" />
            <div className="h-3 w-24 animate-pulse rounded-full bg-pista" />
          </div>
          <div className="h-5 w-20 animate-pulse rounded-full bg-pista" />
        </div>
      ))}
    </div>
  );
}

/** Orden "requieren atención": rojos primero, luego amarillos; más días de mora arriba. */
export function ordenAtencion(a: ClienteResumen, b: ClienteResumen) {
  const r = { rojo: 0, amarillo: 1, verde: 2 } as const;
  return (
    r[a.semaforo] - r[b.semaforo] ||
    Number(b.dias_mora) - Number(a.dias_mora) ||
    Number(b.saldo_total) - Number(a.saldo_total)
  );
}
