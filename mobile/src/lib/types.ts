import { dateShort, daysBetween, num, today } from './format';
import type { Estado, Semaforo } from './theme';

export type Negocio = {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  logo_url: string | null;
  simbolo: string;
  dias_credito: number;
  dias_aviso: number;
  plantilla_recordatorio: string;
};

export type Apartado = {
  id: string;
  negocio_id: string;
  nombre: string;
  color: string | null;
  tasa_interes: number;
};

export type Cliente = {
  id: string;
  negocio_id: string;
  nombres: string;
  cedula: string | null;
  celular: string | null;
  email: string | null;
  direccion: string | null;
  fecha_nacimiento: string | null;
  notas: string | null;
  limite_credito: number | null;
  portal_token: string;
  portal_activo: boolean;
  activo: boolean;
};

export type ClienteResumen = {
  id: string;
  negocio_id: string;
  nombres: string;
  cedula: string | null;
  celular: string | null;
  email: string | null;
  limite_credito: number | null;
  portal_token: string;
  portal_activo: boolean;
  activo: boolean;
  saldo_total: number;
  total_vencido: number;
  cuotas_vencidas: number;
  dias_mora: number;
  dias_deuda: number;
  proximo_vencimiento: string | null;
  credito_disponible: number | null;
  semaforo: Semaforo;
};

export type Dashboard = {
  negocio_id: string;
  nombre: string;
  total_por_cobrar: number;
  total_vencido: number;
  clientes_con_deuda: number;
  clientes_rojo: number;
  clientes_amarillo: number;
  cobrado_mes: number;
};

export type Deuda = {
  id: string;
  cliente_id: string;
  apartado_id: string | null;
  apartado: string;
  descripcion: string | null;
  capital: number;
  tasa_interes: number;
  interes: number;
  monto: number;
  fecha: string;
  fecha_fin: string | null;
  modalidad: 'unico' | 'cuotas';
  num_cuotas: number;
  frecuencia: string | null;
  pagado: number;
  saldo: number;
  cuotas_pendientes: number;
  cuotas_vencidas: number;
  proximo_vencimiento: string | null;
  dias_atraso: number;
  semaforo: Semaforo;
};

export type Cuota = {
  id: string;
  deuda_id: string;
  numero: number;
  monto: number;
  pagado: number;
  saldo: number;
  fecha_vencimiento: string;
  hoy: string;
  dias_atraso: number;
  estado: 'pagada' | 'vencida' | 'por_vencer' | 'al_dia';
  semaforo: Semaforo;
};

export type Pago = {
  id: string;
  cliente_id: string;
  deuda_id: string | null;
  monto: number;
  fecha: string;
  metodo: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
  nota: string | null;
  created_at: string;
  clientes?: { nombres: string } | null;
};

export type Simulacion = {
  capital: number;
  tasa_interes: number;
  interes: number;
  total: number;
  fecha_inicio: string;
  num_cuotas: number;
  valor_cuota: number;
  cuotas: { numero: number; vence: string; monto: number }[];
};

export const METODOS: { value: Pago['metodo']; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
];

export function metodoLabel(m: string) {
  return METODOS.find((x) => x.value === m)?.label ?? m;
}

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

/** Estado de un cliente: etiqueta corta (va en el tag) + detalle en texto aparte. */
export function clienteStatus(c: Pick<ClienteResumen, 'semaforo' | 'saldo_total' | 'dias_mora' | 'proximo_vencimiento' | 'activo'>): {
  estado: Estado;
  label: string;
  detail: string;
} {
  if (!c.activo) return { estado: 'neutro', label: 'Inactivo', detail: '' };
  if (num(c.saldo_total) <= 0) return { estado: 'neutro', label: 'Sin deuda', detail: '' };
  if (c.semaforo === 'rojo') return { estado: 'rojo', label: 'Vencido', detail: `${dias(num(c.dias_mora))} de atraso` };
  const d = c.proximo_vencimiento ? daysBetween(today(), c.proximo_vencimiento) : null;
  const vence = d == null ? '' : d <= 0 ? 'vence hoy' : d === 1 ? 'vence mañana' : `vence en ${dias(d)}`;
  if (c.semaforo === 'amarillo') return { estado: 'amarillo', label: 'Por vencer', detail: vence };
  return { estado: 'verde', label: 'Al día', detail: c.proximo_vencimiento ? `vence el ${dateShort(c.proximo_vencimiento)}` : '' };
}

export function cuotaStatus(q: Cuota): { estado: Estado; label: string; detail: string } {
  switch (q.estado) {
    case 'pagada':
      return { estado: 'pagada', label: 'Pagada', detail: '' };
    case 'vencida':
      return { estado: 'rojo', label: 'Vencida', detail: `${dias(num(q.dias_atraso))} de atraso` };
    case 'por_vencer': {
      const d = daysBetween(q.hoy ?? today(), q.fecha_vencimiento);
      return { estado: 'amarillo', label: 'Por vencer', detail: d <= 0 ? 'vence hoy' : d === 1 ? 'vence mañana' : `vence en ${dias(d)}` };
    }
    default:
      return { estado: 'verde', label: 'Al día', detail: '' };
  }
}

export function deudaStatus(d: Deuda): { estado: Estado; label: string; detail: string } {
  if (num(d.saldo) <= 0) return { estado: 'pagada', label: 'Pagada', detail: '' };
  if (d.semaforo === 'rojo') return { estado: 'rojo', label: 'Vencida', detail: `${dias(num(d.dias_atraso))} de atraso` };
  const next = d.proximo_vencimiento ? `vence el ${dateShort(d.proximo_vencimiento)}` : '';
  if (d.semaforo === 'amarillo') return { estado: 'amarillo', label: 'Por vencer', detail: next };
  return { estado: 'verde', label: 'Al día', detail: next };
}

export const FRECUENCIAS = [
  { value: 'diaria', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
] as const;
export type Frecuencia = (typeof FRECUENCIAS)[number]['value'];
