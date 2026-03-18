/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Vert foncé JAEI (lettres J et A du logo) ─────────────
        primary: {
          DEFAULT: '#2D5F3F',
          50:  '#EEF5F1',
          100: '#D4E8DA',
          200: '#A9D1B5',
          300: '#7DBA90',
          400: '#52A36B',
          500: '#2D5F3F',  // vert logo principal
          600: '#245233',
          700: '#1B4427',
          800: '#12371B',
          900: '#09290F',
        },
        // ── Bleu JAEI (lettres E et I du logo) ───────────────────
        accent: {
          DEFAULT: '#1E88C8',
          50:  '#E8F4FC',
          100: '#C4E2F6',
          200: '#8DC6EE',
          300: '#5BC0EB',  // cyan vagues du logo
          400: '#4AADE8',  // bleu lettres E et I
          500: '#1E88C8',  // bleu foncé
          600: '#186DA0',
          700: '#125278',
          800: '#0C3750',
          900: '#061C28',
        },
        // ── Vert clair (feuilles du logo) ────────────────────────
        leaf: {
          DEFAULT: '#7FB685',
          light:   '#B8D9BC',
          dark:    '#4E8A56',
        },
        // ── Tons neutres ScienceDirect ────────────────────────────
        neutral: {
          50:  '#FAFAFA',
          100: '#F5F7FA',
          200: '#EBEBEB',
          300: '#D4D4D4',
          400: '#A8A8A8',
          500: '#717171',
          600: '#555555',
          700: '#3D3D3D',
          800: '#2D2D2D',
          900: '#1A1A1A',
        },
        // ── Couleurs sémantiques ──────────────────────────────────
        success: '#2E7D32',
        warning: '#E65100',
        error:   '#C62828',
        info:    '#1E88C8',
        // ── Aliases logo (rétrocompatibilité) ─────────────────────
        'jaei-green':       '#2D5F3F',
        'jaei-light-green': '#7FB685',
        'jaei-blue':        '#4AADE8',
        'jaei-cyan':        '#5BC0EB',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xxs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'card':       '0 1px 4px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.11)',
        'nav':        '0 1px 0 #E0E0E0',
        'modal':      '0 8px 32px rgba(0,0,0,0.18)',
      },
      borderRadius: {
        'sm':  '3px',
        DEFAULT: '4px',
        'md':  '6px',
        'lg':  '8px',
        'xl':  '12px',
      },
      maxWidth: {
        'content': '1200px',
      },
      backgroundImage: {
        // Dégradé inspiré du logo (vert → bleu)
        'jaei-gradient':    'linear-gradient(135deg, #2D5F3F 0%, #1E88C8 100%)',
        'jaei-gradient-v':  'linear-gradient(180deg, #2D5F3F 0%, #1E88C8 100%)',
        'jaei-gradient-h':  'linear-gradient(90deg, #2D5F3F 0%, #4AADE8 100%)',
      },
    },
  },
  plugins: [],
}
