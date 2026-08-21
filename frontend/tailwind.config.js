/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Legacy kms-slate tokens — kept for backward compatibility during migration
        'kms-slate': {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // KMS Brand system — primary blue palette
        'kms-blue': {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Pastel accent tokens (for metric cards & status indicators)
        'kms-green': {
          bg:     '#f0fdf4',
          border: '#bbf7d0',
          icon:   '#dcfce7',
          text:   '#065f46',
        },
        'kms-rose': {
          bg:     '#fff1f2',
          border: '#fecdd3',
          icon:   '#ffe4e6',
          text:   '#9f1239',
        },
        'kms-amber': {
          bg:     '#fffbeb',
          border: '#fde68a',
          icon:   '#fef3c7',
          text:   '#92400e',
        },
        'kms-cyan': {
          bg:     '#ecfeff',
          border: '#a5f3fc',
          icon:   '#cffafe',
          text:   '#164e63',
        },
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'xs':  '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'sm':  '0 2px 6px 0 rgb(0 0 0 / 0.06), 0 1px 3px -1px rgb(0 0 0 / 0.04)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        'lg':  '0.5rem',
        'xl':  '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};
