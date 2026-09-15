/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vb: {
          orange: '#ff7a00',
          hover: '#e66e00',
          light: '#fff3e6',
          border: 'rgba(255, 122, 0, 0.3)',
          textAccent: '#cc6200',
        },
      },
    },
  },
  plugins: [],
};