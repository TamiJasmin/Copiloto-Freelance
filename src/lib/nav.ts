import { router } from 'expo-router';

/**
 * Cierra la pantalla actual y, si no hay a dónde volver, va al inicio.
 *
 * `router.back()` a secas no hace NADA cuando no hay historial, y eso pasa
 * seguido: después de crear un presupuesto se navega con `replace` al
 * detalle, así que la pantalla anterior ya no existe. La X quedaba muerta y
 * no había forma de volver al menú.
 */
export function cerrar(fallback: '/' | '/quotes' | '/clients' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
