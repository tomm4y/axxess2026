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
        target: "http://127.0.0.1:3000/", // your backend port
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: "http://127.0.0.1:3000/", // your backend port
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "ws://127.0.0.1:3000",
        ws: true,
      },
      "/create_room": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
})