import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const FilterSection = ({ title, id, isOpen, onToggle, children }) => (
  <div className="mb-5 border-b border-outline-variant/10 pb-4 last:border-0 last:pb-0">
    <button
      onClick={onToggle}
      className="w-full flex justify-between items-center py-1 text-left font-label text-label-md text-on-surface hover:text-primary transition-colors group"
    >
      <span className="uppercase tracking-[0.2em] font-bold">{title}</span>
      <span
        className={`material-symbols-outlined text-secondary transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}
      >
        expand_more
      </span>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 1, 0.2, 1] }}
          className="overflow-hidden"
        >
          <div className="mt-2 space-y-1.5 pl-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const Checkbox = ({ label, count, type, isChecked, onChange }) => {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={onChange}
            className="peer appearance-none h-4.5 w-4.5 border border-outline-variant/50 rounded-sm bg-transparent checked:bg-primary checked:border-primary transition-all cursor-pointer focus:ring-2 focus:ring-primary/20"
          />
          <span className="absolute material-symbols-outlined text-white text-[14px] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
            check
          </span>
        </div>
        <span
          className={`font-body text-[14px] md:text-[15px] transition-colors ${isChecked ? 'text-primary font-semibold' : 'text-on-surface/60 group-hover:text-on-surface'}`}
        >
          {label}
        </span>
      </div>
      {count && <span className="font-label text-[10px] text-secondary/40 font-bold">{count}</span>}
    </label>
  );
};

export function EventFilterPanel({
  currentFilters,
  onToggleFilter,
  onClearAll,
  className = '',
  isOpen,
  onClose,
  sortBy,
  onSortChange,
  mobileSubtitle = 'Refine Event Scapes',
  categories = [],
  styles = [],
}) {
  const [activeSections, setActiveSections] = useState({
    sort: true,
    price: true,
    occasion: true,
    style: true,
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleSection = (section) => {
    setActiveSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const panelContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-outline-variant/30">
        <div className="flex flex-col">
          <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Filters</h2>
          {isOpen && (
            <span className="font-label text-[10px] text-primary uppercase tracking-[0.3em] mt-1">
              {mobileSubtitle}
            </span>
          )}
        </div>
        <button
          onClick={onClearAll}
          className="font-label text-[10px] uppercase tracking-widest text-secondary hover:text-primary transition-colors font-bold cursor-pointer underline underline-offset-4"
        >
          Clear All
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
        <FilterSection
          title="Sort By"
          id="sort"
          isOpen={activeSections.sort}
          onToggle={() => toggleSection('sort')}
        >
          {[
            { value: 'Popularity', label: 'Popularity' },
            { value: 'Price: Low to High', label: 'Price: Low to High' },
            { value: 'Price: High to Low', label: 'Price: High to Low' },
            { value: 'New Arrivals', label: 'New Arrivals' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`w-full flex items-center justify-between py-0.5 min-h-0 group ${sortBy === opt.value ? 'text-primary' : 'text-on-surface/60'}`}
            >
              <span
                className={`font-body text-[14px] md:text-[15px] transition-colors ${sortBy === opt.value ? 'font-semibold' : 'group-hover:text-on-surface'}`}
              >
                {opt.label}
              </span>
              {sortBy === opt.value && (
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              )}
            </button>
          ))}
        </FilterSection>

        <FilterSection
          title="Price Range"
          id="price"
          isOpen={activeSections.price}
          onToggle={() => toggleSection('price')}
        >
          <Checkbox
            type="price"
            label="Under ₹1,00,000"
            isChecked={currentFilters.price?.includes('Under ₹1,00,000')}
            onChange={() => onToggleFilter('price', 'Under ₹1,00,000')}
          />
          <Checkbox
            type="price"
            label="₹1,00,000 - ₹3,00,000"
            isChecked={currentFilters.price?.includes('₹1,00,000 - ₹3,00,000')}
            onChange={() => onToggleFilter('price', '₹1,00,000 - ₹3,00,000')}
          />
          <Checkbox
            type="price"
            label="₹3,00,000 - ₹5,00,000"
            isChecked={currentFilters.price?.includes('₹3,00,000 - ₹5,00,000')}
            onChange={() => onToggleFilter('price', '₹3,00,000 - ₹5,00,000')}
          />
          <Checkbox
            type="price"
            label="Over ₹5,00,000"
            isChecked={currentFilters.price?.includes('Over ₹5,00,000')}
            onChange={() => onToggleFilter('price', 'Over ₹5,00,000')}
          />
        </FilterSection>

        <FilterSection
          title="Occasion"
          id="occasion"
          isOpen={activeSections.occasion}
          onToggle={() => toggleSection('occasion')}
        >
          {categories
            .filter((c) => c !== 'All Occasions')
            .map((cat) => (
              <Checkbox
                key={cat}
                type="occasion"
                label={cat}
                isChecked={currentFilters.occasion?.includes(cat)}
                onChange={() => onToggleFilter('occasion', cat)}
              />
            ))}
        </FilterSection>

        <FilterSection
          title="Style"
          id="style"
          isOpen={activeSections.style}
          onToggle={() => toggleSection('style')}
        >
          {styles
            .filter((s) => s !== 'All Styles')
            .map((style) => (
              <Checkbox
                key={style}
                type="style"
                label={style}
                isChecked={currentFilters.style?.includes(style)}
                onChange={() => onToggleFilter('style', style)}
              />
            ))}
        </FilterSection>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Bottom Sheet Implementation */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="fixed inset-0 z-[1000] lg:hidden flex flex-col justify-end">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={onClose}
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />

                {/* Bottom Sheet Content */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{
                    type: 'spring',
                    damping: 32,
                    stiffness: 300,
                    mass: 0.8,
                  }}
                  className="relative w-full bg-surface rounded-t-[40px] p-6 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border-t border-outline-variant/10"
                >
                  {/* Handlebar for bottom sheet feel */}
                  <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mb-4 shrink-0" />

                  <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-on-surface hover:bg-black/10 transition-all z-10"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>

                  <div className="flex-1 overflow-y-auto no-scrollbar pt-2">{panelContent}</div>

                  {/* Bottom Action Bar */}
                  <div className="mt-6 pt-6 border-t border-outline-variant/20">
                    <button
                      onClick={onClose}
                      className="w-full bg-on-surface-variant text-surface py-4 rounded-full font-label text-[11px] uppercase tracking-widest font-bold shadow-xl hover:bg-primary transition-all active:scale-[0.98]"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex flex-col relative w-full ${className}`}>{panelContent}</div>
    </>
  );
}
