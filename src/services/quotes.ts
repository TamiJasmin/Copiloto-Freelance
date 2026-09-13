import { supabase } from '@/lib/supabase';
import { quoteShareUrl } from '@/lib/share';
import { openWhatsApp, quoteMessage, reminderMessage } from '@/services/whatsapp';
import type { QuoteItem, QuoteStatus, QuoteWithClient, User } from '@/types/db';

type CreateArgs = {
  userId: string;
  clientId: string;
  items: QuoteItem[];
  total: number;
  currency?: string;
  title?: string | null;
  notes?: string | null;
  status?: QuoteStatus;
  validUntil?: string | null;
};

/** Inserta el presupuesto y lo devuelve ya unido al cliente. */
export async function createQuote({
  userId,
  clientId,
  items,
  total,
  currency = 'ARS',
  title = null,
  notes = null,
  status = 'borrador',
  validUntil = null,
}: CreateArgs): Promise<QuoteWithClient> {
  const { data: inserted, error } = await supabase
    .from('quotes')
    .insert({
      user_id: userId,
      client_id: clientId,
      items,
      total_amount: total,
      currency,
      title,
      notes,
      status,
      valid_until: validUntil,
    })
    .select('id')
    .single();

  if (error) throw error;

  const { data, error: readErr } = await supabase
    .from('quotes_with_client')
    .select('*')
    .eq('id', inserted.id)
    .single<QuoteWithClient>();

  if (readErr) throw readErr;
  return data;
}

/**
 * El camino completo: PDF → Storage → link firmado → estado 'enviado' → WhatsApp.
 *
 * El estado se marca ANTES de abrir WhatsApp a propósito: salir de la app
 * puede congelar el JS, y es preferible un presupuesto marcado como enviado
 * que el usuario no mandó, a uno mandado que sigue figurando como borrador.
 */
/**
 * Abre WhatsApp con el presupuesto.
 *
 * IMPORTANTE: en web esto tiene que salir del clic del usuario sin ningún
 * await por delante. Cualquier espera previa hace que el navegador tome la
 * ventana como no solicitada y la bloquee sin avisar — el presupuesto
 * quedaba marcado como enviado y no se abría nada.
 *
 * Por eso el cambio de estado va DESPUÉS, y no se espera antes de abrir.
 */
export function sendQuote(quote: QuoteWithClient): Promise<void> {
  const link = quoteShareUrl(quote.share_token);

  // Primero la ventana, dentro del gesto del clic. Todo lo demás va después.
  void openWhatsApp(quote.client_whatsapp, quoteMessage(quote, link));

  // La promesa se devuelve para que quien llama pueda esperarla y avisar si
  // falla. La ventana ya está abierta, así que esperar acá no la bloquea.
  if (quote.status === 'borrador') {
    return updateQuoteStatus(quote.id, 'enviado');
  }
  return Promise.resolve();
}

/** Recordatorio de cobro, con el link del presupuesto y los datos de pago. */
export function remindQuote(quote: QuoteWithClient, profile: User | null): void {
  // Si falta el token el recordatorio sale igual, sólo que sin link: es
  // preferible a no poder insistirle a un cliente que te debe plata.
  const link = quote.share_token ? quoteShareUrl(quote.share_token) : undefined;

  void openWhatsApp(
    quote.client_whatsapp,
    reminderMessage(quote, profile?.payment_info, link),
  );
}

/** Edita el contenido de un presupuesto. No toca el estado ni el cliente. */
export async function updateQuote(
  id: string,
  patch: { items: QuoteItem[]; total_amount: number; valid_until: string | null },
): Promise<void> {
  const { error } = await supabase.from('quotes').update(patch).eq('id', id);
  if (error) throw error;
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) throw error;
}
