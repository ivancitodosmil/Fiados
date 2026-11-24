"use client";

import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import { iniciales, moneyParts } from "@/lib/format";
import type { EstadoCuota, Semaforo } from "@/lib/types";
import { IconBack, IconX } from "./icons";

export { cx };

/* ---------- Botones ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "destructive";

const variants: Record<Variant, string> = {
  primary: "bg-verde text-white hover:bg-verde-hover",
  secondary: "bg-white text-tinta border border-borde hover:bg-papel",
  ghost: "bg-transparent text-verde hover:bg-suave",
  danger: "bg-white text-bad border border-borde hover:bg-bad-bg",
  dark: "bg-tinta text-white hover:bg-black",
  destructive: "bg-bad text-white hover:bg-[#c03b3b]",
};

export function btnClass(variant: Variant = "primary", size: "md" | "lg" | "sm" = "md") {
  return cx(
    "press inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verde",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    size === "lg" && "h-[52px] px-6 text-base",
    size === "md" && "h-12 px-5 text-[15px]",
    size === "sm" && "h-10 px-4 text-sm",
    variants[variant],
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg" | "sm";
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      type="button"
      {...p}
      disabled={disabled || loading}
      className={cx(btnClass(variant, size), className)}
    >
      {loading && <Spinner className={variant === "primary" || variant === "dark" || variant === "destructive" ? "text-white" : "text-verde"} />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: "md" | "lg" | "sm";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(btnClass(variant, size), className)}>
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...p}
      className={cx(
        "press grid size-10 shrink-0 place-items-center rounded-full text-gris hover:bg-papel hover:text-tinta disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Superficies ---------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-[24px] bg-white shadow-card", className)}>{children}</div>;
}

export function Soft({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-[24px] bg-suave", className)}>{children}</div>;
}

/* ---------- Semáforo v2: etiquetas sólidas ---------- */

export type Estado = "vencido" | "por_vencer" | "al_dia" | "pagada" | "neutral";

const tagStyles: Record<Estado, string> = {
  vencido: "bg-bad text-white",
  por_vencer: "bg-warn text-tinta",
  al_dia: "bg-verde text-white",
  pagada: "border border-tag-borde text-gris",
  neutral: "border border-tag-borde text-gris",
};

const tagLabels: Record<Estado, string> = {
  vencido: "Vencido",
  por_vencer: "Por vencer",
  al_dia: "Al día",
  pagada: "Pagada",
  neutral: "Sin deuda",
};

/** Colores de estado para barras y gráficos. */
export const statusColor: Record<Estado, string> = {
  vencido: "#C62828",
  por_vencer: "#F2B705",
  al_dia: "#2F6D5F",
  pagada: "#CFDAD6",
  neutral: "#E3EAE7",
};

export function estadoSemaforo(sem: Semaforo, saldo: number | string = 1): Estado {
  if (Number(saldo) <= 0) return "neutral";
  return sem === "rojo" ? "vencido" : sem === "amarillo" ? "por_vencer" : "al_dia";
}

export function estadoDeCuota(estado: EstadoCuota): Estado {
  return estado === "pagada" ? "pagada" : estado === "vencida" ? "vencido" : estado === "por_vencer" ? "por_vencer" : "al_dia";
}

export function StatusTag({ estado, label, className }: { estado: Estado; label?: string; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-[22px] shrink-0 items-center rounded-[6px] px-2 text-[11px] leading-none font-semibold tracking-[.04em] whitespace-nowrap uppercase",
        tagStyles[estado],
        className,
      )}
    >
      {label ?? tagLabels[estado]}
    </span>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ name, size = 42, className }: { name: string; size?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cx("grid shrink-0 place-items-center rounded-full bg-tinta font-display font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {iniciales(name)}
    </div>
  );
}

/* ---------- Dinero ---------- */

export function Money({
  value,
  className,
  centsClassName = "text-gris",
  splitCents = false,
}: {
  value: number | string | null | undefined;
  className?: string;
  centsClassName?: string;
  splitCents?: boolean;
}) {
  const [a, b] = moneyParts(value);
  if (!splitCents) return <span className={cx("num", className)}>{a + b}</span>;
  return (
    <span className={cx("num", className)}>
      {a}
      <span className={cx("text-[0.62em]", centsClassName)}>{b}</span>
    </span>
  );
}

