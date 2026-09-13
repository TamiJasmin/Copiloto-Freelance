import { Platform } from 'react-native';
import { SHEEP_FAVICON } from '@/components/ui/SheepMark';
import { C } from '@/theme/tokens';

/**
 * Completa el <head> en web.
 *
 * No se usa `app/+html.tsx` porque con `web.output: "single"` expo-router
 * ni lo mira: esa cáscara sólo se aplica al renderizado estático. Dejarlo
 * habría sido un archivo que parece configurar algo y no configura nada.
 *
 * El favicon sale del mismo SVG que la marca de la app, así que la oveja
 * de la pestaña y la de la pantalla de ingreso no pueden desincronizarse.
 */
export function applyWebHead() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  document.documentElement.lang = 'es';

  const link = (rel: string, href: string) => {
    const el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`) ?? document.createElement('link');
    el.rel = rel;
    el.href = href;
    if (!el.parentNode) document.head.appendChild(el);
  };

  const meta = (name: string, content: string) => {
    const el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`) ?? document.createElement('meta');
    el.name = name;
    el.content = content;
    if (!el.parentNode) document.head.appendChild(el);
  };

  link('icon', SHEEP_FAVICON);
  link('apple-touch-icon', SHEEP_FAVICON);

  meta('description', 'Presupuestá, mandá por WhatsApp y cobrá.');
  meta('theme-color', C.bg);
  meta('color-scheme', 'dark');
}
