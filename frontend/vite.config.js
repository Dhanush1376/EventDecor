import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import { VitePWA } from 'vite-plugin-pwa'

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
    // VitePWA({...})
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
            if (id.includes('react-dom') || id.includes('@hot-loader/react-dom')) {
              return 'react-dom';
            }
            if (id.includes('react-router') || id.includes('react-router-dom')) {
              return 'react-router';
            }
            if (id.includes('react')) {
              return 'react';
            }
            if (id.includes('@sentry')) {
              return 'sentry';
            }
            if (id.includes('@tanstack') || id.includes('react-query')) {
              return 'tanstack-query';
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion';
            }
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('leaflet')) {
              return 'leaflet';
            }
            if (id.includes('lucide-react')) {
              return 'lucide-icons';
            }
            if (id.includes('logrocket')) {
              return 'logrocket';
            }
            return 'vendor';
          }
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
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
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
