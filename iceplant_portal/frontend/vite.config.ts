// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // load all env vars from .env.[mode], .env, etc
  const env = loadEnv(mode, process.cwd(), '')

  // VITE_BACKEND_URL should be something like "http://backend:8000"
  const BACKEND = env.VITE_BACKEND_URL

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        // forward /api/... → `${BACKEND}/...`
        '/api/': {
          target: BACKEND,
          changeOrigin: true,
          secure: false,
          rewrite: path => path.replace(/^\/api/, '')
        },
        // forward /api-token-auth/... → `${BACKEND}/api-token-auth/...`
        '/api-token-auth/': {
          target: BACKEND,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
