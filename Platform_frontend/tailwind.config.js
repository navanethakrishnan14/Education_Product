/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { fontFamily: { sans: ["DM Sans", "sans-serif"], display: ["Manrope", "sans-serif"] }, colors: { platform: { navy: "#0b1024", violet: "#7044e8", teal: "#258f7e" } } } },
  plugins: [],
};
