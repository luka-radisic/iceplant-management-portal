// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load your VITE_BACKEND_URL from the env injected by Docker Compose
  const env = loadEnv(mode, process.cwd(), '')
  const BACKEND = env.VITE_BACKEND_URL || 'http://backend:8000'

  return {
    plugins: [react()],
    server: {
      host: true,    // allow 0.0.0.0 binding
      port: 5173,
      proxy: {
        // any /api/... → forward to Django (strip the /api prefix)
        '/api/': {
          target: BACKEND,
          changeOrigin: true,
          secure: false,
          rewrite: path => path.replace(/^\/api/, '')
        },
        // /api-token-auth/ → forward directly to Django token endpoint
        '/api-token-auth/': {
          target: BACKEND,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
