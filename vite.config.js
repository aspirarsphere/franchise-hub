import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { writeFileSync } from 'fs'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'app-icon.png'],
      manifest: {
        name: 'VeaChoc Franchise Hub',
        short_name: 'VeaChoc Hub',
        description: 'Franchise CRM for VeaChoc by Aspirar Sphere Pvt. Ltd.',
        theme_color: '#700000',
        background_color: '#FDFBF7',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'app-icon.png', sizes: '192x192', type: 'image/png' },
          { src: 'app-icon.png', sizes: '512x512', type: 'image/png' },
          { src: 'app-icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['version.json'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/nqucslzdeesvalhdfcdr\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          }
        ]
      }
    }),
    // Generate version.json on every build so the app can detect new deployments
    {
      name: 'generate-version',
      apply: 'build',
      closeBundle() {
        writeFileSync('dist/version.json', JSON.stringify({ v: Date.now() }))
      }
    },
    // Force-write manifest last to ensure app-icon.png is used regardless of VitePWA cache
    {
      name: 'override-manifest',
      apply: 'build',
      closeBundle() {
        writeFileSync('dist/manifest.webmanifest', JSON.stringify({
          name: 'VeaChoc Franchise Hub',
          short_name: 'VeaChoc Hub',
          description: 'VeaChoc Franchise CRM',
          start_url: '/',
          display: 'standalone',
          background_color: '#FDFBF7',
          theme_color: '#700000',
          lang: 'en',
          scope: '/',
          orientation: 'portrait',
          icons: [
            { src: 'app-icon.png', sizes: '192x192', type: 'image/png' },
            { src: 'app-icon.png', sizes: '512x512', type: 'image/png' },
            { src: 'app-icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' }
          ]
        }))
      }
    }
  ]
})
