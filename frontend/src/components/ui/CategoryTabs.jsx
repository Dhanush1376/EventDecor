import { m as motion } from 'framer-motion';

export function CategoryTabs({ categories = [], activeCategory, onCategoryChange }) {
  if (!categories.length) return null;

  return (
    <div
      className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 flex justify-start lg:justify-center"
      role="tablist"
      aria-label="Product categories"
    >
      <div className="inline-flex gap-1 p-1.5 min-w-max items-center bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-full shadow-inner">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange?.(cat)}
              role="tab"
              aria-selected={isActive}
              className={`relative px-5 sm:px-6 h-9 lg:h-8 flex items-center justify-center rounded-full font-label text-[10px] sm:text-[11px] uppercase tracking-[0.15em] transition-colors duration-300 whitespace-nowrap z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant/70 hover:text-on-surface font-medium'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeCategoryTab"
                  className="absolute inset-0 bg-surface-bright rounded-full shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{cat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
