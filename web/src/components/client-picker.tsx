"use client";

import { useCallback, useMemo, useState } from "react";
import { money } from "@/lib/format";
import { useNegocio } from "@/lib/session";
import { useLoad } from "@/lib/use-load";
import { errMsg, getSupabase } from "@/lib/supabase";
import type { ClienteResumen } from "@/lib/types";
import { ClientListSkeleton } from "./client-list";
import { IconPlus, IconSearch } from "./icons";
import { Avatar, ButtonLink, Card, Empty, ErrorBox, Input } from "./ui";

/** Elegir cliente cuando la pantalla se abre sin ?cliente=. */
export function ClientPicker({
  onPick,
  soloConDeuda,
  titulo,
}: {
  onPick: (id: string) => void;
  soloConDeuda?: boolean;
  titulo: string;
}) {
  const negocio = useNegocio();
  const [lista, setLista] = useState<ClienteResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    let query = getSupabase()
      .from("v_clientes_resumen")
      .select("*")
      .eq("negocio_id", negocio.id)
      .eq("activo", true)
      .order("nombres");
    if (soloConDeuda) query = query.gt("saldo_total", 0);
    const { data, error } = await query;
    if (error) return setError(errMsg(error));
    setError(null);
    setLista((data ?? []) as ClienteResumen[]);
  }, [negocio.id, soloConDeuda]);

  useLoad(load);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (lista ?? []).filter(
      (c) =>
        !t ||
        c.nombres.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(t) ||
        (c.cedula ?? "").includes(t),
    );
  }, [lista, q]);

  return (
    <div className="max-w-2xl">
      <p className="mb-3 px-1 text-[15px] text-gris">{titulo}</p>
      <div className="relative mb-3">
        <IconSearch size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gris" />
        <Input
          type="search"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o cédula"
          aria-label="Buscar cliente"
          className="rounded-full pl-11"
        />
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      <Card className="px-3 py-1">
        {!lista ? (
          <ClientListSkeleton />
        ) : visibles.length === 0 ? (
          <Empty
            title={lista.length === 0 ? (soloConDeuda ? "Nadie te debe" : "Aún no tienes clientes") : "Sin resultados"}
            text={lista.length === 0 && !soloConDeuda ? "Crea un cliente para registrarle un fiado." : undefined}
            action={
              lista.length === 0 && !soloConDeuda ? (
                <ButtonLink href="/clientes/nuevo">
                  <IconPlus size={18} /> Nuevo cliente
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-borde">
            {visibles.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPick(c.id)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-papel"
                >
                  <Avatar name={c.nombres} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{c.nombres}</div>
                    {c.cedula && <div className="text-[13px] text-gris">CI {c.cedula}</div>}
                  </div>
                  <span className="num text-[15px]">{money(c.saldo_total)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
