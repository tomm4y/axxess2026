import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
            tailwindcss()
  ],
  server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      "/api": {
        target: "http://localhost:3000/", // your backend port
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: "http://localhost:3000/", // your backend port
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
      "/create_room": {
        target: "http://localhost:3000/",
        changeOrigin: true,
      },
    },
  },
})