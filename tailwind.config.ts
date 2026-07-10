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
          mint: '#B8B0FF',
          softMint: '#ECEBFF',
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
      keyframes: {
        'bolman-fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'bolman-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(12px)' }
        },
        'bolman-marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        'bolman-modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        }
      },
      animation: {
        'bolman-fade-up': 'bolman-fade-up 0.7s ease-out both',
        'bolman-float': 'bolman-float 3.2s ease-in-out infinite',
        'bolman-float-delayed': 'bolman-float 3.2s ease-in-out 0.8s infinite',
        'bolman-marquee': 'bolman-marquee 28s linear infinite',
        'bolman-modal-in': 'bolman-modal-in 0.28s ease-out both'
      },
      fontFamily: {
        sans: ['Inter', 'Tajawal', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config;
