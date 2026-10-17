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
        name: 'Mindmash',
        short_name: 'Mindmash',
        description: 'Her gün tarihte o gün olanlar, günün bilgisi, günün kelimesi ve videolarla açılan üç soru.',
        lang: 'tr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#F2EDE3',
        theme_color: '#F2EDE3',
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
        globIgnores: ['**/*.woff', '**/*-cyrillic-*', '**/*-vietnamese-*'],
      },
    }),
  ],
})
