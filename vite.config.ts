import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/proxy-fetch': {
        target: 'https://recipesaurus-api.andreay226.workers.dev',
        changeOrigin: true,
      },
    },
  },
})
