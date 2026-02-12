import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,  // Puedes cambiar el puerto si lo necesitas
    open: true,  // Abrir el navegador automáticamente
  },
  build: {
    outDir: 'dist',  // Carpeta de salida para el build
  },
})
