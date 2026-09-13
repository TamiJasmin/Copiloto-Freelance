import { C } from '@/theme/tokens';
import type { Quote, QuoteStatus } from '@/types/db';

/**
 * Días sin respuesta tras enviar antes de considerar que el cliente no contestó.
 * Antes de eso es normal: nadie responde un presupuesto en el día.
 */
export const DIAS_SIN_RESPUESTA = 7;

/** Días desde la aprobación sin cobrar antes de marcar mora. */
export const DIAS_PARA_MORA = 14;

/** Días antes del vencimiento en que conviene insistir. */
export const DIAS_POR_VENCER = 3;

/**
 * Estado que se le muestra al usuario.
 *
 * Los cuatro estados "de tiempo" (sin_respuesta, por_vencer, vencido y
 * moroso) NO se guardan en la base: se calculan cada vez que se miran.
 *
 * Guardarlos obligaría a un proceso que los fuera cambiando solo, y entre
 * corrida y corrida mostrarían algo falso — un presupuesto figuraría al día
 * el día después de vencer. Derivándolos, siempre son correctos.
 */
export type QuoteView =
  | 'borrador'
  | 'enviado'
  | 'sin_respuesta'
  | 'por_vencer'
  | 'vencido'
  | 'aprobado'
  | 'moroso'
  | 'cobrado'
  | 'rechazado'
  | 'anulado';

type ViewMeta = {
  label: string;
  color: string;
  chipBg: string;
  /** Qué hay que hacer con esto. Vacío si no hay nada que hacer. */
  accion?: string;
};

const chip = (rgb: string) => `rgba(${rgb},0.14)`;

export const VIEW_META: Record<QuoteView, ViewMeta> = {
  borrador: {
    label: 'Borrador',
    color: C.draft,
    chipBg: chip('90,90,99'),
    accion: 'Todavía no lo mandaste',
  },
  enviado: {
    label: 'Enviado',
    color: C.sent,
    chipBg: chip('255,176,32'),
    accion: 'Esperando respuesta',
  },
  sin_respuesta: {
    label: 'Sin respuesta',
    color: C.sent,
    chipBg: chip('255,176,32'),
    accion: 'Pasaron varios días: conviene insistir',
  },
  por_vencer: {
    label: 'Por vencer',
    color: C.danger,
    chipBg: chip('255,92,92'),
    accion: 'Vence en pocos días',
  },
  vencido: {
    label: 'Vencido',
    color: C.faint,
    chipBg: chip('90,90,99'),
    accion: 'Pasó la fecha de validez',
  },
  aprobado: {
    label: 'Aprobado',
    color: C.approved,
    chipBg: chip('77,159,255'),
    accion: 'Aceptado, falta cobrar',
  },
  moroso: {
    label: 'Moroso',
    color: C.danger,
    chipBg: chip('255,92,92'),
    accion: 'Aprobado hace rato y sin pagar',
  },
  cobrado: { label: 'Cobrado', color: C.paid, chipBg: chip('214,255,75') },
  rechazado: { label: 'Rechazado', color: C.faint, chipBg: chip('90,90,99') },
  anulado: { label: 'Anulado', color: C.faint, chipBg: chip('90,90,99') },
};

/**
 * Orden de urgencia: qué merece tu atención primero.
 *
 * No es el orden cronológico. Un moroso de hace veinte días importa más que
 * algo que mandaste ayer, aunque el de ayer sea más reciente. Ordenar por
 * fecha esconde justamente lo que hay que hacer.
 */
export const URGENCIA: Record<QuoteView, number> = {
  moroso: 0, // te deben plata hace rato
  por_vencer: 1, // se cae solo si no insistís
  sin_respuesta: 2, // silencio largo
  vencido: 3, // ya se cayó, hay que rehacerlo o cerrarlo
  aprobado: 4, // aceptado, esperando el pago
  enviado: 5, // en curso, nada que hacer todavía
  borrador: 6, // depende de vos, sin apuro
  cobrado: 7,
  rechazado: 8,
  anulado: 9,
};

