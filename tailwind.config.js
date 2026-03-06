/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          50: '#F7F0DC',
          100: '#F2E5C2',
          200: '#E9CF8F',
          300: '#DFB95C',
          400: '#C9A84C',
          500: '#A88434',
          600: '#7D6127',
          700: '#523F1A',
          800: '#271E0D',
          900: '#0D0A04',
        },
        dark: {
          DEFAULT: '#0A0A0A',
          100: '#111111',
          200: '#161616',
          300: '#1A1A1A',
          400: '#222222',
          500: '#2A2A2A',
          600: '#333333',
          700: '#444444',
          800: '#555555',
        }
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
}
