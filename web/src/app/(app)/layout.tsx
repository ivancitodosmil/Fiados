import { Suspense, type ReactNode } from "react";
import { AppShell, Splash } from "@/components/app-shell";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Splash />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
