import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
          motion: ['framer-motion', '@dnd-kit/core'],
          charts: ['recharts'],
          realtime: ['socket.io-client'],
        },
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:4000',
      '/socket.io': {
        target: 'ws://127.0.0.1:4000',
        ws: true,
      },
    },
  },
})
