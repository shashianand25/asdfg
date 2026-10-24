/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: false,
  theme: {
    extend: {
      colors: {
        // Primary brand blues
        brand: {
          50:  '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        // Sidebar navy
        navy: {
          800: '#193A78',
          900: '#10233F',
        },
        // Electric blue (primary action color)
        electric: {
          50:  '#eff6ff',
          500: '#3478F6',
          600: '#2866D8',
          700: '#193A78',
        },
        teal: {
          100: '#DDF5F1',
          300: '#64E2D1',
          500: '#168F86',
          700: '#0F6F69',
        },
        amber: {
          50: '#FFF5E8',
          300: '#F6C275',
          500: '#F2A23A',
          600: '#C47715',
        },
        // Surface colors (backgrounds, borders)
        surface: {
          bg:     '#F1F4F8',
          border: '#E3E8EF',
        },
        offwhite: '#FAFBFD',
        // Content (text) colors
        content: {
          primary:   '#172338',
          secondary: '#6D788A',
          tertiary:  '#9AA4B3',
        },
        // Error states
        error: {
          50:  '#FEF2F2',
          500: '#EF4444',
        },
      },
      borderRadius: {
        card: '0.5rem',
      },
    },
  },
  plugins: [],
}
