import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/format';
import type { QuoteWithClient, User } from '@/types/db';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decodificador propio: `atob` existe en Hermes moderno pero no en todas las
 * versiones, y un PDF corrupto por un global faltante es un bug caro de rastrear.
 */
function base64ToBytes(b64: string): Uint8Array {
  // Se descarta todo lo que no sea alfabeto base64: padding '=' y saltos de línea.
  const chars = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((chars.length * 6) / 8));

  let p = 0;
  let buffer = 0;
  let bits = 0;

  // Acumulador de bits: no asume que la entrada venga en grupos de 4 completos.
  for (let i = 0; i < chars.length; i++) {
    buffer = (buffer << 6) | B64.indexOf(chars[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[p++] = (buffer >> bits) & 0xff;
    }
  }

  return bytes;
}

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapa todo lo que escribió el usuario antes de interpolarlo.
 * Sin esto, un cliente llamado "Pérez & Co" o un ítem con "<" rompen el
 * documento, y un nombre con etiquetas podría inyectar markup.
 */
const esc = (v: unknown): string => String(v ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);

const fecha = (iso: string | Date): string =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

type HtmlOptions = {
  /** Si viene, se agrega una barra de acciones que no se imprime. */
  whatsappUrl?: string;
};

/**
 * Sólo lo que el documento necesita. Así la misma plantilla sirve tanto
 * para el dueño (que tiene la fila completa) como para la página pública
 * (que recibe un puñado de campos por RPC, sin ids ni datos internos).
 */
export type QuoteForDoc = Pick<
  QuoteWithClient,
  'number' | 'items' | 'total_amount' | 'currency' | 'notes' | 'valid_until' | 'created_at'
> & {
  client_name: string;
  client_whatsapp?: string | null;
};

export type BusinessForDoc = Pick<User, 'business_name' | 'logo_url' | 'payment_info'> & {
  email: string;
};

/**
 * Plantilla del presupuesto.
 *
 * Va en claro aunque la app sea oscura: esto lo imprime y lo archiva el
 * cliente, y un documento con fondo negro es ilegible en papel y gasta
 * medio cartucho. El acento lima aparece sólo como bloque del total, donde
 * sobre texto negro tiene contraste de sobra.
 */
