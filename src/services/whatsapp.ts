import * as Linking from 'expo-linking';
import { money } from '@/lib/format';
import type { QuoteWithClient } from '@/types/db';

/**
 * Abre WhatsApp con el mensaje pre-redactado.
 * wa.me funciona igual en iOS, Android y web — un solo camino, cero SDK.
 */
export function whatsappUrl(phone: string | null, message: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

export async function openWhatsApp(phone: string | null, message: string) {
  await Linking.openURL(whatsappUrl(phone, message));
}

const firstName = (full: string) => full.trim().split(/\s+/)[0];

/** Mensaje de envío de cotización. */
export function quoteMessage(quote: QuoteWithClient, link?: string): string {
  const ref = link ?? quote.pdf_url ?? '';
  // Sin link, el mensaje no debe prometer un adjunto que no está.
  const cuerpo = ref
    ? `te adjunto la cotización acordada: ${ref}`
    : 'te paso la cotización acordada.';

  return (
    `Hola ${firstName(quote.client_name)}, ${cuerpo}\n\n` +
    `Total: ${money(quote.total_amount, quote.currency)}\n` +
    `¡Saludos!`
  );
}

/** Recordatorio de cobro — tono cordial, sin fricción. */
export function reminderMessage(
  quote: QuoteWithClient,
  paymentInfo?: { tipo?: string; valor?: string },
): string {
  const datos =
    paymentInfo?.valor
      ? `\n\nDatos para la transferencia (${paymentInfo.tipo?.toUpperCase() ?? 'PAGO'}): ${paymentInfo.valor}`
      : '';

  return (
    `¡Hola ${firstName(quote.client_name)}! ¿Cómo va todo?\n\n` +
    `Te escribo para hacer un seguimiento del presupuesto #${quote.number} ` +
    `por ${money(quote.total_amount, quote.currency)}. ` +
    `Cualquier duda quedo a disposición.${datos}\n\n` +
    `¡Gracias!`
  );
}
