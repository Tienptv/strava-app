import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import ViteRestart from 'vite-plugin-restart'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      ViteRestart({ restart: ['.env'] })
    ],
    server: {
      watch: {
        ignored: ['**/Storage/**', '**/.chrome_session/**', '**/scraper-error.*']
      },
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
