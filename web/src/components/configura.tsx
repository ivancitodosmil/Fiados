import { FiadosLogo } from "./brand";

export function ConfiguraSupabase() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-papel px-4 py-10">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-7 shadow-card sm:p-9">
        <FiadosLogo />
        <h1 className="mt-8 font-display text-[26px] font-semibold tracking-tight">Configura Supabase</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-gris">
          Falta conectar la app con tu base de datos. Crea un archivo <code className="rounded bg-papel px-1.5 py-0.5 text-tinta">.env.local</code>{" "}
          en la carpeta <code className="rounded bg-papel px-1.5 py-0.5 text-tinta">web/</code> con estas variables y vuelve a
          compilar la app:
        </p>
        <pre className="mt-5 overflow-x-auto rounded-2xl bg-tinta p-4 text-[13px] leading-6 text-verde-claro">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_PORTAL_URL=https://tu-dominio.com`}
        </pre>
        <p className="mt-5 text-[14px] text-gris">
          Encuentras la URL y la clave <b className="font-medium text-tinta">anon</b> en Supabase → Project Settings → API.
          En Vercel, agrégalas en Settings → Environment Variables.
        </p>
      </div>
    </main>
  );
}
