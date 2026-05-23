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
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },

  build: {
    target: 'es2020',
    minify: true,
    sourcemap: 'hidden',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.includes('/src/admin/')) return 'admin';
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
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
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
