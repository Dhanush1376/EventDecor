import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../../../components/shared/SectionHeader';
import { MandalaElement } from '../../../components/ui/MandalaElement';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';

import React from 'react';

/**
 * Category grid strictly driven by CMS config. No fallbacks.
 */
export const CategoryGrid = React.memo(function CategoryGrid({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const config = activeCms?.categoryGrid || {};

  if (cms.loading) {
    return (
      <section className="h1-categories relative isolate pb-12 lg:pb-20">
        <div className="h1-container relative z-10 animate-pulse">
          <div className="flex flex-col items-center mb-8 lg:mb-10 text-center">
            <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2 mx-auto"></div>
            <div className="h-8 w-48 lg:w-64 bg-surface-container-high rounded-full mx-auto"></div>
          </div>

          {/* Responsive Skeleton Grid */}
          <div className="h1-categories__grid mt-6 lg:mt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center aspect-[3/4] bg-surface-container-high rounded-[20px] lg:rounded-[24px]"
              />
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

  if (!displayCategories || displayCategories.length === 0) {
    return null;
  }

  return (
    <section className="h1-categories relative isolate pb-12 lg:pb-20">
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

        {/* Responsive Category Cards Grid (Mobile, Tablet & Laptop) */}
        <div className="h1-categories__grid mt-6 lg:mt-8">
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
              <Link key={categoryId} to={linkDest} className="h1-categories__item group">
                <div className="h1-categories__img-wrap">
                  {categoryImage ? (
                    <CloudinaryImage
                      src={categoryImage}
                      alt={displayName}
                      className="h1-categories__img"
                      loading="lazy"
                      containerClassName="h1-categories__img absolute inset-0 w-full h-full"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      width={480}
                    />
                  ) : (
                    <div
                      className="h1-categories__img bg-surface-container-high"
                      aria-hidden="true"
                    />
                  )}
                  <div className="h1-categories__overlay" />
                  <div className="h1-categories__label">
                    <span>{displayName}</span>
                    <span className="h1-categories__label-icon">
                      <ExternalLink className="text-[16px] lg:text-[18px]" strokeWidth={1.5} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
});