/* ---------- Formularios ---------- */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="px-1 text-[13px] font-medium text-gris">
        {label}
      </label>
      {children}
      {error ? (
        <p className="px-1 text-[13px] font-medium text-bad" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="px-1 text-[13px] text-gris">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-2xl border border-borde bg-white px-4 text-[16px] text-tinta placeholder:text-gris/60 " +
  "outline-none transition-[border-color,box-shadow] focus:border-verde focus:ring-4 focus:ring-verde/10 " +
  "disabled:bg-papel disabled:text-gris aria-[invalid=true]:border-bad";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...p },
  ref,
) {
  return <input ref={ref} {...p} className={cx(inputBase, "h-12", className)} />;
});

export function TextArea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea {...p} className={cx(inputBase, "min-h-24 py-3 leading-relaxed", className)} />;
}

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...p}
      className={cx(
        inputBase,
        "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235B6B6C%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:20px] bg-[right_14px_center] bg-no-repeat pr-11",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function useFieldId() {
  return useId();
}

/* ---------- Segmentado y chips ---------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("flex gap-1 rounded-2xl bg-pista p-1", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "press min-h-10 flex-1 rounded-xl px-2 text-[14px] font-medium",
              on ? "bg-white text-tinta shadow-[0_1px_3px_rgba(0,0,0,.08)]" : "text-gris hover:text-tinta",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  on,
  onClick,
  children,
  className,
}: {
  on?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cx(
        "press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium",
        on ? "border-tinta bg-tinta text-white" : "border-borde bg-white text-tinta hover:bg-papel",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="press flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl border border-borde bg-white px-4 py-2 text-left"
    >
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="block text-[13px] text-gris">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-verde" : "bg-borde",
        )}
      >
        <span
          className={cx(
            "absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}

/* ---------- Estados ---------- */

export function Loading({ label = "Cargando…", className }: { label?: string; className?: string }) {
  return (
    <div className={cx("flex items-center justify-center gap-3 py-16 text-gris", className)} role="status">
      <Spinner className="size-5 text-verde" />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-2xl bg-pista", className)} />;
}

export function Empty({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 grid size-14 place-items-center rounded-full bg-suave text-verde">{icon}</div>}
      <p className="font-display text-[17px] font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[15px] text-gris">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[24px] bg-bad-bg px-5 py-4 text-bad" role="alert">
      <p className="font-medium">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold underline underline-offset-4">
          Reintentar
        </button>
      )}
    </div>
  );
}

/* ---------- Encabezados ---------- */

export function PageHeader({
  title,
  kicker,
  back,
  actions,
}: {
  title: ReactNode;
  kicker?: ReactNode;
  back?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 lg:mb-6">
      <div className="flex min-w-0 items-center gap-2">
        {back && (
          <Link
            href={back}
            aria-label="Volver"
            className="press -ml-2 grid size-11 shrink-0 place-items-center rounded-full text-tinta hover:bg-white"
          >
            <IconBack size={22} />
          </Link>
        )}
        <div className="min-w-0">
          {kicker && <div className="text-[14px] text-gris lg:text-[15px]">{kicker}</div>}
          <h1 className="truncate font-display text-[24px] font-semibold tracking-tight lg:text-[28px]">{title}</h1>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mt-7 mb-3 flex items-center justify-between px-1">
      <h2 className="font-display text-[17px] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

/* ---------- Modal / hoja ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-tinta/40" onClick={onClose} />
      <div
        className={cx(
          "relative flex max-h-[92dvh] w-full animate-sheet-in flex-col rounded-t-[28px] bg-white shadow-pop sm:rounded-[28px]",
          wide ? "sm:max-w-xl" : "sm:max-w-md",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-2">
          <h2 className="font-display text-[19px] font-semibold">{title}</h2>
          <IconButton label="Cerrar" onClick={onClose} className="-mr-2">
            <IconX />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
        {footer && (
          <div className="border-t border-borde px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function Row({ label, children, strong }: { label: ReactNode; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className={strong ? "font-semibold" : "text-gris"}>{label}</span>
      <span>{children}</span>
    </div>
  );
}
