import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const buildId =
  process.env.VITE_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.RENDER_GIT_COMMIT?.slice(0, 12) ||
  String(Date.now());

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // DISABLED TO PREVENT AGGRESSIVE CACHING
      includeAssets: ['favicon.png', 'favicon.ico', 'manifest.json', 'robots.txt', 'sitemap.xml', 'og-image.jpg', 'og-image.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp,avif}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(js|css)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'shell-chunks',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/assets\/.*\.(png|jpg|jpeg|svg|webp|avif|woff2?)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'shell-static',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/api/') ||
              url.hostname.includes('onrender.com') ||
              url.hostname.includes('razorpay.com'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],

  // ─── ESBuild Optimization ───
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },

  // ─── Build Optimization ───
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',

    // Enable minification with the default native minifier
    minify: true,

    // Source maps for production debugging (hidden from users)
    sourcemap: 'hidden',

    // CSS code splitting
    cssCodeSplit: true,

    // Warn earlier than default — audit vendor chunks with npm run build:report
    chunkSizeWarningLimit: 300,

    // Rollup options for manual chunk splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom')) return 'vendor-router';
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('leaflet')) return 'vendor-maps';
            if (id.includes('qrcode') || id.includes('react-barcode')) return 'vendor-codes';
            if (id.includes('socket.io-client')) return 'vendor-socket';
            if (id.includes('axios')) return 'vendor-axios';
            if (id.includes('react-hot-toast') || id.includes('lucide-react')) return 'vendor-ui';
            if (id.includes('@sentry')) return 'vendor-sentry';
            return 'vendor-others';
          }
          // Admin routes use React.lazy() — do not merge into a single admin-pages chunk
        },
        // Asset file naming for long-term caching
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop() || '';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(extType)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(extType)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },

  // ─── Development Server ───
  server: {
    port: 5173,
    strictPort: false,
    host: true,
  },

  // ─── Preview Server ───
  preview: {
    port: 4173,
    host: true,
  },

  // ─── Performance Optimizations ───
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
  },

  // ─── Testing ───
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
