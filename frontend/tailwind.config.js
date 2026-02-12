/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  // Asegura que se analicen archivos TS también
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1E40AF",  // Puedes extender colores si lo necesitas
      },
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],  // Ejemplo de font extendida
      },
    },
  },
  plugins: [],
}
