/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        oled: {
          950: '#050508',
          900: '#090b10',
          850: '#0f1219',
          800: '#151923',
          750: '#1d2332',
          700: '#283044',
          600: '#3b4663',
        },
        dark: {
          950: '#06070a',
          900: '#0c0e14',
          850: '#12161f',
          800: '#181d29',
          750: '#202637',
          700: '#2b334a',
          600: '#3c4767',
        },
        dance: {
          crimson: '#ff2d55', // Neón Carmesí sensual
          coral: '#ff6b4a',   // Naranja atardecer
          orange: '#ff6b4a',  // Alias
          amber: '#ffb300',   // Dorado VIP
          violet: '#8b5cf6',  // Violeta noche
          emerald: '#10b981', // Verde libre / gratis
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-crimson': '0 0 35px -5px rgba(255, 45, 85, 0.45)',
        'glow-coral': '0 0 35px -5px rgba(255, 107, 74, 0.45)',
        'glow-amber': '0 0 35px -5px rgba(255, 179, 0, 0.45)',
        'glass-card': '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
