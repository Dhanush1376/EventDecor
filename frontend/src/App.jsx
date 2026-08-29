import React, { Suspense, useState, useEffect } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';

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

import { GlobalNotificationToast } from './components/ui/GlobalNotificationToast';

function App() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => ensureCsrfToken().catch(() => {}));
    } else {
      setTimeout(() => ensureCsrfToken().catch(() => {}), 1000);
    }

    prefetchManager.setQueryClient(queryClient);
    const unsubscribe = subscribeToQueryCache(queryClient);

    return () => {
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

        {isMounted && <AuthModals />}

        {isMounted && <GlobalNotificationToast />}

        <AppRoutes />
      </AppProviders>
    </LazyMotion>
  );
}

export default App;
