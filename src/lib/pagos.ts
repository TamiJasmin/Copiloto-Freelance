import type { PaymentInfo } from '@/types/db';

/**
 * Qué puede hacer el cliente con los datos de cobro.
 *
 * Un alias y un link de Mercado Pago son cosas distintas: uno se copia y se
 * pega en el homebanking, el otro se toca y lleva a pagar. Mostrar los dos
 * como texto suelto, que es lo que hacíamos, deja al cliente seleccionando
 * caracteres con el dedo.
 */
export type AccionPago =
  | { clase: 'link'; url: string; etiqueta: string }
  | { clase: 'copiar'; valor: string; etiqueta: string };

/**
 * Las etiquetas se eligen por ACCIÓN, no por medio de pago.
 *
 * Antes había una sola tabla por tipo y se resolvía el texto antes de decidir
 * qué se iba a hacer. Resultado: alguien elegía "Mercado Pago" y pegaba su
 * alias, el código caía correctamente a copiar —para no inventar un link
 * roto— pero el botón seguía diciendo "Pagar con Mercado Pago". Decía una
 * cosa y hacía otra.
 */
const ETIQUETA_LINK: Record<NonNullable<PaymentInfo['tipo']>, string> = {
  mp: 'Pagar con Mercado Pago',
  paypal: 'Pagar con PayPal',
  alias: 'Pagar',
  cbu: 'Pagar',
};

const ETIQUETA_COPIA: Record<NonNullable<PaymentInfo['tipo']>, string> = {
  mp: 'Copiar datos de pago',
  paypal: 'Copiar datos de pago',
  alias: 'Copiar alias',
  cbu: 'Copiar CBU',
};

/**
 * Normaliza lo que el usuario pegó a una URL usable.
 *
 * Casi nadie escribe el https:// al copiar un link de cobro, y un href sin
 * esquema el navegador lo toma como ruta relativa: el cliente terminaría en
 * una página de nuestra app que no existe, en vez de en Mercado Pago.
 *
 * Devuelve null si no parece una dirección, para no fabricar un link roto
 * a partir de un alias.
 */
export function comoUrl(valor: string): string | null {
  const limpio = valor.trim();
  if (!limpio || /\s/.test(limpio)) return null;

  if (/^https?:\/\//i.test(limpio)) return limpio;

  // Un dominio tiene al menos un punto con algo a cada lado. Un alias de
  // CBU también puede tenerlo (mi.alias.mp), así que además se exige que
  // arranque con algo que parezca un host conocido o que traiga una ruta.
  const pareceDominio = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(limpio);
  const tieneRuta = limpio.includes('/');

  return pareceDominio && tieneRuta ? `https://${limpio}` : null;
}

/** Nombra el medio a partir del dominio, para no decir "Pagar ahora" a secas. */
function etiquetaDeUrl(url: string): string {
  if (/mercadopago|mercadolibre/i.test(url)) return 'Pagar con Mercado Pago';
  if (/paypal/i.test(url)) return 'Pagar con PayPal';
  if (/modo/i.test(url)) return 'Pagar con MODO';
  return 'Pagar este presupuesto';
}

/**
 * La acción de pago de un presupuesto concreto.
 *
 * Un link propio gana sobre los datos generales: se carga a mano justamente
 * cuando lleva el monto exacto, y ese es mejor que un link donde el cliente
 * tiene que escribir el importe y puede equivocarse.
 */
export function accionDePagoDe(
  linkDelPresupuesto: string | null | undefined,
  info: PaymentInfo | null | undefined,
): AccionPago | null {
  const propio = linkDelPresupuesto?.trim();
  if (propio) {
    const url = comoUrl(propio);
    if (url) return { clase: 'link', url, etiqueta: etiquetaDeUrl(url) };
    // Si lo cargado no es una dirección se ignora y se sigue con lo general:
    // mejor el alias del negocio que un botón que no lleva a ningún lado.
  }
  return accionDePago(info);
}

/** La acción que corresponde a los datos de cobro generales de la cuenta. */
export function accionDePago(info: PaymentInfo | null | undefined): AccionPago | null {
  const valor = info?.valor?.trim();
  if (!valor) return null;

  const tipo = info?.tipo ?? 'alias';

  // Sólo los medios que son un link se ofrecen como link. Un CBU nunca lo es,
  // aunque alguien pegue algo con barras.
  if (tipo === 'mp' || tipo === 'paypal') {
    const url = comoUrl(valor);
    if (url) return { clase: 'link', url, etiqueta: ETIQUETA_LINK[tipo] };
  }

  // Acá ya se sabe que la acción es copiar, así que la etiqueta lo dice.
  return { clase: 'copiar', valor, etiqueta: ETIQUETA_COPIA[tipo] ?? 'Copiar datos de pago' };
}
