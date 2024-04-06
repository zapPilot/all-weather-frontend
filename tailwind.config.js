/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    {pattern: /^(m|p)(x|y|s|e)-\d+(\.\d+)?$/},
    {pattern: /^ring-(\d+|\w+)$/},
    {pattern: /^text-(red|green)-(400|700)$/},
    {pattern: /^text-\w+$/},
    {pattern: /^bg-(white|black)$/},
    {pattern: /^(bg|ring)-(red|green|white|gray)-(50|400|500|600|900)(\/\d{1,2})?$/},
    {pattern: /^font-\w+$/},
    {pattern: /^inline-\w+$/},
    {pattern: /^rounded-\w+$/},
  ],
};