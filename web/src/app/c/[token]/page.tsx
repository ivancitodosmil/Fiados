import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { PortalCliente } from "./portal";

export const metadata: Metadata = {
  title: "Tu estado de cuenta",
  robots: { index: false, follow: false },
};

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-white">
          <Spinner className="size-6 text-verde" />
        </main>
      }
    >
      <PortalCliente />
    </Suspense>
  );
}
