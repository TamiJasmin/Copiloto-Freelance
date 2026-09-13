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
        xl: '18px',
        '2xl': '24px',
      },
      fontSize: {
        display: ['34px', { lineHeight: '38px', letterSpacing: '-1px' }],
      },
    },
  },
  plugins: [],
};
