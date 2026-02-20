import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          950: '#020c10',
          900: '#06161d',
          800: '#0c2732',
          700: '#104353',
          500: '#1cd6e2',
          300: '#7ff4f9'
        }
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(28,214,226,0.15), 0 10px 35px rgba(0,0,0,0.35)'
      }
    },
  },
  plugins: [],
} satisfies Config;
