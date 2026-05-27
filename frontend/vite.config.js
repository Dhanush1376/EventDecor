import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const buildId =
  process.env.VITE_BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.RENDER_GIT_COMMIT?.slice(0, 12) ||
  String(Date.now());

export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
  },
  plugins: [react(), tailwindcss()],

  esbuild: {
    drop: ['console', 'debugger'],
  },

  build: {
    target: 'es2015',
    minify: true,
    sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 300,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.includes('/src/admin/')) return 'admin';
            if (id.includes('/src/components/dashboard/')) return 'dashboard-tabs';
            if (id.includes('/src/pages/CustomOrders')) return 'custom-orders';
            if (id.includes('/src/pages/EventDetail')) return 'event-detail';
            return undefined;
          }

          if (id.includes('react-dom') || id.includes('@hot-loader/react-dom')) {
            return 'react-dom';
          }
          if (id.includes('react-router') || id.includes('react-router-dom')) {
            return 'router';
          }
          if (id.includes('react')) {
            return 'react';
          }
          if (id.includes('framer-motion')) {
            return 'animations';
          }
          if (id.includes('recharts')) {
            return 'charts';
          }
          if (id.includes('leaflet')) {
            return 'maps';
          }
          if (
            id.includes('quill') ||
            id.includes('slate') ||
            id.includes('draft-js') ||
            id.includes('codemirror') ||
            id.includes('prosemirror')
          ) {
            return 'editor';
          }
          if (id.includes('@sentry')) return 'sentry';
          if (id.includes('@tanstack') || id.includes('react-query')) return 'tanstack-query';
          if (id.includes('lucide-react')) return 'lucide-icons';
          if (id.includes('logrocket')) return 'logrocket';
          return 'vendor';
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
            console.warn('[Vite Proxy Error] Failed to connect to backend target:', err.message);
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
})
