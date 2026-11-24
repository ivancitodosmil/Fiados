import { Platform, type ViewStyle } from 'react-native';

export const C = {
  verde: '#2F6D5F',
  verdeClaro: '#9FD3C5',
  tinta: '#18282A',
  coral: '#E8836B',
  papel: '#F4F8F6',
  blanco: '#FFFFFF',
  gris: '#5B6B6C',
  grisSuave: '#8A9897',
  borde: '#E3EAE7',
  track: '#E9F0ED',
  soft: '#E6F3EF',
  waBg: '#E7F6EE',
  ok: '#1E9E6A', // verde de "dinero recibido" (pagos)
  okBg: '#E3F5EC',
  // Semáforo v2 (REVISION 1): colores sólidos y decididos
  vencido: '#C62828',
  porVencer: '#F2B705',
  alDia: '#2F6D5F',
  pagadaBorde: '#CFDAD6',
  warn: '#8A6100', // texto ámbar sobre blanco
  warnBg: '#FFF4D6',
  bad: '#C62828', // dinero vencido y errores
  badBg: '#FBE3E3',
} as const;

export const F = {
  heading: 'Poppins_600SemiBold',
  headingMedium: 'Poppins_500Medium',
  body: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
} as const;

export const R = { card: 24, field: 16, pill: 999 } as const;

export const shadowCard: ViewStyle = Platform.select<ViewStyle>({
  web: { boxShadow: '0 1px 2px rgba(24,40,42,.05), 0 6px 20px -8px rgba(24,40,42,.12)' } as ViewStyle,
  default: {
    boxShadow: '0px 1px 2px rgba(24,40,42,0.05), 0px 6px 20px -8px rgba(24,40,42,0.12)',
  } as ViewStyle,
});

export const shadowTabBar: ViewStyle = {
  boxShadow: '0px -6px 20px -10px rgba(24,40,42,0.18)',
} as ViewStyle;

export const tabular = { fontVariant: ['tabular-nums'] as const };

export type Semaforo = 'verde' | 'amarillo' | 'rojo';
export type Estado = Semaforo | 'pagada' | 'neutro';

/** Etiquetas de estado sólidas (semáforo v2). */
export const ESTADO: Record<Estado, { bg: string; fg: string; border?: string }> = {
  rojo: { bg: '#C62828', fg: '#FFFFFF' },
  amarillo: { bg: '#F2B705', fg: '#18282A' },
  verde: { bg: '#2F6D5F', fg: '#FFFFFF' },
  pagada: { bg: 'transparent', fg: '#5B6B6C', border: '#CFDAD6' },
  neutro: { bg: '#E9F0ED', fg: '#5B6B6C' },
};

export const APARTADO_COLORES = ['#2F6D5F', '#9FD3C5', '#E8836B', '#3B6FB6', '#8E5BB5', '#D99A00', '#18282A', '#C2557A'];
