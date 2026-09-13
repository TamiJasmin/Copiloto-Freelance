/** Formateo de moneda compacto para tarjetas del Dashboard. */
export function money(value: number, currency = 'ARS', compact = false): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: compact && Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
  }).format(value || 0);
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function currentMonthLabel(d = new Date()): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Días que faltan hasta una fecha sin hora ("2026-09-28"). Negativo si pasó.
 *
 * Hay dos trampas y las dos dieron bugs reales:
 *
 * 1. `new Date('2026-09-28')` se parsea como medianoche UTC, que en
 *    Argentina es el día anterior a las 21:00. La fecha se corre un día.
 * 2. Comparar la medianoche de hoy contra el mediodía del objetivo da
 *    medio día de más, y con Math.ceil eso suma 1 a TODOS los resultados.
 *
 * Por eso se ancla al mediodía local (inmune al huso) y recién ahí se baja
 * a medianoche, para que la resta dé días enteros exactos.
 */
export function diasHasta(fecha: string | null | undefined): number | null {
  if (!fecha) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const objetivo = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(objetivo.getTime())) return null;
  objetivo.setHours(0, 0, 0, 0);

  // round y no ceil: el cambio de horario de verano puede dejar 23 o 25 horas.
  return Math.round((objetivo.getTime() - hoy.getTime()) / 86_400_000);
}

/**
 * Días entre la creación de un presupuesto y su vencimiento.
 *
 * Sirve para copiar la *duración* y no la fecha: un presupuesto de hace dos
 * meses que valía 15 días tiene una fecha de vencimiento ya pasada, y
 * copiarla tal cual dejaría el nuevo presupuesto vencido antes de mandarlo.
 */
export function duracionValidez(creadoISO: string, vence: string | null): number | null {
  if (!vence) return null;

  const creado = new Date(creadoISO);
  const limite = new Date(`${vence}T12:00:00`);
  if (Number.isNaN(creado.getTime()) || Number.isNaN(limite.getTime())) return null;

  creado.setHours(0, 0, 0, 0);
  limite.setHours(0, 0, 0, 0);

  const dias = Math.round((limite.getTime() - creado.getTime()) / 86_400_000);
  return dias > 0 ? dias : null;
}

/** Fecha de hoy + n días, en formato YYYY-MM-DD y hora local. */
export function fechaEnDias(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** "hace 3 d" / "hoy" — texto corto para las filas de la lista. */
export function relativeDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  return `hace ${months} m`;
}

/**
 * Normaliza a E.164 sin '+' para armar links de wa.me.
 *
 * Argentina tiene una particularidad que rompe los links si se ignora:
 * WhatsApp exige un 9 entre el código de país y el área para los móviles
 * (549 11 xxxx xxxx). Un número sin ese 9 no resuelve a ningún contacto,
 * así que el link abre WhatsApp y no encuentra a nadie.
 *
 * También limpia lo que la gente tipea de memoria: el 0 interurbano y el
 * 15 que se usa al discar local.
 */
export function normalizePhone(raw: string, country = '54'): string {
  let d = String(raw).replace(/\D/g, '');
  if (!d) return '';

  d = d.replace(/^00/, ''); // prefijo internacional discado

  // Se saca el código de país sólo si lo que queda sigue siendo un número
  // plausible; así un área que empiece con 54 no se mutila.
  if (d.startsWith(country) && d.length - country.length >= 8) {
    d = d.slice(country.length);
  }
  d = d.replace(/^0/, ''); // prefijo interurbano

  if (country === '54') {
    d = d.replace(/^9/, ''); // evita duplicar el 9 si ya venía
    d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2'); // 11 15 xxxx xxxx
    return d ? '549' + d : '';
  }

  return country + d;
}
