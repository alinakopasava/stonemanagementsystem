import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    /*
     * Offline for the installation crew.
     *
     * A cemetery is often out of range of a mast, and until now that meant the
     * page would not even load: every visit fetches the application itself from
     * the server first. The service worker keeps that shell on the phone, so the
     * crew opens the worklist they synced in the office and reads the job.
     *
     * Only what the worklist needs is precached. The 3D viewer, the fonts it
     * engraves with and the 24 MB background-removal model belong to the
     * configurator, which nobody opens on a grave, and precaching those would
     * push tens of megabytes onto a phone over mobile data.
     *
     * Read-only by design: filing a report offline needs a queue, conflict
     * rules and background sync, which is the mobile application named among
     * the plans, not this.
     */
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'SZK — system zarządzania zakładem kamieniarskim',
        short_name: 'SZK',
        start_url: '/installer',
        display: 'standalone',
        background_color: '#f5f5f4',
        theme_color: '#1c1917',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['index.html', 'assets/index-*.{js,css}'],
        // A cold start offline lands on the cached shell, and the router takes
        // it from there. API calls must never be answered with an HTML page.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Matched by path, not by origin: the API answers on its own host
            // in production and through the dev proxy locally.
            urlPattern: ({ url }) => url.pathname === '/api/installation-cards',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'installer-worklist',
              // A phone with one bar is worse than no bars: without a ceiling
              // the request hangs instead of falling back to what we have.
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] }
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@domain': path.resolve(__dirname, 'src/domain'),
      '@application': path.resolve(__dirname, 'src/application'),
      '@infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@presentation': path.resolve(__dirname, 'src/presentation')
    }
  }
});
