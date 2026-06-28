import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { fallbackCollections, getCollectionIcon, formatPrice } from './searchUtils';
import { MANDALA_VARIANT_URLS } from '../../constants/mandalaAssets';

export function SearchDiscovery({
  discoveryData,
  recentSearches,
  setQuery,
  onExecuteSearch,
  onRemoveRecent,
  onClearRecent,
  handleClose,
  isMobile,
}) {
  const navigate = useNavigate();

  return (
    <div className="py-2 relative overflow-hidden min-h-[400px]">
      {/* Mandala Background Watermark */}
      <div
        className="absolute top-0 right-0 translate-x-[15%] -translate-y-[15%] pointer-events-none opacity-[0.12] md:opacity-[0.08] z-0 mix-blend-normal"
        style={{
          WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
          maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
        }}
      >
        <img
          src={MANDALA_VARIANT_URLS[1]}
          alt=""
          className="w-[120vw] h-[120vw] md:w-[650px] md:h-[650px] object-contain dark:invert animate-[spin_120s_linear_infinite]"
        />
      </div>

      <div className="relative z-10">
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className={isMobile ? 'py-1' : 'mb-2'}>
            <div
              className={`flex items-center justify-between ${
                isMobile ? 'px-5 py-2' : 'px-6 md:px-8.5 py-1'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-sky-500">
                  manage_search
                </span>
                Recent Searches
              </span>
              <button
                onClick={onClearRecent}
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  isMobile
                    ? 'text-primary'
                    : 'text-primary/60 hover:text-primary transition-colors cursor-pointer'
                }`}
              >
                Clear All
              </button>
            </div>
            {recentSearches.map((search) => (
              <div
                key={search}
                onClick={() => {
                  setQuery(search);
                  onExecuteSearch(search);
                }}
                className={`flex items-center ${
                  isMobile
                    ? 'gap-3.5 px-5 py-1.5 active:bg-stone-50'
                    : 'gap-3 px-6 md:px-8.5 py-1.5 hover:bg-stone-50/60 transition-all border-b border-stone-100/30 last:border-b-0 group cursor-pointer'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-stone-400">
                  history
                </span>
                <span
                  className={`flex-1 ${
                    isMobile
                      ? 'text-[13.5px] text-stone-700 font-medium'
                      : 'text-[13px] text-stone-600 group-hover:text-stone-900 font-medium transition-colors'
                  }`}
                >
                  {search}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRecent(search);
                  }}
                  className={
                    isMobile
                      ? 'w-8 h-8 min-h-0 rounded-full flex items-center justify-center active:bg-stone-200/60'
                      : 'opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 min-h-0 rounded-full flex items-center justify-center hover:bg-stone-200/50 cursor-pointer'
                  }
                  aria-label={`Remove ${search}`}
                >
                  <span className="material-symbols-outlined text-[16px] text-stone-400">
                    close
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Discovery Engine Modules */}
        {isMobile ? (
          <>
            {/* Mobile Event Collections */}
            {((discoveryData?.eventCollections && discoveryData.eventCollections.length > 0) ||
              true) && (
              <div className="mb-4 mt-2">
                <div className="px-5 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      explore
                    </span>
                    Explore Collections
                  </span>
                </div>
                <div className="flex gap-3 px-5 overflow-x-auto pb-2 no-scrollbar snap-x">
                  {(discoveryData?.eventCollections?.length > 0
                    ? discoveryData.eventCollections
                    : fallbackCollections
                  ).map((col, idx) => (
                    <button
                      key={col.title || idx}
                      onClick={() => {
                        handleClose();
                        navigate(`/collections?category=${encodeURIComponent(col.title)}`);
                      }}
                      className="snap-start flex flex-col items-center gap-2 flex-shrink-0 active:scale-95 transition-transform"
                    >
                      <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                        <span className="material-symbols-outlined text-[24px]">
                          {col.icon || getCollectionIcon(col.title)}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-600 font-semibold text-center max-w-[80px] line-clamp-2 leading-tight break-words">
                        {col.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Trending Now */}
            {discoveryData?.popularProducts?.length > 0 && (
              <div className="mb-4">
                <div className="px-5 mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-orange-500">
                      local_fire_department
                    </span>
                    Trending Now
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 px-5">
                  {discoveryData.popularProducts.slice(0, 4).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        handleClose();
                        navigate(`/product/${product.slug || product.id}`);
                      }}
                      className="flex items-center gap-3 p-2 rounded-xl bg-stone-50 border border-stone-100/50 text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="w-12 h-12 rounded-lg bg-stone-200 overflow-hidden flex-shrink-0">
                        {product.image && (
                          <CloudinaryImage
                            src={product.image}
                            alt={product.title}
                            className="w-full h-full object-cover"
                            width={60}
                            height={60}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-stone-800 line-clamp-2 leading-tight">
                          {product.title}
                        </p>
                        {product.price > 0 && (
                          <p className="text-[11.5px] font-bold text-primary mt-0.5 font-display">
                            {formatPrice(product.price)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Desktop Discovery Engine Modules */
          <div
            className={`pt-4 pb-2 ${recentSearches.length > 0 ? 'border-t border-stone-200/30 mt-3' : ''}`}
          >
            <div className="grid grid-cols-12 gap-8 px-6 md:px-8.5">
              {/* Left Column: Trending Now Products */}
              <div className="col-span-12 md:col-span-5 flex flex-col gap-6">
                {discoveryData?.popularProducts?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 block flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px] text-orange-500">
                        local_fire_department
                      </span>
                      Trending Now
                    </span>
                    <div className="flex flex-col gap-3">
                      {discoveryData.popularProducts.slice(0, 4).map((product) => (
                        <button
                          key={product.id}
                          onClick={() => {
                            handleClose();
                            navigate(`/product/${product.slug || product.id}`);
                          }}
                          className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-stone-50 transition-colors text-left group"
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-stone-200/50">
                            {product.image && (
                              <CloudinaryImage
                                src={product.image}
                                alt={product.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                width={50}
                                height={50}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-stone-800 line-clamp-1 leading-snug group-hover:text-primary transition-colors">
                              {product.title}
                            </p>
                            {product.price > 0 && (
                              <p className="text-[11.5px] font-bold text-primary mt-0.5 font-display">
                                {formatPrice(product.price)}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Explore Collections & New Arrivals */}
              <div className="col-span-12 md:col-span-7 flex flex-col gap-6 relative">
                <div className="hidden md:block absolute left-[-16px] top-0 bottom-0 w-px bg-stone-200/40"></div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                  {/* Explore Collections */}
                  {((discoveryData?.eventCollections &&
                    discoveryData.eventCollections.length > 0) ||
                    true) && (
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-primary">
                          explore
                        </span>
                        Explore Collections
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {(discoveryData?.eventCollections?.length > 0
                          ? discoveryData.eventCollections
                          : fallbackCollections
                        )
                          .slice(0, 6)
                          .map((col, idx) => (
                            <button
                              key={col.title || idx}
                              onClick={() => {
                                handleClose();
                                navigate(`/collections?category=${encodeURIComponent(col.title)}`);
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors group border border-transparent hover:border-stone-200 text-left"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-[16px]">
                                  {col.icon || getCollectionIcon(col.title)}
                                </span>
                              </div>
                              <span className="text-[13px] text-stone-700 font-medium group-hover:text-primary transition-colors">
                                {col.title}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* New Arrivals */}
                  {discoveryData?.newArrivals?.length > 0 && (
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-emerald-500">
                          auto_awesome
                        </span>
                        New Arrivals
                      </span>
                      <div className="flex flex-col gap-3">
                        {discoveryData.newArrivals.slice(0, 3).map((product) => (
                          <button
                            key={product.id}
                            onClick={() => {
                              handleClose();
                              navigate(`/product/${product.slug || product.id}`);
                            }}
                            className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-stone-50 transition-colors text-left group"
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-stone-200/50 relative">
                              <div className="absolute top-0 right-0 bg-primary/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg z-10">
                                NEW
                              </div>
                              {product.image && (
                                <CloudinaryImage
                                  src={product.image}
                                  alt={product.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  width={60}
                                  height={60}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-stone-800 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                {product.title}
                              </p>
                              {product.price > 0 && (
                                <p className="text-[11.5px] font-bold text-primary mt-0.5">
                                  {formatPrice(product.price)}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
