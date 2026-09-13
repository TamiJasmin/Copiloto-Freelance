import { Platform } from 'react-native';

/**
 * Base pública de la app, para armar links que abre otra persona.
 *
 * En web se deduce del navegador. En nativo no hay forma de deducirla:
 * hay que declarar EXPO_PUBLIC_APP_URL, porque un link con la URL
 * equivocada es peor que un error — el cliente recibe algo que no abre.
 */
export function appBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/+$/, '');
  if (configured) return configured;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }

  throw new Error(
    'Falta EXPO_PUBLIC_APP_URL. Sin esa variable no se puede armar el link del presupuesto.',
  );
}

/** Link público de un presupuesto, el que se pega en WhatsApp. */
export function quoteShareUrl(shareToken: string): string {
  return `${appBaseUrl()}/q/${shareToken}`;
}
