/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#ffd700',
        'accent-dim': '#ffaa00',
        bg: '#1a1a2e',
        'bg-mid': '#16213e',
        'bg-deep': '#0f3460',
        surface: 'rgba(255, 255, 255, 0.07)',
        'surface-hover': 'rgba(255, 255, 255, 0.12)',
      },
      fontFamily: {
        game: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'dice-roll': 'diceRoll 0.4s ease-out',
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        diceRoll: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(0.8)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
