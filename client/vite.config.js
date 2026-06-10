import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The client builds into the server's public dir so one Node process serves
// both the API and the SPA. In dev, Vite runs on :5173 and proxies /api to the
// backend on :8065 so cookies and requests behave like production.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8065',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
});
