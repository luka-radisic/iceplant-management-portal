import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const BACKEND = env.VITE_BACKEND_URL

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        // forward everything under /api to your Django backend
        '/api': {
          target: BACKEND,
          changeOrigin: true,
          secure: false,
        },
        // forward login requests to the Django backend
        '/api-token-auth': {
          target: BACKEND,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})