/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        'pat-purple': {
          400: '#a855f7',
          500: '#9333ea',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        'pat-blue': {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        }
      },
      backgroundImage: {
        'pat-gradient': 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
        'pat-glow': 'linear-gradient(135deg, #9333ea 0%, #60a5fa 100%)',
      },
      boxShadow: {
        'pat-glow': '0 0 20px rgba(147, 51, 234, 0.3)',
        'pat-card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
};
