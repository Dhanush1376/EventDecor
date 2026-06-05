import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
    drop: ['debugger'],
    pure: ['console.log'],
  },

  build: {
    target: 'es2020',
    cssTarget: 'chrome95',
    minify: true,
    cssMinify: 'lightningcss',
    sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 300,
    reportCompressedSize: true,
    assetsInlineLimit: 2048,
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        // Preload only react/router critical chunks for initial load
        return deps.filter(
          (dep) =>
            dep.includes('react') ||
            dep.includes('router') ||
            dep.includes('app-') ||
            dep.includes('main'),
        );
      },
    },
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            // Feature-level splitting for app code (avoid monolithic chunks)
            if (
              id.includes('/src/admin/layouts/') ||
              id.includes('/src/admin/context/') ||
              id.includes('/src/admin/components/AdminSidebar') ||
              id.includes('/src/admin/components/AdminTopBar')
            ) {
              return 'admin-core';
            }
            if (id.includes('/src/admin/pages/AdminAnalytics')) return 'admin-analytics';
            if (id.includes('/src/admin/pages/AdminRecommendationAnalytics'))
              return 'admin-recommendations';
            if (id.includes('/src/admin/pages/AdminDashboard')) return 'admin-dashboard';
            if (
              id.includes('/src/admin/pages/AdminProducts') ||
              id.includes('/src/admin/pages/AdminAddProduct') ||
              id.includes('/src/admin/pages/AdminCategories') ||
              id.includes('/src/admin/pages/AdminInventory')
            ) {
              return 'admin-catalog';
            }
            if (
              id.includes('/src/admin/pages/AdminOrders') ||
              id.includes('/src/admin/pages/AdminOrderDetail') ||
              id.includes('/src/admin/pages/AdminPayments') ||
              id.includes('/src/admin/pages/AdminBookingDetail')
            ) {
              return 'admin-orders';
            }
            if (
              id.includes('/src/admin/pages/AdminContent') ||
              id.includes('/src/admin/pages/AdminLayouts') ||
              id.includes('/src/admin/pages/AdminGallery') ||
              id.includes('/src/admin/pages/AdminEvents')
            ) {
              return 'admin-content';
            }
            if (
              id.includes('/src/admin/pages/AdminCustomers') ||
              id.includes('/src/admin/pages/AdminCustomerProfile') ||
              id.includes('/src/admin/pages/AdminTeam') ||
              id.includes('/src/admin/pages/AdminSystemUsers') ||
              id.includes('/src/admin/pages/AdminSettings') ||
              id.includes('/src/admin/pages/AdminConfig') ||
              id.includes('/src/admin/pages/AdminCampaigns') ||
              id.includes('/src/admin/pages/AdminNotifications') ||
              id.includes('/src/admin/pages/AdminCoupons') ||
              id.includes('/src/admin/pages/AdminCreateCoupon') ||
              id.includes('/src/admin/pages/AdminInquiries')
            ) {
              return 'admin-management';
            }
            if (id.includes('/src/admin/pages/')) {
              return 'admin-pages';
            }
            if (
              id.includes('/src/checkout/CheckoutProvider') ||
              id.includes('/src/pages/Checkout')
            ) {
              return 'checkout-core';
            }
            if (
              id.includes('/src/checkout/CheckoutAddressStep') ||
              id.includes('/src/checkout/CheckoutPaymentStep') ||
              id.includes('/src/hooks/useRazorpay')
            ) {
              return 'checkout-payment';
            }
            if (
              id.includes('/src/components/sections/RecommendationSystem') ||
              id.includes('/src/services/recommendationService') ||
              id.includes('/src/components/sections/PersonalizedFeed')
            ) {
              return 'recommendations';
            }
            if (id.includes('/src/pages/Dashboard') || id.includes('/src/hooks/useDashboardData')) {
              return 'dashboard';
            }
            if (id.includes('/src/pages/CustomOrders')) return 'custom-orders';
            if (id.includes('/src/pages/EventDetail')) return 'event-detail';
            return undefined;
          }

          if (id.includes('node_modules/react-dom/') || id.includes('@hot-loader/react-dom')) {
            return 'react-dom';
          }
          if (
            id.includes('node_modules/react-router/') ||
            id.includes('node_modules/react-router-dom/')
          ) {
            return 'router';
          }
          if (id.includes('node_modules/react/')) {
            return 'react';
          }
          if (id.includes('node_modules/framer-motion/')) {
            return 'animations';
          }
          if (
            /node_modules[\\/](recharts|victory-vendor)/.test(id) ||
            /node_modules[\\/]d3-[^\\/]+/.test(id)
          ) {
            return 'charts';
          }
          if (id.includes('node_modules/leaflet/') || id.includes('node_modules/react-leaflet/')) {
            return 'maps';
          }
          if (
            id.includes('node_modules/quill') ||
            id.includes('node_modules/slate') ||
            id.includes('node_modules/draft-js') ||
            id.includes('node_modules/codemirror') ||
            id.includes('node_modules/prosemirror')
          ) {
            return 'editor';
          }
          if (id.includes('node_modules/@sentry')) return 'sentry';
          if (id.includes('node_modules/@tanstack') || id.includes('node_modules/react-query'))
            return 'tanstack-query';
          if (id.includes('node_modules/socket.io-client')) return 'socket-io';
          if (
            id.includes('node_modules/canvas-confetti') ||
            id.includes('node_modules/qrcode.react') ||
            id.includes('node_modules/react-barcode')
          ) {
            return 'celebration';
          }
          if (id.includes('node_modules/axios')) return 'http-client';
          if (id.includes('node_modules/lucide-react')) return 'lucide-icons';
          if (id.includes('node_modules/logrocket')) return 'logrocket';
          if (id.includes('node_modules/lodash')) return 'lodash';
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/moment'))
            return 'date-utils';
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
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'leaflet',
      'react-leaflet',
    ],
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
