import React from 'react';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { SearchSuggestionsSkeleton, Skeleton } from '../ui/Skeleton';
import { getTypeIcon, getTypeLabel, highlightMatch, formatPrice } from './searchUtils';

export function SearchSuggestionsList({
  query,
  setQuery,
  correctedQuery,
  suggestions,
  loading,
  activeIndex,
  setActiveIndex,
  onSelectSuggestion,
  onExecuteSearch,
  isMobile,
}) {
  const hasProducts = suggestions.some((s) => s.type === 'product');
  const displaySuggestions = hasProducts
    ? suggestions.filter((s) => s.type !== 'keyword')
    : suggestions;

  const showSuggestions = displaySuggestions.length > 0 && query.trim().length >= 2;
  const showNoResults = !loading && query.trim().length >= 2 && displaySuggestions.length === 0;

  return (
    <>
      {/* Did you mean? */}
      {correctedQuery && query.trim().toLowerCase() !== correctedQuery.toLowerCase() && (
        <div
          className={`${
            isMobile
              ? 'px-5 py-3.5 bg-primary/5 text-[13px] border-b border-stone-100'
              : 'px-6 lg:px-8.5 py-3.5 bg-primary/5 text-[13px] border-b border-[#d0c5af]/15'
          } text-primary font-medium flex items-center gap-2`}
        >
          <span className="material-symbols-outlined text-[16px] text-primary animate-bounce">
            lightbulb
          </span>
          <span>
            Did you mean:{' '}
            <button
              onClick={() => {
                setQuery(correctedQuery);
                onExecuteSearch(correctedQuery);
              }}
              className="font-bold underline hover:text-primary-dark cursor-pointer bg-transparent border-none p-0 outline-none"
            >
              {correctedQuery}
            </button>
            ?
          </span>
        </div>
      )}

      {loading && query.trim().length >= 2 && <SearchSuggestionsSkeleton />}

      {/* Suggestions List */}
      {showSuggestions && (
        <div className={isMobile ? 'divide-y divide-stone-100' : 'py-2'}>
          {displaySuggestions.map((item, idx) => (
            <button
              key={item.id}
              data-suggestion
              role="option"
              aria-selected={activeIndex === idx}
              onClick={() => onSelectSuggestion(item)}
              onMouseEnter={!isMobile ? () => setActiveIndex(idx) : undefined}
              className={`${
                isMobile
                  ? 'w-full flex items-center gap-3.5 px-5 py-3.5 text-left active:bg-stone-50 transition-colors'
                  : `w-full flex items-center gap-4.5 px-6 lg:px-8.5 py-2.5 text-left transition-all duration-200 group border-b border-stone-100/30 last:border-b-0 ${
                      activeIndex === idx
                        ? 'bg-primary/8 translate-x-1'
                        : 'hover:bg-stone-50/50 hover:translate-x-0.5'
                    }`
              }`}
            >
              {/* Thumbnail or Icon */}
              {item.image ? (
                <div
                  className={`${
                    isMobile ? 'w-11 h-11 rounded-xl' : 'w-12 h-12 lg:w-14 lg:h-14 rounded-2xl'
                  } overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200/60 shadow-xs ${
                    !isMobile && 'group-hover:scale-105 transition-transform duration-300'
                  }`}
                >
                  <CloudinaryImage
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    containerClassName="w-full h-full"
                    width={isMobile ? 64 : 80}
                    height={isMobile ? 64 : 80}
                    loading="eager"
                  />
                </div>
              ) : (
                <div
                  className={`${
                    isMobile ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 lg:w-14 lg:h-14 rounded-2xl'
                  } bg-primary/8 flex items-center justify-center flex-shrink-0 border border-primary/10 text-primary`}
                >
                  <span
                    className={`material-symbols-outlined ${isMobile ? 'text-[20px]' : 'text-[22px]'}`}
                  >
                    {getTypeIcon(item.type)}
                  </span>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`${
                    isMobile
                      ? 'text-[14.5px] text-stone-800 font-medium truncate leading-tight'
                      : 'text-[15px] lg:text-[16px] text-stone-800 font-display font-medium truncate leading-snug group-hover:text-primary transition-colors duration-200'
                  }`}
                >
                  {highlightMatch(item.title, query)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.category && item.type !== 'category' && (
                    <span
                      className={`${
                        isMobile ? 'text-[9px]' : 'text-[10px]'
                      } text-stone-400 uppercase tracking-widest font-bold`}
                    >
                      {item.category}
                    </span>
                  )}
                  {item.price > 0 && (
                    <span
                      className={`${
                        isMobile
                          ? 'text-[12px] font-semibold'
                          : 'text-[13px] font-display font-semibold italic'
                      } text-primary`}
                    >
                      {formatPrice(item.price)}
                    </span>
                  )}
                </div>
              </div>

              {/* Type Badge (Desktop Only) */}
              {!isMobile && (
                <span className="hidden lg:inline-flex px-2.5 py-1 bg-stone-100 rounded-lg text-[9px] font-bold uppercase tracking-widest text-stone-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-300">
                  {getTypeLabel(item.type)}
                </span>
              )}

              {/* Arrow icon */}
              <span
                className={`material-symbols-outlined text-[18px] text-stone-300 flex-shrink-0 ${
                  !isMobile &&
                  'group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300'
                }`}
              >
                north_east
              </span>
            </button>
          ))}
        </div>
      )}

      {/* View all results button */}
      {query.trim().length >= 2 &&
        !showNoResults &&
        (loading ? (
          <div
            className={`w-full ${
              isMobile
                ? 'py-4 px-5 border-t border-stone-100'
                : 'flex items-center justify-center py-4 px-6 lg:px-8 border-t border-stone-200/50'
            }`}
          >
            <Skeleton
              className={isMobile ? 'h-5 w-2/3 rounded-md mx-auto' : 'h-5 w-1/3 rounded-md'}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExecuteSearch(query);
            }}
            className={`${
              isMobile
                ? 'w-full py-4 text-center text-primary font-bold text-[12px] uppercase tracking-wider border-t border-stone-100 active:bg-stone-50'
                : 'w-full flex items-center justify-center gap-2 px-6 lg:px-8 py-4 text-primary font-bold text-[12px] uppercase tracking-widest hover:bg-primary/5 transition-colors border-t border-stone-200/50 cursor-pointer'
            }`}
          >
            {!isMobile && <span className="material-symbols-outlined text-[18px]">search</span>}
            View all results for "{query}"
          </button>
        ))}

      {/* No Results */}
      {showNoResults && (
        <div className={isMobile ? 'py-16 text-center px-6' : 'py-12 text-center space-y-3'}>
          <span
            className={`material-symbols-outlined ${
              isMobile ? 'text-[48px] mb-3' : 'text-[42px] mb-2'
            } text-stone-300 block`}
          >
            search_off
          </span>
          <p className="text-[17px] text-stone-800 font-bold font-display">
            No exact matches found for "{query}"
          </p>
          <p
            className={`text-[14px] text-stone-500 max-w-sm mx-auto font-normal ${
              isMobile ? 'mt-2 mb-6' : ''
            }`}
          >
            Try checking for spelling errors, using more general terms, or exploring our curated
            categories below.
          </p>
          {isMobile && (
            <button
              onClick={() => setQuery('')}
              className="inline-flex items-center gap-2 bg-stone-100 text-stone-800 hover:bg-stone-200 px-6 py-2.5 rounded-full font-label text-[11px] uppercase tracking-widest transition-colors font-bold"
            >
              <span className="material-symbols-outlined text-[16px]">clear</span>
              Clear Search
            </button>
          )}
        </div>
      )}
    </>
  );
}
