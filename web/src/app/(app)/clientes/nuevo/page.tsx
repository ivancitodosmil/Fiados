"use client";

import { ClientForm } from "@/components/client-form";
import { PageHeader } from "@/components/ui";

export default function NuevoClientePage() {
  return (
    <div>
      <PageHeader title="Nuevo cliente" back="/clientes" />
      <ClientForm />
    </div>
  );
}
