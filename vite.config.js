import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-prototypes',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Serve /1/ through /5/ as static prototype pages
          const match = req.url.match(/^\/archipelago-sphere\/(\d+)\/?$/)
          if (match) {
            req.url = `/archipelago-sphere/${match[1]}/index.html`
          }
          next()
        })
      },
    },
  ],
  base: '/archipelago-sphere/',
  test: {
    environment: 'node',
  },
})
