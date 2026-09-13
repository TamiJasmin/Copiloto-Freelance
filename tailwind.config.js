/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Superficies (dark-first)
        bg: '#0A0A0B',
        surface: '#131316',
        elevated: '#1B1B1F',
        border: '#26262B',

        // Texto
        ink: '#FAFAFA',
        muted: '#8A8A93',
        faint: '#5A5A63',

        // Acento: dinero / CTA. Alto contraste sobre negro.
        accent: '#D6FF4B',
        'accent-dim': '#A3C72E',

        // Estados de presupuesto
        draft: '#5A5A63',
        sent: '#FFB020',
        approved: '#4D9FFF',
        paid: '#D6FF4B',
        danger: '#FF5C5C',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '22px',
      },
      /**
       * Escala tipográfica cerrada. Siete pasos, ni uno más: si hace falta
       * un tamaño nuevo, primero hay que justificar por qué la jerarquía
       * actual no alcanza. Evita el desorden de píxeles sueltos.
       */
      fontSize: {
        micro: ['11px', { lineHeight: '14px', letterSpacing: '0.6px' }],
        caption: ['12px', { lineHeight: '16px' }],
        label: ['13px', { lineHeight: '18px' }],
        body: ['15px', { lineHeight: '21px' }],
        heading: ['17px', { lineHeight: '22px', letterSpacing: '-0.2px' }],
        title: ['21px', { lineHeight: '26px', letterSpacing: '-0.5px' }],
        display: ['36px', { lineHeight: '40px', letterSpacing: '-1.4px' }],
      },
    },
  },
  plugins: [],
};
