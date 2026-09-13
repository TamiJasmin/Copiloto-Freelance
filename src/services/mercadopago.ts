import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';

/**
 * Guarda el Access Token de Mercado Pago.
 *
 * Va por una función y no por un insert directo: la tabla está cerrada a la
 * API, sin ninguna policy. La función decide de quién es la fila a partir de
 * la sesión, así que el cliente ni siquiera manda el user_id — no hay forma
 * de guardar un token en la cuenta de otro.
 */
export async function guardarCredencialMP(token: string): Promise<void> {
  const { error } = await supabase.rpc('guardar_credencial_mp', { p_token: token.trim() });
  if (error) throw error;
}

/** Si hay token cargado. Devuelve un booleano, nunca el token. */
export async function tieneCredencialMP(): Promise<boolean> {
  const { data, error } = await supabase.rpc('tiene_credencial_mp');
  if (error) return false;
  return data === true;
}

/**
 * Pide a la Edge Function un link de pago con el monto exacto.
 * El token nunca pasa por acá: vive en el servidor.
 */
export async function generarLinkDePago(quoteId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('crear-link-pago', {
    body: { quoteId },
  });

  if (error) {
    // El cuerpo del error trae el mensaje real de la función; el error de
    // arriba suele decir sólo "non-2xx status code", que no ayuda a nadie.
    const detalle = await leerDetalle(error);
    throw new Error(detalle ?? errorMessage(error));
  }

  const link = (data as { link?: string; error?: string } | null)?.link;
  if (!link) throw new Error((data as { error?: string })?.error ?? 'No recibimos el link.');

  return link;
}

/** Rescata el mensaje que devolvió la función dentro del error de invoke. */
async function leerDetalle(error: unknown): Promise<string | null> {
  const res = (error as { context?: Response })?.context;
  if (!res || typeof res.json !== 'function') return null;
  try {
    const cuerpo = await res.json();
    return typeof cuerpo?.error === 'string' ? cuerpo.error : null;
  } catch {
    return null;
  }
}
