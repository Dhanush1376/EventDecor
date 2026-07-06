import React, { Suspense, useState, useEffect } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import toast, { Toaster, ToastBar } from 'react-hot-toast';
import debounce from 'lodash.debounce';

import { AppProviders } from './providers/AppProviders';
import { AppRoutes } from './routes/AppRoutes';
import { ensureCsrfToken } from './services/api';
import { prefetchManager } from './utils/performance/prefetchManager';
import { queryClient } from './config/queryClient';
import { hydrateQueryClientCache, subscribeToQueryCache } from './utils/performance/queryPersister';
import { lazyWithRetry as lazy } from './utils/performance/lazyWithRetry';
const SlowConnectionBanner = lazy(() =>
  import('./components/ui/SlowConnectionBanner').then((m) => ({ default: m.SlowConnectionBanner })),
);

hydrateQueryClientCache(queryClient);

import { AuthModals } from './components/auth/AuthModals';

function App() {
  const [isMounted, setIsMounted] = useState(false);
  const [toastPosition, setToastPosition] = useState('bottom-right');

  useEffect(() => {
    setIsMounted(true);

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => ensureCsrfToken().catch(() => {}));
    } else {
      setTimeout(() => ensureCsrfToken().catch(() => {}), 1000);
    }

    prefetchManager.setQueryClient(queryClient);
    const unsubscribe = subscribeToQueryCache(queryClient);

    const handleResize = debounce(() => {
      setToastPosition(window.innerWidth < 768 ? 'top-center' : 'bottom-right');
    }, 250);
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel();
      unsubscribe();
    };
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <AppProviders>
        {isMounted && (
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-surface focus:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Skip to main content
          </a>
        )}
        {isMounted && (
          <Suspense fallback={null}>
            <SlowConnectionBanner />
          </Suspense>
        )}

        {isMounted && (
          <Toaster
            position={toastPosition}
            toastOptions={{
              duration: 3500,
              style: {
                background: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                color: '#000000',
                fontSize: '12px',
                fontFamily: 'var(--font-body)',
                fontWeight: '700',
                borderRadius: 'var(--radius-full)',
                padding: '12px 24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4)',
              },
              success: { iconTheme: { primary: '#16a34a', secondary: '#ffffff' } },
            }}
          >
            {(t) => (
              <m.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 1, bottom: 0 }}
                onDragEnd={(e, info) => {
                  if (info.offset.y < -20 || info.offset.y > 20) {
                    toast.dismiss(t.id);
                  }
                }}
                onClick={() => toast.dismiss(t.id)}
                className="cursor-pointer active:scale-95 transition-transform touch-none"
              >
                <ToastBar toast={t} />
              </m.div>
            )}
          </Toaster>
        )}

        {isMounted && <AuthModals />}

        <AppRoutes />
      </AppProviders>
    </LazyMotion>
  );
}

export default App;
