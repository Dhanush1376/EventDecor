import React from "react";

export function CategoryTabs({
  categories = [],
  activeCategory,
  onCategoryChange,
}) {
  if (!categories.length) return null;

  return (
    <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0" role="tablist" aria-label="Product categories">
      <div className="flex gap-2 sm:gap-3 pb-1 min-w-max">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange?.(cat)}
            role="tab"
            aria-selected={activeCategory === cat}
            className={`px-4 sm:px-6 py-2.5 rounded-full border font-label text-[10px] sm:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-all duration-300 whitespace-nowrap min-h-11 ${
              activeCategory === cat
                ? "bg-primary text-white border-primary shadow-md shadow-primary/10"
                : "bg-surface-bright/90 backdrop-blur-md border-outline-variant/30 text-secondary hover:border-primary hover:text-primary shadow-sm"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
