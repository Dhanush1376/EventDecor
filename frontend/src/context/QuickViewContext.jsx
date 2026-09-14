import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { QuickViewModal } from '../components/ui/QuickViewModal';

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

  const contextValue = useMemo(
    () => ({ openQuickView, closeQuickView }),
    [openQuickView, closeQuickView],
  );

  return (
    <QuickViewContext.Provider value={contextValue}>
      {children}
      {isOpen && activeProduct && (
        <QuickViewModal product={activeProduct} isOpen={isOpen} onClose={closeQuickView} />
      )}
    </QuickViewContext.Provider>
  );
}
