"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use, useEffect, type ReactNode } from "react";
import { browser } from "react-dom";
import { SessionProvider, useSession } from "@/lib/session";
import { isConfigured } from "@/lib/supabase";
import { FiadosLogo, FiadosMark } from "./brand";
import { ConfiguraSupabase } from "./configura";
import { IconCash, IconFolder, IconHome, IconLogout, IconSettings, IconUsers } from "./icons";
import { Button, cx, ErrorBox, Spinner } from "./ui";

const NAV = [
  { href: "/inicio", label: "Inicio", icon: IconHome, mobile: true },
  { href: "/clientes", label: "Clientes", icon: IconUsers, mobile: true },
  { href: "/cobros", label: "Cobros", icon: IconCash, mobile: true },
  { href: "/apartados", label: "Apartados", icon: IconFolder, mobile: false },
  { href: "/ajustes", label: "Ajustes", icon: IconSettings, mobile: true },
];

export function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-white">
      <FiadosMark size={52} />
      <Spinner className="size-5 text-verde" />
    </div>
  );
}

/** Todo el panel se dibuja solo en el navegador (sesión en localStorage). */
export function AppShell({ children }: { children: ReactNode }) {
  if (!isConfigured()) return <ConfiguraSupabase />;
  return <BrowserOnly>{children}</BrowserOnly>;
}

function BrowserOnly({ children }: { children: ReactNode }) {
  use(browser("La sesión de Supabase vive en el navegador."));
  return (
    <SessionProvider>
      <Guard>{children}</Guard>
    </SessionProvider>
  );
}

function Guard({ children }: { children: ReactNode }) {
  const { status, negocio, negocioError, signOut } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "out") router.replace("/login");
  }, [status, router]);

  if (status !== "in") return <Splash />;
  if (negocioError)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-papel p-4">
        <div className="w-full max-w-md space-y-4">
          <ErrorBox message={negocioError} onRetry={() => window.location.reload()} />
          <Button variant="secondary" onClick={signOut} className="w-full">
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  if (!negocio) return <Splash />;
  return <Frame>{children}</Frame>;
}

function isActive(pathname: string, href: string) {
  if (href === "/cobros") return pathname.startsWith("/cobros");
  if (href === "/clientes") return pathname.startsWith("/clientes") || pathname.startsWith("/fiado");
  return pathname === href || pathname.startsWith(href + "/");
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { negocio, rol, signOut, session } = useSession();

  return (
    <div className="min-h-dvh bg-white lg:flex lg:bg-papel">
      {/* Barra lateral (escritorio) */}
      <div className="hidden w-[248px] shrink-0 border-r border-borde bg-white lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col overflow-y-auto px-4 py-6">
        <Link href="/inicio" className="px-2">
          <FiadosLogo />
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Principal">
          {NAV.map((n) => {
            const on = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "press flex h-12 items-center gap-3 rounded-2xl px-3.5 text-[15px] font-medium",
                  on ? "bg-papel text-verde" : "text-gris hover:bg-papel/60 hover:text-tinta",
                )}
              >
                <n.icon size={20} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <div className="rounded-[20px] bg-papel p-4">
          <div className="truncate text-[14px] font-semibold">{negocio?.nombre}</div>
          <div className="text-[12px] text-gris">{rol === "dueno" ? "Dueño" : "Empleado"}</div>
          <div className="truncate text-[12px] text-gris">{session?.user.email}</div>
          <button
            type="button"
            onClick={signOut}
            className="press mt-3 inline-flex h-9 items-center gap-2 rounded-full text-[13px] font-semibold text-gris hover:text-bad"
          >
            <IconLogout size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>
      </div>

      {/* Contenido */}
      <main className="min-w-0 flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(96px+env(safe-area-inset-bottom))] sm:px-6 lg:px-9 lg:pt-8 lg:pb-12">
        <div className="mx-auto w-full max-w-[1180px]">{children}</div>
      </main>

      {/* Barra inferior (móvil) */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around bg-white px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-tab lg:hidden"
      >
        {NAV.filter((n) => n.mobile).map((n) => {
          const on = isActive(pathname, n.href) || (n.href === "/ajustes" && pathname.startsWith("/apartados"));
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={cx(
                "press flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-2xl text-[12px] font-medium",
                on ? "text-verde" : "text-gris",
              )}
            >
              <span className={cx("grid h-8 w-12 place-items-center rounded-full transition-colors", on && "bg-suave")}>
                <n.icon size={21} />
              </span>
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
