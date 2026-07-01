import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const FilterSection = ({ title, id, children, activeSections, onToggle }) => (
  <div className="mb-5 border-b border-outline-variant/10 pb-4 last:border-0 last:pb-0">
    <button
      onClick={() => onToggle(id)}
      className="w-full flex justify-between items-center py-1 text-left font-label text-label-md text-on-surface hover:text-primary transition-colors group"
    >
      <span className="uppercase tracking-[0.2em] font-bold">{title}</span>
      <span
        className={`material-symbols-outlined text-secondary transition-transform duration-500 ${activeSections[id] ? 'rotate-180' : ''}`}
      >
        expand_more
      </span>
    </button>
    <AnimatePresence initial={false}>
      {activeSections[id] && (
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

const Checkbox = ({ label, count, type, currentFilters, onToggleFilter }) => {
  const isChecked = currentFilters[type]?.includes(label);
  return (
    <label className="flex items-center justify-between cursor-pointer group py-1.5 px-2 hover:bg-surface-container-low rounded-lg transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggleFilter(type, label)}
            className="peer appearance-none h-4.5 w-4.5 border border-outline-variant/50 rounded bg-transparent checked:bg-primary checked:border-primary transition-all cursor-pointer focus:ring-2 focus:ring-primary/20"
          />
          <span className="absolute material-symbols-outlined text-white text-[13px] opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity font-bold">
            check
          </span>
        </div>
        <span
          className={`font-body text-[14px] lg:text-[15px] transition-colors ${isChecked ? 'text-primary font-semibold' : 'text-on-surface/70 group-hover:text-on-surface'}`}
        >
          {label}
        </span>
      </div>
      {count && (
        <span className="font-label text-[10px] text-secondary/50 font-bold bg-surface-container border border-outline-variant/10 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </label>
  );
};

export function FilterPanel({
  filterGroups = [],
  currentFilters,
  onToggleFilter,
  onSetFilterValue,
  onClearAll,
  className = '',
  isOpen,
  onClose,
  sortBy,
  onSortChange,
  mobileSubtitle = 'Refine Collection',
}) {
  const [activeSections, setActiveSections] = useState({
    sort: true,
  });

  const [cumulativeOptions, setCumulativeOptions] = useState({});
  const [cumulativeGroups, setCumulativeGroups] = useState([]);

  // Initialize active sections for dynamic filters and build cumulative options
  useEffect(() => {
    if (filterGroups && filterGroups.length > 0) {
      setActiveSections((prev) => {
        const next = { ...prev };
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
        filterGroups.forEach((group, idx) => {
          if (next[group.id] === undefined) {
            next[group.id] = !isMobile || idx === 0;
          }
        });
        return next;
      });

      setCumulativeGroups((prev) => {
        const next = [...prev];
        filterGroups.forEach((fg) => {
          if (
            !next.find(
              (g) =>
                g.id.toLowerCase() === fg.id.toLowerCase() ||
                g.label.toLowerCase() === fg.label.toLowerCase(),
            )
          ) {
            next.push({ id: fg.id, label: fg.label });
          }
        });
        return next;
      });

      setCumulativeOptions((prev) => {
        const next = { ...prev };
        filterGroups.forEach((group) => {
          if (!next[group.id]) {
            next[group.id] = new Map();
          }
          const groupMap = new Map(next[group.id]);

          // Reset existing counts to 0 before applying new ones
          groupMap.forEach((opt, key) => {
            groupMap.set(key, { ...opt, count: 0 });
          });

          // Update with new options and counts
          if (group.options) {
            group.options.forEach((opt) => {
              groupMap.set(opt.value, opt);
            });
          }
          next[group.id] = groupMap;
        });
        return next;
      });
    }
  }, [filterGroups]);

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

  const renderCheckbox = (type, label, count = null) => (
    <Checkbox
      key={label}
      type={type}
      label={label}
      count={count}
      currentFilters={currentFilters}
      onToggleFilter={onToggleFilter}
    />
  );

  const panelContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-outline-variant/30">
        <div className="flex flex-col">
          <h2 className="font-label font-headline-md text-on-surface font-normal">Filters</h2>
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
          activeSections={activeSections}
          onToggle={toggleSection}
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
              className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg group transition-all duration-300 ${sortBy === opt.value ? 'bg-primary/5 text-primary' : 'text-on-surface/60 hover:bg-surface-container-low'}`}
            >
              <span
                className={`font-body text-[14px] lg:text-[15px] transition-colors ${sortBy === opt.value ? 'font-semibold' : 'group-hover:text-on-surface'}`}
              >
                {opt.label}
              </span>
              {sortBy === opt.value && (
                <span className="material-symbols-outlined text-[18px] text-primary animate-scale-in">
                  check_circle
                </span>
              )}
            </button>
          ))}
        </FilterSection>

        {cumulativeGroups.length > 0
          ? cumulativeGroups.map((group) => {
              // Use cumulative options to prevent items from disappearing when their count drops to 0
              const cumulativeGroupOptions = cumulativeOptions[group.id]
                ? Array.from(cumulativeOptions[group.id].values())
                : [];

              const selectedValues = currentFilters[group.id] || [];

              const finalOptionsMap = new Map();
              cumulativeGroupOptions.forEach((opt) => finalOptionsMap.set(opt.value, opt));

              selectedValues.forEach((val) => {
                if (!finalOptionsMap.has(val)) {
                  finalOptionsMap.set(val, { value: val, label: val, count: 0 }); // Retain selected
                }
              });

              const finalOptions = Array.from(finalOptionsMap.values());

              if (group.id === 'priceRange') {
                let maxPossible = 0;
                finalOptions.forEach((opt) => {
                  const parts = opt.value.split('-');
                  const maxVal = parts[1] ? parseInt(parts[1], 10) : 0;
                  if (maxVal > maxPossible) maxPossible = maxVal;
                });
                if (maxPossible === 0) maxPossible = 100000;

                const selectedValues = currentFilters[group.id] || [];
                let currentMax = maxPossible;
                if (selectedValues.length > 0) {
                  const parts = selectedValues[0].split('-');
                  if (parts[1]) currentMax = parseInt(parts[1], 10);
                }

                return (
                  <FilterSection
                    key={group.id}
                    title={group.label}
                    id={group.id}
                    activeSections={activeSections}
                    onToggle={toggleSection}
                  >
                    <div className="px-1 pt-4 pb-2">
                      <input
                        type="range"
                        min="0"
                        max={maxPossible}
                        step="500"
                        value={currentMax}
                        onChange={(e) => {
                          if (onSetFilterValue) {
                            const val = parseInt(e.target.value, 10);
                            if (val === maxPossible) {
                              onSetFilterValue(group.id, []);
                            } else {
                              onSetFilterValue(group.id, [`0-${val}`]);
                            }
                          }
                        }}
                        style={{
                          background: `linear-gradient(to right, var(--color-primary, #C4A87C) 0%, var(--color-primary, #C4A87C) ${(currentMax / maxPossible) * 100}%, rgba(0, 0, 0, 0.08) ${(currentMax / maxPossible) * 100}%, rgba(0, 0, 0, 0.08) 100%)`,
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none transition-all duration-300"
                      />
                      <div className="flex items-center justify-between gap-3 mt-4">
                        <div className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1.5 flex flex-col transition-all duration-300">
                          <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 font-bold">
                            Min Price
                          </span>
                          <span className="text-xs font-semibold text-on-surface mt-0.5">₹0</span>
                        </div>
                        <div className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1.5 flex flex-col text-right transition-all duration-300">
                          <span className="text-[9px] uppercase tracking-wider text-on-surface-variant/50 font-bold">
                            Max Price
                          </span>
                          <span className="text-xs font-semibold text-primary mt-0.5">
                            {currentMax === maxPossible
                              ? 'No Limit'
                              : `₹${currentMax.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </FilterSection>
                );
              }

              return (
                <FilterSection
                  key={group.id}
                  title={group.label}
                  id={group.id}
                  activeSections={activeSections}
                  onToggle={toggleSection}
                >
                  {finalOptions.map((opt) =>
                    renderCheckbox(group.id, opt.value, opt.count > 0 ? opt.count : null),
                  )}
                </FilterSection>
              );
            })
          : null}
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
                    className="absolute top-6 right-6 w-10 h-10 min-h-0 rounded-full bg-black/5 flex items-center justify-center text-on-surface hover:bg-black/10 transition-all z-10"
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
