import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // works served from any sub-path (e.g. GitHub Pages project site)
  server: { proxy: { '/api': 'http://localhost:5000' } },
})
