import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';

const buildId =
  process.env.VITE_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.RENDER_GIT_COMMIT?.slice(0, 12) ||
  String(Date.now());

export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
  },
  plugins: [
    react(),
    tailwindcss(),
    visualizer({ filename: 'stats.html', gzipSize: true, template: 'treemap' }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
    viteCompression({ algorithm: 'gzip', ext: '.gz' }),
  ],

  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.warn'],
  },

  build: {
    target: 'es2022',
    cssTarget: 'chrome105',
    minify: true,
    cssMinify: 'lightningcss',
    sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline',
    cssCodeSplit: true,
    // Bundle Size Budget: Warn at 250KB per chunk to catch regressions early.
    // Target: initial JS load < 500KB total (framework + state-networking + main).
    chunkSizeWarningLimit: 250,
    reportCompressedSize: true,
    assetsInlineLimit: 4096,
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps, { hostId: _hostId, hostType: _hostType }) => {
        // Preload only react/router critical chunks for initial load
        return deps.filter(
          (dep) =>
            dep.includes('react') ||
            dep.includes('router') ||
            dep.includes('framework') ||
            dep.includes('main'),
        );
      },
    },
    rollupOptions: {
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
      },
      output: {
        manualChunks(id) {
          // Group 1: Core Framework (React, Router)
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'framework';
          }

          // Animations
          if (id.includes('node_modules/framer-motion/')) {
            return 'animation';
          }

          // Group 2: State & Networking
          if (
            id.includes('node_modules/@tanstack/') ||
            id.includes('node_modules/axios/') ||
            id.includes('node_modules/socket.io-client/') ||
            id.includes('node_modules/idb/')
          ) {
            return 'state-networking';
          }

          // Group 3: Observability (Sentry)
          if (id.includes('node_modules/@sentry/')) {
            return 'observability';
          }

          // Analytics
          if (id.includes('node_modules/logrocket/')) {
            return 'analytics';
          }

          // Group 4: Heavy async tools (Keep them isolated so they don't block main thread)
          if (id.includes('node_modules/leaflet/') || id.includes('node_modules/react-leaflet/')) {
            return 'maps';
          }
          if (/node_modules[\\/](chart\.js|recharts|victory-vendor|d3-[^\\/]+)/.test(id)) {
            return 'charts';
          }
          if (/node_modules[\\/](quill|slate|draft-js|codemirror|prosemirror)/.test(id)) {
            return 'editor';
          }

          // Group 5: UI Utilities (Icons, Dates, Lodash, DOMPurify)
          if (
            id.includes('node_modules/lucide-react/') ||
            id.includes('node_modules/date-fns/') ||
            id.includes('node_modules/moment/') ||
            id.includes('node_modules/lodash/') ||
            id.includes('node_modules/canvas-confetti/') ||
            id.includes('node_modules/qrcode.react/') ||
            id.includes('node_modules/react-barcode/') ||
            id.includes('node_modules/dompurify/')
          ) {
            return 'ui-utils';
          }

          // Let Vite handle the rest automatically
        },
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

  server: {
    port: 5173,
    strictPort: false,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            if (
              err.code === 'ECONNREFUSED' ||
              err.code === 'ECONNABORTED' ||
              err.code === 'ECONNRESET'
            ) {
              return; // Suppress expected dev proxy errors
            }
            console.warn('[Vite Proxy Error] Failed to connect to backend target:', err.message);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            socket.on('error', (err) => {
              if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') return;
              console.error('[Vite WS Proxy Error]', err.message);
            });
          });
        },
      },
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            if (
              err.code === 'ECONNREFUSED' ||
              err.code === 'ECONNABORTED' ||
              err.code === 'ECONNRESET'
            ) {
              return; // Suppress expected dev proxy errors
            }
            console.warn('[Vite Proxy Error] Failed to connect to backend target:', err.message);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket, options, head) => {
            // Remove noisy default listeners that dump stack traces on expected socket closes
            socket.removeAllListeners('error');
            socket.on('error', (err) => {
              if (err.code === 'ECONNABORTED' || err.code === 'ECONNRESET') return;
              console.error('[Vite WS Proxy Error]', err.message);
            });
          });
        },
      },
    },
  },

  preview: {
    port: 4173,
    host: true,
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});

// Force Vite Cache Invalidation - Triggered at 2026-06-27
