import type { EstadoCuota, Metodo, Semaforo } from "./types";

const moneyFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** $1,234.50 */
export function money(n: number | string | null | undefined, simbolo = "$"): string {
  const v = Number(n ?? 0);
  const s = moneyFmt.format(Math.abs(isFinite(v) ? v : 0));
  return `${v < 0 ? "-" : ""}${simbolo}${s}`;
}

/** Separa entero y centavos: ["$2,418", ".90"] */
export function moneyParts(n: number | string | null | undefined, simbolo = "$"): [string, string] {
  const s = money(n, simbolo);
  const i = s.lastIndexOf(".");
  return [s.slice(0, i), s.slice(i)];
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function parts(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** DD/MM/YYYY */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = parts(iso);
  if (!p) return "—";
  return `${String(p[2]).padStart(2, "0")}/${String(p[1]).padStart(2, "0")}/${p[0]}`;
}

/** 8 dic */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = parts(iso);
  if (!p) return "—";
  return `${p[2]} ${MESES[p[1] - 1]}`;
}

export function mesLargo(iso: string): string {
  const p = parts(iso);
  return p ? MESES_LARGOS[p[1] - 1] : "";
}

/** Fecha de hoy (YYYY-MM-DD) en la zona del negocio. */
export function hoyISO(tz = "America/Guayaquil"): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function sumarDias(iso: string, dias: number): string {
  const p = parts(iso);
  if (!p) return iso;
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + dias));
  return d.toISOString().slice(0, 10);
}

/** Domingo, 22 de noviembre */
export function fechaLarga(iso: string): string {
  const p = parts(iso);
  if (!p) return "";
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return `${DIAS[d.getUTCDay()]}, ${p[2]} de ${MESES_LARGOS[p[1] - 1]}`;
}

export function iniciales(nombre: string | null | undefined): string {
  const w = (nombre || "").trim().split(/\s+/).filter(Boolean);
  if (w.length === 0) return "?";
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[1][0]).toUpperCase();
}

export function primerNombre(nombre: string | null | undefined): string {
  return (nombre || "").trim().split(/\s+/)[0] || "";
}

export function dias(n: number): string {
  return `${n} ${n === 1 ? "día" : "días"}`;
}

/** Celular de Ecuador → 593XXXXXXXXX para wa.me */
export function telefonoWa(cel: string | null | undefined): string {
  let d = (cel || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("593")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  return `593${d}`;
}

export function waLink(cel: string | null | undefined, mensaje = ""): string {
  const tel = telefonoWa(cel);
  const q = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${tel}${q}`;
}

export const METODOS: { value: Metodo; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

export function metodoLabel(m: string): string {
  return METODOS.find((x) => x.value === m)?.label ?? m;
}

/** Texto plano (sin separadores) que acompaña a la etiqueta de estado de un cliente. */
export function detalleCliente(c: {
  semaforo: Semaforo;
  saldo_total: number;
  dias_mora: number;
  proximo_vencimiento: string | null;
}, hoy: string): string {
  if (Number(c.saldo_total) <= 0) return "";
  if (c.semaforo === "rojo") return `${dias(c.dias_mora)} de atraso`;
  if (!c.proximo_vencimiento) return "";
  return venceTexto(c.proximo_vencimiento, hoy);
}

/** "vence hoy", "vence en 2 días", "vence el 15 dic" */
export function venceTexto(vence: string, hoy: string): string {
  const n = diffDias(hoy, vence);
  if (n === 0) return "vence hoy";
  if (n > 0 && n <= 7) return `vence en ${dias(n)}`;
  return `vence el ${fechaCorta(vence)}`;
}

/** Texto plano que acompaña a la etiqueta de una cuota. */
export function detalleCuota(estado: EstadoCuota, diasAtraso: number, vence: string, hoy: string): string {
  if (estado === "pagada") return `venció el ${fechaCorta(vence)}`;
  if (estado === "vencida") return `${dias(diasAtraso)} de atraso`;
  return venceTexto(vence, hoy);
}

export function diffDias(desde: string, hasta: string): number {
  const a = parts(desde);
  const b = parts(hasta);
  if (!a || !b) return 0;
  return Math.round(
    (Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000,
  );
}

export const FRECUENCIAS = [
  { value: "diaria", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "quincenal", label: "Quincenal" },
  { value: "mensual", label: "Mensual" },
] as const;

export function frecuenciaLabel(f: string | null): string {
  return FRECUENCIAS.find((x) => x.value === f)?.label ?? "";
}

/** Convierte texto del usuario ("12,50") a número. */
export function parseMonto(s: string): number {
  const v = Number(String(s).replace(/\s/g, "").replace(",", "."));
  return isFinite(v) ? v : NaN;
}
