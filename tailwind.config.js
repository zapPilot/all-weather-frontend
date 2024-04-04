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
    {pattern: /^p(x|y|e)-\d+$/},
    {pattern: /^ring-(\d+|\w+)$/},
    {pattern: /^text-(red|green)-(400|700)$/},
    {pattern: /^(bg|ring)-(red|green|white)-(50|400|500|600)(\/\d{1,2})?$/},
  ],
};