/**
 * Fuente de verdad de color en JS.
 * Debe espejar tailwind.config.js -> theme.extend.colors
 * Se usa donde Tailwind no llega: iconos SVG, StatusBar, ripple, shadows.
 */
export const C = {
  bg: '#0A0A0B',
  surface: '#131316',
  elevated: '#1B1B1F',
  border: '#26262B',

  ink: '#FAFAFA',
  muted: '#8A8A93',
  faint: '#5A5A63',

  accent: '#D6FF4B',
  accentDim: '#A3C72E',

  draft: '#5A5A63',
  sent: '#FFB020',
  approved: '#4D9FFF',
  paid: '#D6FF4B',
  danger: '#FF5C5C',
} as const;
