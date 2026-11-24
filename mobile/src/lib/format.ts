const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** $1,234.50 */
export function money(v: unknown): string {
  const n = num(v);
  const neg = n < 0;
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  return `${neg ? '-' : ''}$${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
}

/** $930 (sin centavos cuando son .00) */
export function moneyShort(v: unknown): string {
  const s = money(v);
  return s.endsWith('.00') ? s.slice(0, -3) : s;
}

/** Separa "$2,418" y ".90" para mostrar los centavos más pequeños. */
export function moneyParts(v: unknown): [string, string] {
  const s = money(v);
  const i = s.lastIndexOf('.');
  return [s.slice(0, i), s.slice(i)];
}

/** Interpreta lo que escribe el usuario: "12,50" o "1,234.50" → 12.5 / 1234.5 */
export function parseAmount(text: string): number | null {
  let t = text.replace(/[^\d.,]/g, '');
  if (!t) return null;
  if (t.includes(',') && !t.includes('.')) t = t.replace(',', '.');
  else t = t.replace(/,/g, '');
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

// ---------- fechas (siempre en hora local, formato ISO yyyy-mm-dd) ----------

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = fromISODate(fromIso);
  const b = fromISODate(toIso);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** 08/12/2026 */
export function dateLong(iso: string | null | undefined): string {
  const d = fromISODate(iso);
  if (!d) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** 8 dic (agrega el año si no es el actual) */
export function dateShort(iso: string | null | undefined): string {
  const d = fromISODate(iso);
  if (!d) return '';
  const base = `${d.getDate()} ${MESES[d.getMonth()]}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function monthShort(date = new Date()): string {
  return `${MESES[date.getMonth()]}.`;
}

export function monthLong(date = new Date()): string {
  return MESES_LARGO[date.getMonth()];
}

/** dd/mm/aaaa → yyyy-mm-dd (o null si no es válida) */
export function parseDateInput(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (d.getDate() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1) return null;
  return toISODate(d);
}

// ---------- texto ----------

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[1][0] : parts[0][1] ?? '';
  return (first + second).toUpperCase();
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** 0991234567 → 099 123 4567 */
export function phoneDisplay(p: string | null | undefined): string {
  const d = (p ?? '').replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return p ?? '';
}

/** Número para wa.me: Ecuador 593 + celular sin el 0 inicial (si ya empieza con 593 se deja igual). */
export function waNumber(celular: string | null | undefined): string {
  const d = (celular ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('593')) return d;
  return `593${d.replace(/^0+/, '')}`;
}
