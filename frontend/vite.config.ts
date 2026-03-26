import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/cosmetics': 'http://localhost:8000',
      '/recipes': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
    }
  }
})