/** Estados que piden una acción concreta de tu parte. */
export const PIDEN_ATENCION: QuoteView[] = ['moroso', 'por_vencer', 'sin_respuesta', 'vencido'];

export const pideAtencion = (view: QuoteView): boolean => PIDEN_ATENCION.includes(view);

/**
 * Comparador para listas: primero lo urgente y, dentro de lo igual de
 * urgente, lo más viejo — que es lo que lleva más tiempo esperando.
 */
export function porUrgencia<T extends Derivable & { created_at: string }>(a: T, b: T): number {
  const diff = URGENCIA[quoteView(a)] - URGENCIA[quoteView(b)];
  if (diff !== 0) return diff;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

const dias = (iso: string | null): number =>
  iso === null ? 0 : Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

/** Días que faltan para una fecha; negativo si ya pasó. */
const diasHasta = (fecha: string | null): number | null => {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(fecha).getTime() - hoy.getTime()) / 86_400_000);
};

type Derivable = Pick<Quote, 'status' | 'sent_at' | 'valid_until'> & {
  approved_at?: string | null;
};

/** Estado real de un presupuesto, combinando lo guardado con el tiempo. */
export function quoteView(q: Derivable): QuoteView {
  // Los estados finales mandan: ya no cambian por el paso del tiempo.
  if (q.status === 'cobrado') return 'cobrado';
  if (q.status === 'rechazado') return 'rechazado';
  if (q.status === 'anulado') return 'anulado';
  if (q.status === 'borrador') return 'borrador';

  if (q.status === 'aprobado') {
    return dias(q.approved_at ?? null) >= DIAS_PARA_MORA ? 'moroso' : 'aprobado';
  }

  // Enviado: primero la validez, que es un compromiso con fecha; después
  // el silencio, que es sólo una sugerencia de insistir.
  const faltan = diasHasta(q.valid_until);
  if (faltan !== null && faltan < 0) return 'vencido';
  if (faltan !== null && faltan <= DIAS_POR_VENCER) return 'por_vencer';
  if (dias(q.sent_at) >= DIAS_SIN_RESPUESTA) return 'sin_respuesta';

  return 'enviado';
}

/** Grupos para filtrar. Reúnen varios estados bajo una idea. */
export type Filtro = 'todos' | 'borrador' | 'enviado' | 'aprobado' | 'moroso' | 'cobrado' | 'cerrado';

export const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'borrador', label: 'Borradores' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'moroso', label: 'Morosos' },
  { value: 'cobrado', label: 'Cobrados' },
  { value: 'cerrado', label: 'Cerrados' },
];

const GRUPOS: Record<Exclude<Filtro, 'todos'>, QuoteView[]> = {
  borrador: ['borrador'],
  enviado: ['enviado', 'sin_respuesta', 'por_vencer', 'vencido'],
  aprobado: ['aprobado'],
  moroso: ['moroso'],
  cobrado: ['cobrado'],
  cerrado: ['rechazado', 'anulado', 'vencido'],
};

export function coincideFiltro(view: QuoteView, filtro: Filtro): boolean {
  return filtro === 'todos' ? true : GRUPOS[filtro].includes(view);
}

/**
 * Estados a los que se puede pasar desde el actual.
 * Se modela como transiciones y no como "cualquiera a cualquiera" para que
 * la interfaz no ofrezca saltos que no tienen sentido, como cobrar algo que
 * el cliente rechazó.
 */
export function siguientesEstados(status: QuoteStatus): QuoteStatus[] {
  switch (status) {
    case 'borrador':
      return ['enviado', 'anulado'];
    case 'enviado':
      return ['aprobado', 'rechazado', 'anulado'];
    case 'aprobado':
      return ['cobrado', 'rechazado', 'anulado'];
    case 'cobrado':
      return [];
    case 'rechazado':
    case 'anulado':
      return ['enviado'];
    default:
      return [];
  }
}

export const ACCION_ESTADO: Record<QuoteStatus, string> = {
  borrador: 'Volver a borrador',
  enviado: 'Marcar como enviado',
  aprobado: 'El cliente lo aprobó',
  cobrado: 'Ya me pagaron',
  rechazado: 'El cliente lo rechazó',
  anulado: 'Anular',
};
