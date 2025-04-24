import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // make sure this matches what backend sees
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