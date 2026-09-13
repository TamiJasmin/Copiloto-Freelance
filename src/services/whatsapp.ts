import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
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

/**
 * Reserva la ventana durante el clic y devuelve una función para darle la
 * dirección más tarde.
 *
 * Los navegadores sólo permiten abrir ventanas dentro del gesto del
 * usuario. Si primero se guarda el presupuesto y recién después se llama a
 * window.open, el gesto ya caducó y la ventana se bloquea sin ningún aviso:
 * el presupuesto queda marcado como enviado y no se abre nada.
 *
 * Abriendo una ventana en blanco de inmediato y navegándola al terminar, el
 * envío sigue siendo un solo clic.
 */
export function reserveWhatsAppWindow(): ((phone: string | null, message: string) => void) | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    // En nativo no hay bloqueador: se abre cuando haga falta.
    return (phone, message) => void Linking.openURL(whatsappUrl(phone, message));
  }

  const win = window.open('', '_blank');

  // Devuelve null, y NO un plan B silencioso. Antes se intentaba abrir igual
  // más tarde, el navegador lo bloqueaba de nuevo y nadie se enteraba: el
  // presupuesto quedaba marcado como enviado sin que el cliente recibiera
  // nada. Es preferible avisar que fallar en silencio.
  if (!win) return null;

  return (phone, message) => {
    win.location.href = whatsappUrl(phone, message);
  };
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
  link?: string,
): string {
  const datos =
    paymentInfo?.valor
      ? `\n\nDatos para la transferencia (${paymentInfo.tipo?.toUpperCase() ?? 'PAGO'}): ${paymentInfo.valor}`
      : '';

  // El link va de nuevo: quien recibe el recordatorio puede haber perdido el
  // mensaje original, y un "te recuerdo el presupuesto" sin forma de verlo
  // obliga al cliente a buscarlo para poder decidir.
  const verlo = link ? `\n\nAcá lo podés ver: ${link}` : '';

  return (
    `¡Hola ${firstName(quote.client_name)}! ¿Cómo va todo?\n\n` +
    `Te escribo para hacer un seguimiento del presupuesto #${quote.number} ` +
    `por ${money(quote.total_amount, quote.currency)}. ` +
    `Cualquier duda quedo a disposición.${verlo}${datos}\n\n` +
    `¡Gracias!`
  );
}
