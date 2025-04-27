import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use environment variable for backend API URL, fallback to localhost:8000
const backendUrl = process.env.VITE_API_URL || 'http://localhost:8000';

console.log(`[Vite Config] Using backend API URL: ${backendUrl}`);
console.log('[Vite Config] Setting up proxies for /api and /api-token-auth/');

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow access from other devices on the network
    port: 5173,
    proxy: {
      // Important: Route for token authentication endpoint must come first
      '/api-token-auth/': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[PROXY ERROR] /api-token-auth/:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[PROXY REQUEST] /api-token-auth/:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[PROXY RESPONSE] /api-token-auth/:', proxyRes.statusCode, req.url);
          });
        }
      },
      // General API routes
      '^/api/': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
// https://vitejs.dev/config/
// https://vitejs.dev/guide/build.html#building-for-production
// https://vitejs.dev/guide/api-javascript.html#vite
// https://vitejs.dev/guide/features.html#features-ssr
// https://vitejs.dev/guide/features.html#features-ssr
// https://vitejs.dev/guide/features.html#features-ssr