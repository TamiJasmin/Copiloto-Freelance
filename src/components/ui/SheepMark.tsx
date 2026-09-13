import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';
import { C } from '@/theme/tokens';

type Props = {
  size?: number;
  /** Color de la oveja. */
  color?: string;
  /** Color del ojo: tiene que ser el del fondo sobre el que se apoya. */
  bg?: string;
};

/**
 * La oveja de Lana.
 *
 * Geométrica a propósito: el cuerpo es un cúmulo de círculos, no un dibujo.
 * Así se lee igual a 16px en una pestaña que a 200px en una pantalla de
 * bienvenida, y no depende de un ilustrador para cambiar de tamaño.
 */
export function SheepMark({ size = 28, color = C.bg, bg = C.accent }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {/* Patas primero: quedan detrás del cuerpo. */}
      <Rect x="15" y="27" width="4" height="10" rx="2" fill={color} />
      <Rect x="24" y="27" width="4" height="10" rx="2" fill={color} />

      {/* Cuerpo: cuatro círculos que se solapan y forman el vellón. */}
      <Circle cx="16" cy="21" r="7.5" fill={color} />
      <Circle cx="24" cy="18" r="8" fill={color} />
      <Circle cx="21" cy="25" r="7.5" fill={color} />
      <Circle cx="29" cy="23" r="7" fill={color} />

      {/* Cabeza y oreja */}
      <Ellipse cx="35" cy="24" rx="6" ry="6.5" fill={color} />
      <Ellipse cx="31.5" cy="19.5" rx="3" ry="2" fill={color} />

      {/* El ojo es un hueco: se pinta del color del fondo. */}
      <Circle cx="36.5" cy="23" r="1.4" fill={bg} />
    </Svg>
  );
}

/**
 * Misma oveja, como data URI para el favicon.
 * Va acá y no en un .svg suelto para que marca e ícono no se despeguen.
 */
export const SHEEP_FAVICON = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <rect width="48" height="48" rx="11" fill="${C.accent}"/>
    <g fill="${C.bg}">
      <rect x="15" y="27" width="4" height="10" rx="2"/>
      <rect x="24" y="27" width="4" height="10" rx="2"/>
      <circle cx="16" cy="21" r="7.5"/>
      <circle cx="24" cy="18" r="8"/>
      <circle cx="21" cy="25" r="7.5"/>
      <circle cx="29" cy="23" r="7"/>
      <ellipse cx="35" cy="24" rx="6" ry="6.5"/>
      <ellipse cx="31.5" cy="19.5" rx="3" ry="2"/>
    </g>
    <circle cx="36.5" cy="23" r="1.4" fill="${C.accent}"/>
  </svg>`,
)}`;
