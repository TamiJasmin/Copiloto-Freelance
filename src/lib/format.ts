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
