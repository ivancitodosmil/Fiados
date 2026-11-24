"use client";

import { ApartadosManager } from "@/components/apartados-manager";
import { PageHeader } from "@/components/ui";

export default function ApartadosPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Apartados" />
      <ApartadosManager />
    </div>
  );
}
