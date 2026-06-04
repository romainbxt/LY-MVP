import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FDFCFA',
        ink: '#1B1815',
        muted: '#6B645B',
        honey: '#C08C4D',
        'honey-deep': '#A87836',
        hairline: '#E8E2D8',
        forest: '#5A7A4D',
      },
      fontFamily: {
        serif: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        flash: 'flash 0.7s ease-in-out infinite',
        fadeIn: 'fadeIn 0.6s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
