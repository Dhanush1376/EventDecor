import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProductCard } from '../../../components/shared/ProductCard';
import { productService } from '../../../services/api/productService';

export function ProductSelectionBottomSheet({ isOpen, onClose, onSelect, selectedProductId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && products.length === 0) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Fetch products. We might want to pass some basic params if needed
      const res = await productService.getAll({ limit: 50 });
      if (res.success) {
        setProducts(res.data?.data || res.data?.items || res.data || []);
      } else {
        setProducts(res.data || res.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products for exchange', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed inset-x-0 bottom-0 z-[100] bg-surface-bright rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Handle */}
            <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-outline-variant/50 rounded-full" />
            </div>

            <div className="px-6 pb-4 border-b border-outline-variant/20 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-display font-medium text-on-surface">
                  Choose Replacement
                </h2>
                <p className="text-xs text-secondary mt-1">Select a product from our catalog</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-secondary hover:text-on-surface transition-colors border-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-outline-variant/20 bg-surface-container-lowest sticky top-0 z-10">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search products, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low rounded-xl border-none focus:ring-1 focus:ring-black text-sm outline-none transition-all"
                />
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[4/5] bg-surface-container-low rounded-2xl mb-3" />
                      <div className="h-4 bg-surface-container-low rounded w-3/4 mb-2" />
                      <div className="h-4 bg-surface-container-low rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProductId === product._id;
                    return (
                      <div
                        key={product._id}
                        className="relative"
                        onClickCapture={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelect(product);
                        }}
                      >
                        <div
                          className={`transition-all duration-300 cursor-pointer ${isSelected ? 'scale-[0.98]' : 'hover:scale-[1.02]'}`}
                        >
                          {/* Force pointer-events-none on ProductCard to ensure our capture works reliably across all child elements */}
                          <div className="pointer-events-none">
                            <ProductCard
                              {...product}
                              hideDetails={false}
                              selectionMode={true}
                              isSelected={isSelected}
                              compact={false}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-3 opacity-50">
                    search_off
                  </span>
                  <p>No products found matching "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Sticky Bottom Actions */}
            <div className="p-4 border-t border-outline-variant/20 bg-surface-bright flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-[32px] text-xs font-bold uppercase tracking-widest text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors border-0 cursor-pointer"
              >
                Cancel
              </button>
              {selectedProductId && (
                <button
                  onClick={onClose}
                  className="px-8 py-2.5 rounded-[32px] text-xs font-bold uppercase tracking-widest bg-black text-white hover:bg-gray-900 transition-colors shadow-lg flex items-center gap-2 border-0 cursor-pointer"
                >
                  Confirm Selection
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
