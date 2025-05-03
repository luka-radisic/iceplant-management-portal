// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const BACKEND = env.VITE_BACKEND_URL || 'http://backend:8000'

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        // Keep the /api prefix intact
        '/api/': {
          target: BACKEND,
          changeOrigin: true,
          secure: false,
        },
        // Token auth endpoint
        '/api-token-auth/': {
          target: BACKEND,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
