"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ClientList, ClientListSkeleton } from "@/components/client-list";
import { IconPlus, IconSearch, IconUsers } from "@/components/icons";
import { ButtonLink, Card, Chip, Empty, ErrorBox, Input, PageHeader } from "@/components/ui";
import { useNegocio } from "@/lib/session";
import { useLoad } from "@/lib/use-load";
import { errMsg, getSupabase } from "@/lib/supabase";
import type { ClienteResumen } from "@/lib/types";

type Filtro = "todos" | "rojo" | "amarillo" | "verde" | "inactivos";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "rojo", label: "Vencidos" },
  { value: "amarillo", label: "Por vencer" },
  { value: "verde", label: "Al día" },
];

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function ClientesPage() {
  const negocio = useNegocio();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [clientes, setClientes] = useState<ClienteResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("v_clientes_resumen")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombres", { ascending: true });
    if (error) {
      setError(errMsg(error));
      return;
    }
    setError(null);
    setClientes((data ?? []) as ClienteResumen[]);
  }, [negocio.id]);

  useLoad(load);

  const conteo = useMemo(() => {
    const act = (clientes ?? []).filter((c) => c.activo);
    return {
      todos: act.length,
      rojo: act.filter((c) => c.semaforo === "rojo").length,
      amarillo: act.filter((c) => c.semaforo === "amarillo").length,
      verde: act.filter((c) => c.semaforo === "verde").length,
      inactivos: (clientes ?? []).length - act.length,
    };
  }, [clientes]);

  const visibles = useMemo(() => {
    if (!clientes) return [];
    const t = normalizar(q.trim());
    const digits = q.replace(/\D/g, "");
    return clientes.filter((c) => {
      if (filtro === "inactivos" ? c.activo : !c.activo) return false;
      if (filtro !== "todos" && filtro !== "inactivos" && c.semaforo !== filtro) return false;
      if (!t) return true;
      return normalizar(c.nombres).includes(t) || (!!digits && (c.cedula ?? "").includes(digits));
    });
  }, [clientes, q, filtro]);

  return (
    <div>
      <PageHeader
        title="Clientes"
        kicker={clientes ? `${conteo.todos} ${conteo.todos === 1 ? "cliente activo" : "clientes activos"}` : " "}
        actions={
          <ButtonLink href="/clientes/nuevo" className="hidden lg:inline-flex">
            <IconPlus size={18} /> Nuevo cliente
          </ButtonLink>
        }
      />

      <div className="relative mb-3">
        <IconSearch size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gris" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o cédula"
          aria-label="Buscar por nombre o cédula"
          className="rounded-full pl-11 lg:max-w-md"
        />
      </div>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {FILTROS.map((f) => (
          <Chip key={f.value} on={filtro === f.value} onClick={() => setFiltro(f.value)}>
            {f.label}
            {clientes && <span className={filtro === f.value ? "text-white/70" : "text-gris"}>{conteo[f.value]}</span>}
          </Chip>
        ))}
        {conteo.inactivos > 0 && (
          <Chip on={filtro === "inactivos"} onClick={() => setFiltro("inactivos")}>
            Inactivos <span className={filtro === "inactivos" ? "text-white/70" : "text-gris"}>{conteo.inactivos}</span>
          </Chip>
        )}
      </div>

      {error && <ErrorBox message={error} onRetry={load} />}

      <Card className="px-4 py-1 lg:px-2 lg:py-2">
        {!clientes ? (
          <ClientListSkeleton rows={6} />
        ) : clientes.length === 0 ? (
          <Empty
            icon={<IconUsers size={26} />}
            title="Aún no tienes clientes"
            text="Agrega a tu primer cliente para empezar a registrar sus fiados."
            action={
              <ButtonLink href="/clientes/nuevo">
                <IconPlus size={18} /> Agregar cliente
              </ButtonLink>
            }
          />
        ) : visibles.length === 0 ? (
          <Empty title="Sin resultados" text="Ningún cliente coincide con la búsqueda o el filtro." />
        ) : (
          <ClientList clientes={visibles} negocioId={negocio.id} zona={negocio.zona_horaria} />
        )}
      </Card>

      {/* FAB móvil */}
      <Link
        href="/clientes/nuevo"
        className="press fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 inline-flex h-14 items-center gap-2 rounded-full bg-verde px-5 font-semibold text-white shadow-pop lg:hidden"
      >
        <IconPlus size={20} /> Cliente
      </Link>
    </div>
  );
}
