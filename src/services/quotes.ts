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
export function sendQuote(quote: QuoteWithClient): void {
  if (!quote.share_token) {
    throw new Error(
      'Este presupuesto no tiene link público. Falta correr la migración 0003 en Supabase.',
    );
  }

  const link = quoteShareUrl(quote.share_token);

  // Primero la ventana, dentro del gesto.
  void openWhatsApp(quote.client_whatsapp, quoteMessage(quote, link));

  // Después el estado. Si falla, el usuario igual mandó el mensaje.
  if (quote.status === 'borrador') {
    void supabase.from('quotes').update({ status: 'enviado' }).eq('id', quote.id);
  }
}

/** Recordatorio de cobro, con los datos de pago si están cargados. */
export function remindQuote(quote: QuoteWithClient, profile: User | null): void {
  void openWhatsApp(quote.client_whatsapp, reminderMessage(quote, profile?.payment_info));
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) throw error;
}
