import Link from "next/link";
import { FiadosMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">
      <FiadosMark size={48} />
      <h1 className="mt-6 font-display text-[26px] font-semibold tracking-tight">Página no encontrada</h1>
      <p className="mt-2 text-[15px] text-gris">La dirección que abriste no existe.</p>
      <Link
        href="/inicio"
        className="press mt-6 inline-flex h-12 items-center rounded-full bg-verde px-6 font-semibold text-white"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
