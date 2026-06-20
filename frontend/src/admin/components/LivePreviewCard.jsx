import React from 'react';

export function LivePreviewCard({ formData, mobileTab }) {
  return (
    <>
      {/* Live Catalog Preview Card */}
      <div
        className={`lg:sticky lg:top-24 space-y-6 w-full ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}
      >
        <div className="text-center lg:text-left">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--admin-text-secondary)]">
            Storefront Preview
          </span>
          <p className="text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]/75 mt-0.5">
            Real-time catalog rendition of your craft product
          </p>
        </div>

        {/* Luxury Card Rendering */}
        <div className="bg-[var(--admin-surface)] rounded-3xl overflow-hidden border border-[var(--admin-border)]/60 shadow-[var(--admin-shadow-sm)] group relative">
          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            {formData.badges &&
              formData.badges
                .split(',')
                .map((b) => b.trim())
                .filter(Boolean)
                .map((b, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-[11px] sm:text-[11px] font-bold uppercase tracking-widest bg-[var(--admin-accent)] text-white shadow-sm"
                  >
                    {b}
                  </span>
                ))}
            {formData.featured && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-[11px] sm:text-[11px] font-bold uppercase tracking-widest bg-[var(--admin-accent)] text-white shadow-sm flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[11px] fill-current">star</span>
                Featured
              </span>
            )}
          </div>

          {/* Availability Badges Overlay */}
          <div className="absolute top-3 right-3 z-10">
            {formData.stock !== '' && Number(formData.stock) === 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-sm">
                Sold Out
              </span>
            ) : formData.stock !== '' && Number(formData.stock) <= 5 ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm">
                Low Stock
              </span>
            ) : null}
          </div>

          {/* Card Thumbnail */}
          <div className="aspect-[4/3] bg-[var(--admin-bg-subtle)] relative overflow-hidden">
            {formData.imageSrc ? (
              <img
                src={formData.imageSrc}
                alt={formData.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[var(--admin-text-secondary)]/40">
                <span className="material-symbols-outlined text-[36px] mb-2">add_a_photo</span>
                <span className="text-[11px] sm:text-[11px] sm:text-[11px] font-bold uppercase tracking-widest">
                  Image Preview Canvas
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail Gallery Indicators (Tiny previews) */}
          {formData.images.length > 0 && (
            <div className="flex gap-1.5 px-4 pt-3 shrink-0">
              {formData.images.filter(Boolean).map((img, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-lg overflow-hidden border border-[var(--admin-border)] cursor-pointer hover:border-[var(--admin-accent)]"
                >
                  <img
                    src={img}
                    alt="Traditional wedding event decoration"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Product Body */}
          <div className="p-4 space-y-2">
            <span className="text-[11px] sm:text-[11px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--admin-accent)]">
              {formData.category || 'Category Unassigned'}
            </span>

            <div>
              <h3 className="text-[14.5px]  font-bold text-[var(--admin-text-primary)] truncate">
                {formData.title || 'Traditional Sanskriti Masterpiece'}
              </h3>
              {formData.teluguTitle && (
                <p className="text-[11px] sm:text-[11px]  text-[var(--admin-text-secondary)]/90 italic mt-0.5 truncate">
                  {formData.teluguTitle}
                </p>
              )}
            </div>

            {formData.material && (
              <div className="flex items-center gap-1 text-[11px] text-[var(--admin-text-secondary)] font-medium bg-[var(--admin-bg-subtle)] px-2 py-1 rounded-lg w-max border border-[var(--admin-border)]/40">
                <span className="material-symbols-outlined text-[12px] text-[var(--admin-accent)]">
                  auto_awesome
                </span>
                <span>{formData.material}</span>
              </div>
            )}

            {/* Price Tag Row */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border)]/40 mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[16px]  font-extrabold text-[var(--admin-text-primary)]">
                  ₹{Number(formData.price || 0).toLocaleString()}
                </span>
                {formData.oldPrice && (
                  <span className="text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]/50 line-through">
                    ₹{Number(formData.oldPrice).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent)] fill-current">
                  star
                </span>
                <span className="text-[11px] font-bold text-[var(--admin-text-primary)]">4.9</span>
                <span className="text-[11px] sm:text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]">
                  (12 reviews)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
