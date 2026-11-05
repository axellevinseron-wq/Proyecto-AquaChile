import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  // El puerto del servidor Express se puede cambiar con PORT en el archivo .env
  const env = loadEnv(mode, process.cwd(), '')
  const puertoApi = env.PORT || 3001

  return {
    plugins: [react()],
    server: {
      // En desarrollo, las peticiones a /api se reenvían al servidor Express.
      proxy: {
        '/api': `http://localhost:${puertoApi}`,
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      css: false,
      // Los tests de server/test usan el ejecutor de Node (npm run test:server).
      include: ['src/**/*.test.{js,jsx}'],
    },
  }
})
