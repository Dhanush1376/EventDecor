import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

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

    // Chunk size warning limit
    chunkSizeWarningLimit: 500,

    // Rollup options for manual chunk splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom')) return 'vendor-router';
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('react-hot-toast') || id.includes('lucide-react')) return 'vendor-ui';
            return 'vendor-others';
          }
          if (id.includes('src/admin/')) {
            return 'admin-portal';
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
