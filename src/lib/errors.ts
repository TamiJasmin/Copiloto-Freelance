/**
 * Extrae un mensaje legible de cualquier cosa que se haya lanzado.
 *
 * Supabase no lanza instancias de Error: PostgrestError, StorageError y
 * AuthError son objetos planos con message/details/hint/code. Un
 * `e instanceof Error` los descarta a todos y deja al usuario mirando un
 * texto genérico mientras la causa real queda invisible.
 */
export function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error && e.message) return e.message;

  if (e && typeof e === 'object') {
    const err = e as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [err.message, err.details, err.hint].filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    );
    if (parts.length) {
      const text = parts.join(' — ');
      return err.code ? `${text} (${err.code})` : text;
    }
  }

  return 'Ocurrió un error inesperado.';
}

/**
 * Traduce los fallos más comunes a algo accionable.
 * Si no reconoce el caso, devuelve el mensaje crudo: es preferible un texto
 * técnico a uno amable que no dice nada.
 */
export function friendlyError(e: unknown): string {
  const raw = errorMessage(e);
  const code = (e as { code?: string } | null)?.code;

  if (code === '42P10' || raw.includes('ON CONFLICT')) {
    return 'Falta correr la migración 0002 en Supabase (SQL Editor). ' + raw;
  }
  if (code === '23503') {
    return 'Falta tu perfil de negocio en la base. Cerrá sesión y volvé a entrar. ' + raw;
  }
  if (code === '23514') {
    return 'El número de WhatsApp no tiene un formato válido. ' + raw;
  }
  if (code === '42501' || raw.includes('row-level security')) {
    return 'Tu sesión no tiene permiso para esta acción. Volvé a iniciar sesión. ' + raw;
  }
  return raw;
}

/**
 * Errores de autenticación. Supabase los devuelve en inglés y algunos son
 * engañosos: "Invalid login credentials" también aparece cuando la cuenta
 * existe pero nunca tuvo contraseña, que es el caso de quien se registró
 * con un link de acceso.
 */
export function authError(e: unknown): string {
  const raw = errorMessage(e);
  const m = raw.toLowerCase();

  if (m.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos. Si creaste tu cuenta con un link de acceso, todavía no tenés contraseña: entrá con el link y creala en Mi negocio.';
  }
  if (m.includes('email not confirmed')) {
    return 'Todavía no confirmaste tu correo. Buscá el mail de confirmación que te enviamos.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Ese correo ya tiene cuenta. Probá ingresar en vez de crear una.';
  }
  if (m.includes('password should be at least')) {
    return 'La contraseña es demasiado corta: usá al menos 8 caracteres.';
  }
  if (m.includes('for security purposes') || m.includes('rate limit') || m.includes('too many')) {
    return 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.';
  }
  if (m.includes('new password should be different')) {
    return 'La contraseña nueva tiene que ser distinta de la actual.';
  }
  return raw;
}
