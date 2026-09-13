import { supabase } from '@/lib/supabase';
import { generateAndUpload } from '@/services/pdf';
import { openWhatsApp, quoteMessage } from '@/services/whatsapp';
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
export async function sendQuote(quote: QuoteWithClient, profile: User): Promise<void> {
  const { signedUrl } = await generateAndUpload(quote, profile);

  await supabase.from('quotes').update({ status: 'enviado' }).eq('id', quote.id);

  await openWhatsApp(quote.client_whatsapp, quoteMessage(quote, signedUrl));
}
