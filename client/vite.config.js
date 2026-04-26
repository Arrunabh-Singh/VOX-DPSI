import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Chunk splitting — separates vendor libs from app code
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui':       ['react-hot-toast', 'recharts'],
          'vendor-network':  ['axios'],
        }
      }
    },
    // Warn on chunks > 400kB instead of default 500kB
    chunkSizeWarningLimit: 400,
  }
})
