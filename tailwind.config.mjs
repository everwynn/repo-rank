/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts,md}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: '#2563eb',
        'brand-ink': 'var(--brand-ink)',
        up: '#16a34a',
        down: '#dc2626',
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        card: 'var(--card)',
      },
    },
  },
  plugins: [],
};
