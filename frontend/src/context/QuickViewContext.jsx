import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  Suspense,
} from 'react';
import { lazyWithRetry as lazy } from '../utils/performance/lazyWithRetry';

// The modal (~24 KB) only renders after a click, so it stays out of the entry chunk.
// It is prefetched once the browser is idle so the first open is instant.
const loadQuickViewModal = () => import('../components/ui/QuickViewModal');
const QuickViewModal = lazy(() =>
  loadQuickViewModal().then((m) => ({ default: m.QuickViewModal })),
);

const QuickViewContext = createContext();

export function useQuickView() {
  const context = useContext(QuickViewContext);
  if (!context) {
    throw new Error('useQuickView must be used within a QuickViewProvider');
  }
  return context;
}

export function QuickViewProvider({ children }) {
  const [activeProduct, setActiveProduct] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const openQuickView = useCallback((e, product) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    setActiveProduct(product);
    setIsOpen(true);
  }, []);

  const closeQuickView = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const prefetch = () => loadQuickViewModal().catch(() => {});
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(prefetch, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(prefetch, 3000);
    return () => clearTimeout(t);
  }, []);

  const contextValue = useMemo(
    () => ({ openQuickView, closeQuickView }),
    [openQuickView, closeQuickView],
  );

  return (
    <QuickViewContext.Provider value={contextValue}>
      {children}
      {isOpen && activeProduct && (
        <Suspense fallback={null}>
          <QuickViewModal product={activeProduct} isOpen={isOpen} onClose={closeQuickView} />
        </Suspense>
      )}
    </QuickViewContext.Provider>
  );
}
