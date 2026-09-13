import { Platform } from 'react-native';
import { C } from '@/theme/tokens';

/**
 * Completa el <head> en web.
 *
 * No se usa `app/+html.tsx` porque con `web.output: "single"` expo-router
 * ni lo mira: esa cáscara sólo se aplica al renderizado estático. Dejarlo
 * habría sido un archivo que parece configurar algo y no configura nada.
 *
 * El favicon no se toca acá: lo declara app.json (web.favicon) y Expo lo
 * inyecta en el index.html durante el build, con su hash de contenido.
 */
export function applyWebHead() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  document.documentElement.lang = 'es';

  const meta = (name: string, content: string) => {
    const el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`) ?? document.createElement('meta');
    el.name = name;
    el.content = content;
    if (!el.parentNode) document.head.appendChild(el);
  };

  meta('description', 'Presupuestá, mandá por WhatsApp y cobrá.');
  meta('theme-color', C.bg);
  meta('color-scheme', 'dark');
}
