/**
 * Vite Configuration — Vox DPSI Client
 *
 * Notes:
 * - emptyOutDir: false  →  prevents Vite from trying to delete the dist folder
 *   before rebuilding. Needed because the dist folder may be read-only on
 *   mounted filesystems (e.g. during CI or the Cowork sandbox). Vercel always
 *   builds in a clean environment so this doesn't affect production builds.
 * - The /api proxy routes all API calls to the Express server in dev mode,
 *   avoiding CORS issues when running frontend and backend locally.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Don't empty outDir before rebuild — safe for all environments
    emptyOutDir: false,
  },

  server: {
    port: 5173,
    // Proxy /api/* → Express server in dev
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
