"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState, type FormEvent } from "react";
import { browser } from "react-dom";
import { toast } from "sonner";
import { FiadosLogo } from "@/components/brand";
import { ConfiguraSupabase } from "@/components/configura";
import { Button, Field, Input, Segmented } from "@/components/ui";
import { errMsg, getSupabase, isConfigured } from "@/lib/supabase";

type Modo = "login" | "registro";

export function LoginScreen() {
  if (!isConfigured()) return <ConfiguraSupabase />;
  return <LoginForm />;
}

function LoginForm() {
  use(browser("La sesión de Supabase vive en el navegador."));
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [negocio, setNegocio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Si ya hay sesión, directo al panel.
  useEffect(() => {
    let alive = true;
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (alive && data.session) router.replace("/inicio");
      });
    return () => {
      alive = false;
    };
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    if (modo === "registro" && !negocio.trim()) {
      setError("Escribe el nombre de tu negocio.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    const sb = getSupabase();
    if (modo === "login") {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) {
        setError(errMsg(error));
        return;
      }
      router.replace("/inicio");
    } else {
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { negocio: negocio.trim() },
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/inicio` : undefined,
        },
      });
      setBusy(false);
      if (error) {
        setError(errMsg(error));
        return;
      }
      if (data.session) {
        toast.success("¡Cuenta creada! Bienvenido a Fiados.");
        router.replace("/inicio");
      } else {
        setAviso("Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa aquí.");
        setModo("login");
      }
    }
  }

  return (
    <main className="grid min-h-dvh bg-white lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:px-10">
        <FiadosLogo />
        <div className="flex flex-1 items-center justify-center py-10">
          <form onSubmit={onSubmit} className="w-full max-w-[400px]" noValidate>
            <h1 className="font-display text-[28px] font-semibold tracking-tight">
              {modo === "login" ? "Hola de nuevo 👋" : "Crea tu cuenta"}
            </h1>
            <p className="mt-1.5 text-[15px] text-gris">
              {modo === "login"
                ? "Ingresa para ver lo que te deben tus clientes."
                : "En un minuto tienes tu cuaderno de fiados en línea."}
            </p>

            <Segmented
              label="Modo"
              className="mt-7"
              value={modo}
              onChange={(v) => {
                setModo(v);
                setError(null);
              }}
              options={[
                { value: "login", label: "Ingresar" },
                { value: "registro", label: "Crear cuenta" },
              ]}
            />

            <div className="mt-6 flex flex-col gap-4">
              {modo === "registro" && (
                <Field label="Nombre de tu negocio" htmlFor="negocio">
                  <Input
                    id="negocio"
                    value={negocio}
                    onChange={(e) => setNegocio(e.target.value)}
                    placeholder="Tienda Don Pepe"
                    autoComplete="organization"
                    required
                  />
                </Field>
              )}
              <Field label="Correo electrónico" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="Contraseña" htmlFor="password">
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={modo === "login" ? "current-password" : "new-password"}
                  required
                />
              </Field>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-2xl bg-bad-bg px-4 py-3 text-[14px] font-medium text-bad">
                {error}
              </p>
            )}
            {aviso && (
              <p role="status" className="mt-4 rounded-2xl bg-ok-bg px-4 py-3 text-[14px] font-medium text-ok">
                {aviso}
              </p>
            )}

            <Button type="submit" size="lg" loading={busy} className="mt-6 w-full">
              {modo === "login" ? "Ingresar" : "Crear mi cuenta"}
            </Button>
          </form>
        </div>
        <p className="text-center text-[13px] text-gris">Fiados es un producto de Predir, hecho en Ecuador</p>
      </div>

      {/* Panel ilustrativo (escritorio) */}
      <div className="hidden p-4 lg:block">
        <div className="flex h-full flex-col justify-center rounded-[32px] bg-suave px-14 py-12">
          <p className="max-w-md font-display text-[34px] leading-tight font-semibold tracking-tight">
            Lo que te deben, claro y a la mano.
          </p>
          <p className="mt-3 max-w-md text-[16px] text-gris">
            Registra fiados, cobra por cuotas y recuerda por WhatsApp. Cada cliente ve su saldo con un código QR.
          </p>
          <div className="mt-10 max-w-md rounded-[24px] bg-white p-6 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-gris">Por cobrar</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bad-bg px-2.5 py-1 text-[12px] font-semibold text-bad">
                <span className="size-[7px] rounded-full bg-current" />3 vencidos
              </span>
            </div>
            <div className="num mt-1 text-[40px]">
              $1,250<span className="text-[0.62em] text-gris">.00</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-pista">
              <div className="h-full w-[24%] rounded-full bg-bad" />
            </div>
            <div className="mt-2 flex justify-between text-[13px]">
              <span className="font-semibold text-bad">$300.00 vencido</span>
              <span className="text-gris">$480 cobrado este mes</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
