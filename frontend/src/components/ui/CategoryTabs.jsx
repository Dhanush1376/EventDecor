export function CategoryTabs({ categories = [], activeCategory, onCategoryChange }) {
  if (!categories.length) return null;

  return (
    <div
      className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0"
      role="tablist"
      aria-label="Product categories"
    >
      <div className="flex gap-2 sm:gap-3 pb-1 lg:pb-0 min-w-max items-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange?.(cat)}
            role="tab"
            aria-selected={activeCategory === cat}
            className={`px-4 sm:px-6 h-11 lg:h-9 flex items-center justify-center rounded-full border font-label text-[10px] sm:text-[11px] lg:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-all duration-300 whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-primary text-white border-primary shadow-md shadow-primary/10'
                : 'bg-surface-bright/90 backdrop-blur-md border-outline-variant/30 text-secondary hover:border-primary hover:text-primary shadow-sm'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
