import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' hem GitHub Pages alt dizininde hem Capacitor'da çalışır.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'gizlilik.html'],
      manifest: {
        name: 'Takvim Yaprağı',
        short_name: 'Takvim Yaprağı',
        description: 'Her gün tarihte o gün olanlar, günün bilgisi ve üç soruluk quiz.',
        lang: 'tr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#ECEEF1',
        theme_color: '#1C2533',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/gizlilik\.html$/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/*.woff'],
      },
    }),
  ],
})
