/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        pitch: {
          50:  '#edfff4',
          100: '#d5ffe6',
          200: '#aeffce',
          300: '#70ffaa',
          400: '#2bef7e',
          500: '#00d45a',
          600: '#00a845',
          700: '#008538',
          800: '#00672e',
          900: '#005527',
        },
        ink: {
          900: '#080c10',
          800: '#0d1117',
          700: '#111827',
          600: '#1a2232',
          500: '#232d3f',
          400: '#2d3a50',
          300: '#3d4e68',
          200: '#5a6d8a',
          100: '#8a9bb5',
          50:  '#b8c7d9',
        },
        gold: {
          400: '#f59e0b',
          500: '#d97706',
        },
        live: '#ef4444',
      },
      backgroundImage: {
        'pitch-gradient': 'linear-gradient(135deg, #080c10 0%, #0d1117 50%, #111827 100%)',
        'card-gradient': 'linear-gradient(135deg, #111827 0%, #1a2232 100%)',
        'live-pulse': 'radial-gradient(circle, #ef444433 0%, transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'score-pop': 'scorePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scorePop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #00d45a44' },
          '100%': { boxShadow: '0 0 20px #00d45a88, 0 0 40px #00d45a22' },
        },
      },
    },
  },
  plugins: [],
};
