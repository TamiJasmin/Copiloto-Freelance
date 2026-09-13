import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';

/**
 * Guarda el Access Token de Mercado Pago.
 *
 * No se hace `.select()` después de escribir, y no es un olvido: la tabla no
 * tiene policy de SELECT justamente para que el token no pueda volver al
 * cliente. Pedirlo de vuelta haría fallar la operación entera.
 */
export async function guardarCredencialMP(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('user_payment_credentials')
    .upsert(
      { user_id: userId, mp_access_token: token.trim() || null, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

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
