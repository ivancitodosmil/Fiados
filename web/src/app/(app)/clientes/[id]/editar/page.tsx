"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ClientForm } from "@/components/client-form";
import { ErrorBox, Loading, PageHeader } from "@/components/ui";
import { useLoad } from "@/lib/use-load";
import { errMsg, getSupabase } from "@/lib/supabase";
import type { Cliente } from "@/lib/types";

export default function EditarClientePage() {
  const { id } = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from("clientes").select("*").eq("id", id).maybeSingle();
    if (error) return setError(errMsg(error));
    if (!data) return setError("Cliente no encontrado.");
    setError(null);
    setCliente(data as Cliente);
  }, [id]);

  useLoad(load);

  return (
    <div>
      <PageHeader title="Editar cliente" kicker={cliente?.nombres} back={`/clientes/${id}`} />
      {error ? <ErrorBox message={error} onRetry={load} /> : !cliente ? <Loading /> : <ClientForm cliente={cliente} />}
    </div>
  );
}
