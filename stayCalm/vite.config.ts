import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Standalone / futuro repo propio. En mrWhite se sirve en /staycalm vía el build raíz.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
