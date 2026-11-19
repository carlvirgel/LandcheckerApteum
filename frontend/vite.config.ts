import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The SPA always talks to the API on its own origin (/api, /cable). In development
// Vite proxies those paths to Rails; in production nginx does the same. This avoids
// CORS preflights and keeps the WebSocket on the same origin as the page.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Host is passed through unchanged (no changeOrigin) so Rails sees the browser's
    // host, which its development host authorization allows.
    proxy: {
      '/api': { target: apiTarget },
      '/cable': { target: apiTarget, ws: true },
    },
  },
})
