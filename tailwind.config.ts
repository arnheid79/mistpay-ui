import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ink — deep navy dark scale
        ink: {
          900: '#0E1620',
          800: '#161F2B',
          700: '#1F2937',
          600: '#2C3744',
          500: '#3E4A59',
        },
        // Mist — gray-blue mid scale
        mist: {
          50: '#F4F6F8',
          100: '#E7ECF1',
          200: '#C9D2DC',
          300: '#9AA7B5',
          400: '#6B7888',
          500: '#4F5A6A',
        },
        // Paper — near whites
        paper: '#FBFCFD',
        paper2: '#F7F9FB',
        // Signal — primary brand blue
        signal: {
          50: '#EEF1FF',
          100: '#DCE2FF',
          300: '#8FA4FF',
          500: '#4B6BFF',
          600: '#3852D8',
          700: '#2A3FA8',
        },
        // Semantic
        success: {
          500: '#2E9E6B',
          50: '#E8F5EE',
        },
        warn: {
          500: '#C68A2E',
          50: '#F9F0E0',
        },
        danger: {
          500: '#C44545',
          50: '#F8E6E6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['Instrument Serif', 'Iowan Old Style', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xs: '6px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '22px',
        '2xl': '28px',
        pill: '999px',
      },
      boxShadow: {
        1: '0 1px 0 rgba(14,22,32,0.04), 0 1px 2px rgba(14,22,32,0.04)',
        2: '0 1px 0 rgba(14,22,32,0.04), 0 4px 12px rgba(14,22,32,0.06)',
        3: '0 6px 18px rgba(14,22,32,0.08), 0 2px 6px rgba(14,22,32,0.04)',
        4: '0 18px 40px rgba(14,22,32,0.14), 0 6px 16px rgba(14,22,32,0.06)',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
      },
      transitionTimingFunction: {
        'mist-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'mist-inout': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '220ms',
        slow: '420ms',
      },
      animation: {
        'fade-in': 'fadeIn 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'rise-in': 'riseIn 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'settle': 'settle 120ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        settle: {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.9)' },
          '50%': { opacity: '1', transform: 'scale(1.1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
