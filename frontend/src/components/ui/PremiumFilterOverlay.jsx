import { useState } from 'react';

const COLOR_PALETTES = [
  { name: 'Red', hex: '#FF0000' },
  { name: 'Gold', hex: '#FFD700' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Green', hex: '#008000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#000000' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Purple', hex: '#800080' },
];

const STYLE_OPTIONS = ['Traditional', 'Modern', 'Luxury', 'Floral', 'Minimalist', 'Rustic'];

export function PremiumFilterOverlay({ isOpen, onClose, filters, setFilters, onApply }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const toggleColor = (colorName) => {
    setLocalFilters((prev) => {
      const colors = prev.colors || [];
      if (colors.includes(colorName)) {
        return { ...prev, colors: colors.filter((c) => c !== colorName) };
      }
      return { ...prev, colors: [...colors, colorName] };
    });
  };

  const toggleStyle = (style) => {
    setLocalFilters((prev) => {
      const styles = prev.styles || [];
      if (styles.includes(style)) {
        return { ...prev, styles: styles.filter((s) => s !== style) };
      }
      return { ...prev, styles: [...styles, style] };
    });
  };

  const handleApply = () => {
    setFilters(localFilters);
    onApply && onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    const cleared = { colors: [], styles: [], priceRange: [0, 10000] };
    setLocalFilters(cleared);
    setFilters(cleared);
    onApply && onApply(cleared);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex justify-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-black/5">
              <h3 className="font-display text-2xl">Refine Search</h3>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Filter Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-none">
              {/* Color Palette */}
              <div>
                <h4 className="font-label uppercase tracking-widest text-[11px] text-black/50 font-bold mb-4">
                  Color Palette
                </h4>
                <div className="flex flex-wrap gap-3">
                  {COLOR_PALETTES.map((color) => {
                    const isSelected = (localFilters.colors || []).includes(color.name);
                    return (
                      <button
                        key={color.name}
                        onClick={() => toggleColor(color.name)}
                        className={`w-10 h-10 rounded-full border-2 transition-all relative ${isSelected ? 'border-primary scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{
                          backgroundColor: color.hex,
                          boxShadow:
                            color.hex === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : 'none',
                        }}
                        title={color.name}
                      >
                        {isSelected && (
                          <div
                            className={`absolute inset-0 flex items-center justify-center ${color.hex === '#FFFFFF' || color.hex === '#FFD700' ? 'text-black' : 'text-white'}`}
                          >
                            <span className="material-symbols-outlined text-[16px] font-bold">
                              check
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Styles */}
              <div>
                <h4 className="font-label uppercase tracking-widest text-[11px] text-black/50 font-bold mb-4">
                  Design Style
                </h4>
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map((style) => {
                    const isSelected = (localFilters.styles || []).includes(style);
                    return (
                      <button
                        key={style}
                        onClick={() => toggleStyle(style)}
                        className={`px-4 py-2 rounded-full font-body-sm transition-all border ${
                          isSelected
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-black hover:bg-black/5 border-black/10'
                        }`}
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-black/5 flex gap-4 bg-white">
              <button
                onClick={handleClear}
                className="px-6 py-4 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-black/5 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleApply}
                className="flex-1 bg-primary text-white rounded-full font-bold uppercase tracking-widest text-[11px] shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)] hover:-translate-y-0.5 transition-all"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
