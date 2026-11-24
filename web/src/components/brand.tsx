import Image from "next/image";
import { cx } from "@/lib/cx";

export function FiadosMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cx("relative grid shrink-0 place-items-center bg-verde font-display font-bold text-white", className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), fontSize: Math.round(size * 0.53) }}
    >
      F
      <span
        className="absolute rounded-full border-2 border-white bg-coral"
        style={{ width: Math.max(8, size * 0.34), height: Math.max(8, size * 0.34), right: -3, bottom: -3 }}
      />
    </div>
  );
}

export function FiadosLogo({ dark, size = 34 }: { dark?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <FiadosMark size={size} />
      <div className="leading-none">
        <div className={cx("font-display text-[20px] font-semibold", dark ? "text-white" : "text-tinta")}>Fiados</div>
        <div className={cx("mt-1 flex items-center gap-1.5 text-[11px]", dark ? "text-white/70" : "text-gris")}>
          por
          <Image
            src={dark ? "/brand/logo-horizontal-blanco-recorte.png" : "/brand/logo-horizontal-color-recorte.png"}
            alt="Predir"
            width={50}
            height={14}
            className="h-3.5 w-auto"
            priority
          />
        </div>
      </div>
    </div>
  );
}
