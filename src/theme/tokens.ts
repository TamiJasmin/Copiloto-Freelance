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

export type QuoteStatus = 'borrador' | 'enviado' | 'aprobado' | 'cobrado';

export const STATUS_META: Record<
  QuoteStatus,
  { label: string; color: string; chipBg: string }
> = {
  borrador: { label: 'Borrador', color: C.draft, chipBg: 'rgba(90,90,99,0.16)' },
  enviado: { label: 'Enviado', color: C.sent, chipBg: 'rgba(255,176,32,0.14)' },
  aprobado: { label: 'Aprobado', color: C.approved, chipBg: 'rgba(77,159,255,0.14)' },
  cobrado: { label: 'Cobrado', color: C.paid, chipBg: 'rgba(214,255,75,0.14)' },
};
