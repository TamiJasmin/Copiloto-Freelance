/**
 * Crea un link de pago de Mercado Pago con el monto exacto del presupuesto.
 *
 *   supabase functions deploy crear-link-pago
 *
 * Corre en el servidor porque el Access Token permite cobrar y devolver
 * plata en nombre del usuario. En la app sería público: todo lo que se
 * empaqueta en el bundle lo puede leer cualquiera que abra el sitio.
 *
 * El flujo es:
 *   1. Se identifica al usuario por su JWT.
 *   2. Se verifica que el presupuesto sea suyo. Sin esto, cualquiera podría
 *      generar links contra presupuestos ajenos pasando un id.
 *   3. Se lee su token con service_role, que es el único camino: la tabla no
 *      tiene policy de SELECT.
 *   4. Se pide la preference a Mercado Pago y se guarda el init_point.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const responder = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return responder({ error: 'Falta la sesión.' }, 401);

  // Quién pide. Se usa la anon key con el JWT del usuario, igual que la app.
  const comoUsuario = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await comoUsuario.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return responder({ error: 'Sesión inválida.' }, 401);

  let quoteId: string | undefined;
  try {
    quoteId = (await req.json())?.quoteId;
  } catch {
    return responder({ error: 'Cuerpo inválido.' }, 400);
  }
  if (!quoteId) return responder({ error: 'Falta quoteId.' }, 400);

  const admin = createClient(url, serviceKey);

  // El presupuesto tiene que ser de quien pide. Se filtra por user_id además
  // del id: sin eso, mandar un id ajeno alcanzaría para generar su link.
  const { data: quote, error: errQuote } = await admin
    .from('quotes')
    .select('id, number, total_amount, currency, items, status, user_id')
    .eq('id', quoteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (errQuote) return responder({ error: errQuote.message }, 500);
  if (!quote) return responder({ error: 'No encontramos ese presupuesto.' }, 404);
  if (Number(quote.total_amount) <= 0) {
    return responder({ error: 'El presupuesto no tiene monto.' }, 400);
  }

  const { data: cred } = await admin
    .from('user_payment_credentials')
    .select('mp_access_token')
    .eq('user_id', userId)
    .maybeSingle();

  const token = cred?.mp_access_token?.trim();
  if (!token) {
    return responder(
      { error: 'Todavía no conectaste tu cuenta de Mercado Pago en Mi negocio.' },
      400,
    );
  }

  // Un solo ítem con el total. Se podría mandar el detalle completo, pero el
  // checkout mostraría una lista larga donde al cliente sólo le importa
  // cuánto paga; el detalle ya lo vio en el presupuesto.
  const preference = {
    items: [
      {
        title: `Presupuesto #${quote.number}`,
        quantity: 1,
        unit_price: Number(quote.total_amount),
        currency_id: quote.currency ?? 'ARS',
      },
    ],
    // Ata el pago al presupuesto. Es lo que va a permitir que un webhook
    // marque el presupuesto como cobrado sin intervención.
    external_reference: quote.id,
  };

  const mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preference),
  });

  const cuerpo = await mp.json().catch(() => null);

  if (!mp.ok) {
    // El mensaje de MP se devuelve tal cual: dice bastante mejor qué pasó
    // que un "error al crear el link" genérico.
    const detalle = cuerpo?.message ?? cuerpo?.error ?? `HTTP ${mp.status}`;
    return responder({ error: `Mercado Pago rechazó el pedido: ${detalle}` }, 502);
  }

  // init_point es el de producción; sandbox_init_point, el de prueba. Con
  // credenciales TEST el primero puede venir vacío, así que se toma el que
  // haya en vez de asumir cuál corresponde.
  const link: string | undefined = cuerpo?.init_point ?? cuerpo?.sandbox_init_point;
  if (!link) return responder({ error: 'Mercado Pago no devolvió un link.' }, 502);

  const { error: errSave } = await admin
    .from('quotes')
    .update({ payment_link: link })
    .eq('id', quote.id);

  if (errSave) return responder({ error: errSave.message }, 500);

  return responder({ link });
});
