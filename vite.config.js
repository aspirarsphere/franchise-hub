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
      includeAssets: ['favicon.ico'],
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
          { src: 'logo.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'logo.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
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
    }
  ]
})
