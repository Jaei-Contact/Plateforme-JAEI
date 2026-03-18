import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ============================================================
// Vite Config — JAEI Platform Frontend
// ============================================================

export default defineConfig({
  plugins: [react()],


  server: {
    port: 3000,
    open: true,
    // Proxy vers le backend Node/Express
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: 'build',
    sourcemap: false,
  },

  // Pour pouvoir utiliser @ comme alias de src/
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
