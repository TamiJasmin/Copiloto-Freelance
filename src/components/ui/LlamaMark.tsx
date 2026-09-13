import { Image } from 'react-native';

/**
 * La marca de Lana.
 *
 * Dos versiones, las dos generadas por `npm run icons` desde LANA.png:
 *
 * - `llama`  : sólo el animal. Va donde el nombre ya está escrito al lado.
 * - `lockup` : el imagotipo completo, con la palabra. Va donde la marca se
 *              presenta sola, como el ingreso.
 *
 * Los PNG traen el trazo blanco sobre transparente, así que se apoyan sobre
 * cualquier color sin arrastrar un rectángulo negro.
 */

// Proporciones de los archivos generados: no se fuerzan a un cuadrado,
// porque estirar un dibujo hecho a mano se nota enseguida.
const RELACION = {
  llama: 708 / 512,
  lockup: 854 / 512,
} as const;

type Props = {
  variant?: keyof typeof RELACION;
  height?: number;
};

export function LlamaMark({ variant = 'llama', height = 96 }: Props) {
  const relacion = RELACION[variant];

  return (
    <Image
      source={
        variant === 'lockup'
          ? require('../../../assets/lockup.png')
          : require('../../../assets/llama.png')
      }
      style={{ height, width: height / relacion }}
      resizeMode="contain"
      accessibilityLabel="Lana"
    />
  );
}
