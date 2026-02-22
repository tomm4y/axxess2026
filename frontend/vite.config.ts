import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(),
            tailwindcss()
  ],
  server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      "/api": {
        target: "http://localhost:3000/",
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: "http://localhost:3000/",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
      "/create_room": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/create_session": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/debug": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
})