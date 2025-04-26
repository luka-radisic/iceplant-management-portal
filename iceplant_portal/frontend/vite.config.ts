import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Use environment variable for backend API URL, fallback to localhost:8000
const backendUrl = process.env.VITE_API_URL || 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: backendUrl, // Use env or default
        changeOrigin: true,
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