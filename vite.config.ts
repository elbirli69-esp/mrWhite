import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { stayCalmApiPlugin } from './scripts/staycalm-api-plugin.js';
import { bulardoApiPlugin } from './scripts/bulardo-api-plugin.js';
import { hablayaApiPlugin } from './scripts/hablaya-api-plugin.js';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    stayCalmApiPlugin(),
    bulardoApiPlugin(),
    hablayaApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Juegos de palabras · stayCalm · bulardoCreator',
        short_name: 'Apps',
        description: 'Mr White, Camaleón, Spyfall, Heads Up, Just One y más.',
        theme_color: '#0B0B0D',
        background_color: '#0B0B0D',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        // Modelos Whisper / ONNX se descargan bajo demanda (no precachear)
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname.includes('huggingface.co') ||
              url.hostname.includes('hf.co') ||
              url.pathname.includes('.onnx'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'hablaya-whisper-models',
              expiration: {
                maxEntries: 32,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
});
