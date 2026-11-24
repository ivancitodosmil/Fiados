export type Semaforo = "verde" | "amarillo" | "rojo";
export type EstadoCuota = "pagada" | "vencida" | "por_vencer" | "al_dia";
export type Frecuencia = "diaria" | "semanal" | "quincenal" | "mensual";
export type Metodo = "efectivo" | "transferencia" | "tarjeta" | "otro";

export interface Negocio {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  logo_url: string | null;
  simbolo: string;
  zona_horaria: string;
  dias_credito: number;
  dias_aviso: number;
  plantilla_recordatorio: string;
}

export interface Cliente {
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
}

export interface ClienteResumen {
  id: string;
  negocio_id: string;
  nombres: string;
  cedula: string | null;
  celular: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
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
}

export interface Apartado {
  id: string;
  negocio_id: string;
  nombre: string;
  color: string | null;
  tasa_interes: number;
}

export interface Deuda {
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
  modalidad: "unico" | "cuotas";
  num_cuotas: number;
  frecuencia: Frecuencia | null;
  pagado: number;
  saldo: number;
  cuotas_pendientes: number;
  cuotas_vencidas: number;
  proximo_vencimiento: string | null;
  dias_atraso: number;
  semaforo: Semaforo;
  created_at: string;
}

export interface Cuota {
  id: string;
  deuda_id: string;
  numero: number;
  monto: number;
  pagado: number;
  saldo: number;
  fecha_vencimiento: string;
  dias_atraso: number;
  estado: EstadoCuota;
  semaforo: Semaforo;
}

export interface Pago {
  id: string;
  cliente_id: string;
  deuda_id: string | null;
  monto: number;
  fecha: string;
  metodo: Metodo;
  nota: string | null;
  created_at: string;
}

export interface SaldoApartado {
  apartado_id: string | null;
  apartado: string;
  saldo: number;
}

export interface Dashboard {
  negocio_id: string;
  nombre: string;
  total_por_cobrar: number;
  total_vencido: number;
  clientes_con_deuda: number;
  clientes_rojo: number;
  clientes_amarillo: number;
  cobrado_mes: number;
}

export interface Simulacion {
  capital: number;
  tasa_interes: number;
  interes: number;
  total: number;
  fecha_inicio: string;
  num_cuotas: number;
  valor_cuota: number;
  cuotas: { numero: number; vence: string; monto: number }[];
}

export interface Recordatorio {
  mensaje: string;
  celular: string;
  email: string | null;
  semaforo: Semaforo;
  total: number;
}

export interface Portal {
  negocio: { nombre: string; telefono: string | null; logo_url: string | null; simbolo: string };
  cliente: { nombres: string };
  resumen: {
    saldo_total: number;
    total_vencido: number;
    cuotas_vencidas: number;
    dias_mora: number;
    dias_deuda: number;
    proximo_vencimiento: string | null;
    semaforo: Semaforo;
  } | null;
  apartados: { apartado: string; saldo: number }[];
  deudas: {
    descripcion: string | null;
    apartado: string;
    fecha: string;
    fecha_fin: string | null;
    capital: number;
    interes: number;
    monto: number;
    saldo: number;
    semaforo: Semaforo;
    cuotas: {
      numero: number;
      monto: number;
      saldo: number;
      vence: string;
      estado: EstadoCuota;
      semaforo: Semaforo;
      dias_atraso: number;
    }[] | null;
  }[];
  pagos: { fecha: string; monto: number; metodo: Metodo }[];
}
