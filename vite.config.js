import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Classic-Checkers/',
  plugins: [react()],
  server: {
    allowedHosts: ['fresh-pillows-kick.loca.lt']
  }
})
