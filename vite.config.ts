import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { stayCalmApiPlugin } from './scripts/staycalm-api-plugin.js';
import { bulardoApiPlugin } from './scripts/bulardo-api-plugin.js';
import { hablayaApiPlugin } from './scripts/hablaya-api-plugin.js';
import { snakeoilApiPlugin } from './scripts/snakeoil-api-plugin.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(rootDir, 'shared'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    stayCalmApiPlugin(),
    bulardoApiPlugin(),
    hablayaApiPlugin(),
    snakeoilApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mesa Móvil',
        short_name: 'Mesa Móvil',
        description:
          'El Impostor, El Intruso, Pista y número, Bote de ideas, Café o té, Cinco letras, Vende humo, ¿Dónde estamos?, En la frente, Sin repetir y más.',
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
        // No precachear el bundle Whisper (~0.9 MB) ni el WASM ONNX: se piden al usar Habla ya.
        globIgnores: ['**/transformers.web-*.js', '**/ort-wasm-*.wasm'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/assets\//],
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              /\/assets\/transformers\.web-/i.test(url.pathname) ||
              /\/assets\/ort-wasm-/i.test(url.pathname),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hablaya-transformers-runtime',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
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
