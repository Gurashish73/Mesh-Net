import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', 
      includeAssets: [], 
      manifest: {
        name: 'MeshNet Emergency',
        short_name: 'MeshNet',
        description: 'Decentralized offline mesh network for disaster zones.',
        theme_color: '#0A110D', 
        background_color: '#050B14',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png', 
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png', 
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html'
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  },
  // --- FIX: ALLOW LOCALTUNNEL HOSTS ---
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true // Tells Vite's security engine to let the loca.lt tunnel through
  }
})