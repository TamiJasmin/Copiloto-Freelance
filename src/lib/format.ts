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

/** "hace 3 d" / "hoy" — texto corto para las filas de la lista. */
export function relativeDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  return `hace ${months} m`;
}

/** Normaliza a E.164 sin '+' para armar links de wa.me. */
export function normalizePhone(raw: string, defaultCountry = '54'): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith(defaultCountry)) return digits;
  return defaultCountry + digits.replace(/^0/, '');
}
