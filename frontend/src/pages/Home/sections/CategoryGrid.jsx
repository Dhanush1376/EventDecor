import { useWebsiteContent } from '../../../hooks/useWebsiteContent';

import React from 'react';

/**
 * Category grid strictly driven by CMS config. No fallbacks.
 */
export const CategoryGrid = React.memo(function CategoryGrid() {
  const cms = useWebsiteContent({ includeDefaults: false });
  const config = cms?.categoryGrid || {};

  if (cms.loading) {
    return (
      <section className="h1-categories relative overflow-hidden isolate">
        <div className="h1-container relative z-10 animate-pulse">
          <div className="flex flex-col items-center mb-8 md:mb-10 text-center">
            <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2 mx-auto"></div>
            <div className="h-8 w-48 md:w-64 bg-surface-container-high rounded-full mx-auto"></div>
          </div>

          {/* Mobile Grid */}
          <div className="grid grid-cols-2 gap-4 lg:hidden">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center aspect-[4/5] bg-surface-container-high rounded-xl"
              ></div>
            ))}
          </div>

          {/* Desktop Circular Row */}
          <div className="hidden lg:flex justify-center gap-10 mt-8 w-full max-w-[1400px] mx-auto">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-4 shrink-0">
                <div className="w-40 h-40 rounded-full bg-surface-container-high border-4 border-surface shadow-sm"></div>
                <div className="w-24 h-4 bg-surface-container-high rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (config.isVisible === false) return null;

  let displayCategories = [];
  if (config.categories && Array.isArray(config.categories)) {
    displayCategories = config.categories;
  }

  // Ensure there are categories to display
  if (!displayCategories || displayCategories.length === 0) {
    return null;
  }

  return (
    <section className="h1-categories relative overflow-hidden isolate">
      {/* Background glow gradients behind mandalas */}
      <div className="absolute -top-40 -left-40 w-[300px] h-[300px] bg-primary-container/15 rounded-full blur-[80px] pointer-events-none z-[-1]" />
      <div className="absolute -bottom-40 -right-40 w-[300px] h-[300px] bg-primary-container/15 rounded-full blur-[80px] pointer-events-none z-[-1]" />
      <MandalaElement
        className="absolute -top-32 -left-32 opacity-[0.06] z-[-1]"
        size={500}
        duration={160}
        variant={3}
      />
      <MandalaElement
        className="absolute -bottom-32 -right-32 opacity-[0.06] z-[-1]"
        size={500}
        duration={160}
        variant={3}
      />
      <div className="h1-container relative z-10">
        <SectionHeader
          kicker={config.sectionSubtitle}
          title={config.sectionTitle}
          seeAllLink="/collections"
        />
        {/* --- MOBILE LAYOUT --- */}
        <div className="block lg:hidden">
          <div className="h1-categories__grid">
            {displayCategories.map((category, index) => {
              const categoryName =
                typeof category === 'string'
                  ? category
                  : category.categoryName || category.name || category.title || 'Category';
              const displayName =
                typeof category === 'string'
                  ? category
                  : category.title || category.name || categoryName;
              const categoryId =
                typeof category === 'string' ? category : category.id || category._id || index;
              const linkDest =
                (typeof category !== 'string' ? category.link : null) ||
                `/collections?category=${encodeURIComponent(categoryName)}`;
              const categoryImage = typeof category !== 'string' ? category.image : null;

              return (
                <Link key={categoryId} to={linkDest} className="h1-categories__item">
                  <div className="h1-categories__img-wrap">
                    {categoryImage ? (
                      <CloudinaryImage
                        src={categoryImage}
                        alt={displayName}
                        className="h1-categories__img"
                        loading="lazy"
                        containerClassName="h1-categories__img absolute inset-0 w-full h-full"
                        sizes="(max-width: 1024px) 50vw, 300px"
                        width={360}
                      />
                    ) : (
                      <div
                        className="h1-categories__img bg-surface-container-high"
                        aria-hidden="true"
                      />
                    )}
                    <div className="h1-categories__overlay"></div>
                    <span className="h1-categories__label">{displayName}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* --- DESKTOP CIRCULAR ROW LAYOUT --- */}
        <div className="hidden lg:flex justify-center flex-wrap gap-10 mt-8 w-full max-w-[1400px] mx-auto px-6">
          {displayCategories.map((category, index) => {
            const categoryName =
              typeof category === 'string'
                ? category
                : category.categoryName || category.name || category.title || 'Category';
            const displayName =
              typeof category === 'string'
                ? category
                : category.title || category.name || categoryName;
            const categoryId =
              typeof category === 'string' ? category : category.id || category._id || index;
            const linkDest =
              (typeof category !== 'string' ? category.link : null) ||
              `/collections?category=${encodeURIComponent(categoryName)}`;
            const categoryImage = typeof category !== 'string' ? category.image : null;

            return (
              <Link
                key={categoryId}
                to={linkDest}
                className="flex flex-col items-center group gap-4"
              >
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-md group-hover:shadow-xl group-hover:border-primary/20 transition-all duration-500 relative">
                  {categoryImage ? (
                    <CloudinaryImage
                      src={categoryImage}
                      alt={displayName}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                      containerClassName="absolute inset-0 w-full h-full"
                      sizes="200px"
                      width={360}
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-container-high" aria-hidden="true" />
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>
                </div>
                <span className="font-serif text-[18px] text-on-surface tracking-wide group-hover:text-primary transition-colors duration-300">
                  {displayName}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
});
