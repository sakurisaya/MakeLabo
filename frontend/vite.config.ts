import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/cosmetics': 'http://localhost:8000',
      '/recipes': 'http://localhost:8000',
      '/upload-image': 'http://localhost:8000',
    }
  }
})
