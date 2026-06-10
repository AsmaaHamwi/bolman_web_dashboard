import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bolman: {
          purple: '#6C63FF',
          deep: '#5146E5',
          mint: '#8BE9C1',
          softMint: '#DFF8EC',
          dark: '#12131A',
          cardDark: '#1B1D27',
          surfaceDark: '#232634',
          borderDark: '#2B3040'
        }
      },
      boxShadow: {
        soft: '0 12px 40px rgba(81,70,229,0.10)',
        glow: '0 0 0 1px rgba(108,99,255,0.16), 0 14px 40px rgba(108,99,255,0.24)'
      },
      fontFamily: {
        sans: ['Inter', 'Tajawal', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config;
