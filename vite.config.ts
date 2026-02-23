import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix process.cwd() type error in node environment of vite.config.ts
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    base: '/posbarbers/',
    plugins: [react()],
    define: {
      // Fix: Map GEMINI_API_KEY to API_KEY to ensure GoogleGenAI finds it under the correct key per guidelines.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY),
      // Evitar crash si se accede a process.env directamente
      'process.env': {}
    },
    build: {
      outDir: 'dist', // Cambiado de 'build' a 'dist' para compatibilidad con Vercel
      chunkSizeWarningLimit: 1600, // Aumentar límite para silenciar advertencia de tamaño
    }
  }
})