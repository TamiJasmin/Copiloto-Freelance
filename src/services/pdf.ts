import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/format';
import type { QuoteWithClient, User } from '@/types/db';

/**
 * Plantilla del PDF. Es intencionalmente clara (papel = claro) aunque la app
 * sea dark: lo que ve el cliente tiene que imprimirse y leerse bien.
 */
function template(quote: QuoteWithClient, user: User): string {
  const rows = quote.items
    .map(
      (i) => `
      <tr>
        <td>${i.description}${i.qty && i.qty > 1 ? ` <span class="qty">×${i.qty}</span>` : ''}</td>
        <td class="right">${money(i.amount * (i.qty ?? 1), quote.currency)}</td>
      </tr>`,
    )
    .join('');

  const pago = user.payment_info?.valor
    ? `<p class="pay"><strong>${(user.payment_info.tipo ?? 'Pago').toUpperCase()}:</strong> ${user.payment_info.valor}${
        user.payment_info.titular ? ` — ${user.payment_info.titular}` : ''
      }</p>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font: 14px/1.6 -apple-system, "Segoe UI", Roboto, sans-serif; color: #18181B; padding: 48px; }
  header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; }
  .logo { height: 44px; }
  .meta { text-align: right; color: #71717A; font-size: 12px; }
  h1 { font-size: 13px; text-transform: uppercase; letter-spacing: 1.4px; color: #71717A; margin: 0 0 6px; font-weight: 600; }
  .client { font-size: 17px; font-weight: 600; margin-bottom: 36px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
       color: #A1A1AA; border-bottom: 1px solid #E4E4E7; padding-bottom: 10px; font-weight: 600; }
  td { padding: 14px 0; border-bottom: 1px solid #F4F4F5; }
  .right { text-align: right; font-variant-numeric: tabular-nums; }
  .qty { color: #A1A1AA; }
  .total td { border: 0; padding-top: 24px; font-size: 20px; font-weight: 700; }
  .pay { margin-top: 40px; padding: 16px; background: #FAFAFA; border-radius: 10px; font-size: 13px; }
  footer { margin-top: 56px; font-size: 11px; color: #A1A1AA; text-align: center; }
</style></head>
<body>
  <header>
    <div>
      ${user.logo_url ? `<img class="logo" src="${user.logo_url}" />` : ''}
      <div class="brand">${user.business_name ?? ''}</div>
    </div>
    <div class="meta">
      Presupuesto <strong>#${quote.number}</strong><br />
      ${new Date(quote.created_at).toLocaleDateString('es-AR')}
      ${quote.valid_until ? `<br />Válido hasta ${new Date(quote.valid_until).toLocaleDateString('es-AR')}` : ''}
    </div>
  </header>

  <h1>Para</h1>
  <div class="client">${quote.client_name}</div>

  <table>
    <thead><tr><th>Detalle</th><th class="right">Importe</th></tr></thead>
    <tbody>
      ${rows}
      <tr class="total">
        <td>Total</td>
        <td class="right">${money(quote.total_amount, quote.currency)}</td>
      </tr>
    </tbody>
  </table>

  ${pago}
  ${quote.notes ? `<p class="pay">${quote.notes}</p>` : ''}

  <footer>Generado con Copiloto Freelance</footer>
</body></html>`;
}

/**
 * Genera el PDF, lo sube al bucket privado y devuelve un link firmado
 * (30 días) listo para pegar en WhatsApp.
 */
export async function generateAndUpload(
  quote: QuoteWithClient,
  user: User,
): Promise<{ uri: string; signedUrl: string }> {
  const { uri } = await Print.printToFileAsync({ html: template(quote, user) });

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const path = `${user.id}/presupuesto-${quote.number}.pdf`;
  const { error } = await supabase.storage
    .from('quotes')
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;

  const { data, error: signErr } = await supabase.storage
    .from('quotes')
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  if (signErr) throw signErr;

  await supabase.from('quotes').update({ pdf_url: data.signedUrl }).eq('id', quote.id);

  return { uri, signedUrl: data.signedUrl };
}
