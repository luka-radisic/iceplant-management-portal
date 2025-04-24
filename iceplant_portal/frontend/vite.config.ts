export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // ⚠️ Change from 127.0.0.1 to localhost or actual IP
        changeOrigin: true,
      }
    }
  }
})