export function buildQuoteHtml(
  quote: QuoteForDoc,
  user: BusinessForDoc,
  { whatsappUrl }: HtmlOptions = {},
): string {
  const rows = quote.items
    .map((i) => {
      const qty = i.qty && i.qty > 1 ? ` <span class="qty">× ${esc(i.qty)}</span>` : '';
      return `<tr>
        <td>${esc(i.description)}${qty}</td>
        <td class="right">${esc(money(i.amount * (i.qty ?? 1), quote.currency))}</td>
      </tr>`;
    })
    .join('');

  const pago = user.payment_info?.valor
    ? `<section class="pay">
         <h2>Datos para el pago</h2>
         <p><strong>${esc((user.payment_info.tipo ?? 'pago').toUpperCase())}</strong>
            ${esc(user.payment_info.valor)}</p>
         ${user.payment_info.titular ? `<p class="muted">Titular: ${esc(user.payment_info.titular)}</p>` : ''}
       </section>`
    : `<section class="pay warn">
         <h2>Datos para el pago</h2>
         <p class="muted">Cargá tu CBU o alias en "Mi negocio" para que aparezcan acá.</p>
       </section>`;

  const toolbar = whatsappUrl
    ? `<div class="toolbar">
         <button onclick="window.print()">Descargar PDF</button>
         <a class="wa" href="${esc(whatsappUrl)}" target="_blank" rel="noopener">Enviar por WhatsApp</a>
       </div>`
    : '';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Presupuesto #${esc(quote.number)} — ${esc(user.business_name ?? '')}</title>
<style>
  /* Sin margen de página el navegador deja de estampar URL, fecha y "1/1". */
  @page { size: A4; margin: 0; }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #F4F4F5; }
  body {
    font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #18181B;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Mobile primero: la mayoría abre esto desde el WhatsApp del teléfono.
     El A4 fijo queda sólo para imprimir, más abajo. */
  .sheet {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
    padding: 24px 18px;
    background: #fff;
  }

  header {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 16px; flex-wrap: wrap;
  }
  .logo { height: 40px; margin-bottom: 8px; display: block; }
  .brand { font-size: 17px; font-weight: 700; letter-spacing: -0.3px; }
  .brand-mail { font-size: 12px; color: #71717A; margin-top: 2px; }

  .doc { text-align: right; }
  .doc .kind {
    font-size: 11px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: #71717A;
  }
  .doc .num { font-size: 26px; font-weight: 700; letter-spacing: -0.8px; margin-top: 2px; }
  .doc .date { font-size: 12px; color: #71717A; margin-top: 4px; }

  .rule { height: 3px; background: #18181B; margin: 22px 0 28px; }

  h2 {
    font-size: 10px; font-weight: 700; letter-spacing: 1.6px;
    text-transform: uppercase; color: #A1A1AA; margin: 0 0 6px;
  }
  .client { font-size: 18px; font-weight: 600; }
  .client-meta { font-size: 12px; color: #71717A; margin-top: 2px; }

  table { width: 100%; border-collapse: collapse; margin-top: 30px; }
  th {
    text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1.4px;
    color: #A1A1AA; border-bottom: 1.5px solid #18181B; padding-bottom: 8px; font-weight: 700;
  }
  th.right, td.right { text-align: right; }
  td { padding: 13px 0; border-bottom: 1px solid #EFEFF1; vertical-align: top; }
  .right { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .qty { color: #A1A1AA; }

  .total {
    display: flex; justify-content: space-between; align-items: center;
    background: #D6FF4B; color: #111113;
    padding: 14px 18px; border-radius: 10px; margin-top: 22px;
  }
  .total .label { font-size: 12px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; }
  .total .amount { font-size: 24px; font-weight: 700; letter-spacing: -0.6px; font-variant-numeric: tabular-nums; }

  .pay { margin-top: 30px; padding: 16px 18px; background: #FAFAFA; border: 1px solid #EFEFF1; border-radius: 10px; }
  .pay p { margin: 0; font-size: 14px; }
  .pay strong { display: inline-block; min-width: 52px; color: #71717A; font-size: 11px; letter-spacing: 1px; }
  .pay.warn { background: #FFFBEB; border-color: #FDE68A; }
  .muted { color: #71717A; font-size: 12px; }

  .notes { margin-top: 22px; font-size: 13px; color: #3F3F46; white-space: pre-wrap; }
  .valid { margin-top: 22px; font-size: 12px; color: #71717A; }

  footer {
    margin-top: 40px; padding-top: 16px; border-top: 1px solid #EFEFF1;
    font-size: 11px; color: #A1A1AA; display: flex; justify-content: space-between;
  }

  /* Barra de acciones: sólo en pantalla, nunca en el papel. */
  .toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
    padding: 12px; background: #18181B;
  }
  .toolbar button, .toolbar a {
    font: 600 14px/1 -apple-system, "Segoe UI", Roboto, sans-serif;
    padding: 11px 18px; border-radius: 9px; border: 0; cursor: pointer; text-decoration: none;
    background: #27272A; color: #FAFAFA;
  }
  .toolbar .wa { background: #D6FF4B; color: #111113; }

  /* Teléfonos angostos: el bloque del documento pasa abajo del nombre. */
  @media (max-width: 430px) {
    .doc { text-align: left; }
    .doc .num { font-size: 22px; }
    .total { padding: 12px 14px; }
    .total .amount { font-size: 21px; }
    .toolbar button, .toolbar a { flex: 1; text-align: center; padding: 12px 10px; }
  }

  /* Con lugar de sobra, se ve como una hoja de verdad. */
  @media (min-width: 700px) {
    .sheet { padding: 18mm 16mm; min-height: 297mm; }
  }

  @media print {
    .toolbar { display: none !important; }
    html, body { background: #fff; }
    .sheet {
      width: auto; max-width: none; min-height: auto;
      margin: 0; padding: 16mm 14mm;
    }
  }
</style></head>
<body>
${toolbar}
<div class="sheet">
  <header>
    <div>
      ${user.logo_url ? `<img class="logo" src="${esc(user.logo_url)}" alt="" />` : ''}
      <div class="brand">${esc(user.business_name ?? 'Mi negocio')}</div>
      <div class="brand-mail">${esc(user.email)}</div>
    </div>
    <div class="doc">
      <div class="kind">Presupuesto</div>
      <div class="num">#${esc(quote.number)}</div>
      <div class="date">${esc(fecha(quote.created_at))}</div>
    </div>
  </header>

  <div class="rule"></div>

  <h2>Para</h2>
  <div class="client">${esc(quote.client_name)}</div>
  ${quote.client_whatsapp ? `<div class="client-meta">+${esc(quote.client_whatsapp)}</div>` : ''}

  <table>
    <thead><tr><th>Detalle</th><th class="right">Importe</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="total">
    <span class="label">Total</span>
    <span class="amount">${esc(money(quote.total_amount, quote.currency))}</span>
  </div>

  ${pago}
  ${quote.notes ? `<div class="notes">${esc(quote.notes)}</div>` : ''}
  ${
    quote.valid_until
      ? `<div class="valid">Este presupuesto tiene validez hasta el ${esc(fecha(quote.valid_until))}.</div>`
      : ''
  }

  <footer>
    <span>${esc(user.business_name ?? '')}</span>
    <span>Hecho con Lana</span>
  </footer>
</div>
</body></html>`;
}

/**
 * Web: abre el presupuesto en una ventana propia, con la plantilla real.
 *
 * No se usa Print.printAsync porque en web ignora el HTML que recibe y manda
 * a imprimir la página actual: el resultado era una captura del formulario
 * de la app en vez de un presupuesto.
 */
export function openQuoteWindow(html: string): void {
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) {
    throw new Error(
      'El navegador bloqueó la ventana emergente. Permitila para este sitio y volvé a intentar.',
    );
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/**
 * Nativo: genera el PDF, lo sube al bucket privado y devuelve un link
 * firmado (30 días) listo para pegar en WhatsApp.
 */
export async function generateAndUpload(
  quote: QuoteWithClient,
  user: User,
): Promise<{ uri: string; signedUrl: string }> {
  if (Platform.OS === 'web') {
    throw new Error('generateAndUpload es sólo para iOS y Android; en web usá openQuoteWindow.');
  }

  const { uri } = await Print.printToFileAsync({ html: buildQuoteHtml(quote, user) });

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(base64);

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
