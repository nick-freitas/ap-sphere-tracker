import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ap-sphere-tracker/',
  test: {
    environment: 'node',
  },
})
