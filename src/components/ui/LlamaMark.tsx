import { Image } from 'react-native';

/**
 * La llama de Lana.
 *
 * El PNG viene con el trazo en blanco y el fondo transparente (lo genera
 * `npm run icons` desde LANA.png), así que se apoya sobre cualquier color
 * sin arrastrar un rectángulo negro.
 *
 * Se respeta la proporción original —es alta y angosta— en vez de forzarla
 * a un cuadrado: estirar un dibujo hecho a mano se nota enseguida.
 */
const RELACION = 1078 / 512; // alto / ancho del archivo generado

export function LlamaMark({ height = 96 }: { height?: number }) {
  return (
    <Image
      source={require('../../../assets/llama.png')}
      style={{ height, width: height / RELACION }}
      resizeMode="contain"
      accessibilityLabel="Lana"
    />
  );
}
