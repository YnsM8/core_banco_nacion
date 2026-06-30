import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Portal del personal (asesores / fuerza de ventas) — usa el puerto 5173.
// El portal del cliente (Homebanking) corre en el 5174.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
})
