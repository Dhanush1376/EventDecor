import React, { useMemo } from 'react';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import {
  getTypeIcon,
  getTypeLabel,
  highlightMatch,
  formatPrice,
  getStockLabel,
  formatDiscount,
} from './searchUtils';

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

  const showSuggestions = displaySuggestions.length > 0 && query.trim().length >= 1;
  const showNoResults = !loading && query.trim().length >= 1 && displaySuggestions.length === 0;

  // Group suggestions by type
  const groupedSuggestions = useMemo(() => {
    const groups = [
      { id: 'categories', label: 'Categories', items: [] },
      { id: 'collections', label: 'Collections & Events', items: [] },
      { id: 'products', label: 'Products', items: [] },
      { id: 'others', label: 'Suggestions', items: [] },
    ];

    displaySuggestions.forEach((item) => {
      if (item.type === 'category') groups[0].items.push(item);
      else if (item.type === 'event' || item.type === 'gallery') groups[1].items.push(item);
      else if (item.type === 'product') groups[2].items.push(item);
      else groups[3].items.push(item);
    });

    return groups.filter((g) => g.items.length > 0);
  }, [displaySuggestions]);

  // Track global index across groups for keyboard navigation
  let globalIndex = -1;

  const renderSuggestionItem = (item) => {
    globalIndex++;
    const currentIndex = globalIndex;
    const isSelected = activeIndex === currentIndex;
    const stockInfo = item.type === 'product' ? getStockLabel(item.stockStatus) : null;
    const discountText = item.type === 'product' ? formatDiscount(item.discount) : null;

    return (
      <button
        key={item.id}
        data-suggestion
        role="option"
        aria-selected={isSelected}
        onClick={() => onSelectSuggestion(item)}
        onMouseEnter={!isMobile ? () => setActiveIndex(currentIndex) : undefined}
        className={`${
          isMobile
            ? 'w-full flex items-center gap-3.5 px-5 py-3.5 text-left active:bg-stone-50 transition-colors'
            : `w-full flex items-center gap-4.5 px-6 lg:px-8.5 py-2.5 text-left transition-all duration-200 group border-b border-stone-100/30 last:border-b-0 ${
                isSelected
                  ? 'bg-primary/8 translate-x-1'
                  : 'hover:bg-stone-50/50 hover:translate-x-0.5'
              }`
        }`}
      >
        {/* Thumbnail or Icon */}
        <div className="relative">
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
                loading="lazy"
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
          {discountText && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10 whitespace-nowrap">
              {discountText}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <p
              className={`${
                isMobile
                  ? 'text-[14.5px] text-stone-800 font-display font-medium truncate leading-tight'
                  : 'text-[15px] lg:text-[16px] text-stone-800 font-display font-medium truncate leading-snug group-hover:text-primary transition-colors duration-200'
              }`}
            >
              {highlightMatch(item.title, query)}
            </p>
            {item.rating > 0 && !isMobile && (
              <div className="flex items-center gap-0.5 ml-1">
                <span
                  className="material-symbols-outlined text-[#f59e0b] text-[12px] fill-current"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <span className="text-[11px] font-bold text-stone-600">{item.rating}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                    ? 'text-[12px] font-display font-semibold'
                    : 'text-[13px] font-display font-semibold'
                } text-primary flex items-center`}
              >
                {item.oldPrice && item.oldPrice > item.price && (
                  <span className="line-through text-stone-400 text-[11px] mr-1.5 not-italic font-sans">
                    {formatPrice(item.oldPrice)}
                  </span>
                )}
                {formatPrice(item.price)}
              </span>
            )}

            {stockInfo && (
              <span
                className={`flex items-center gap-1 ${isMobile ? 'text-[9px]' : 'text-[10px]'} font-semibold ${stockInfo.color}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${stockInfo.dot}`}></span>
                {stockInfo.label}
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
    );
  };

  return (
    <div
      className={`relative ${loading ? 'opacity-70 pointer-events-none' : 'opacity-100'} transition-opacity duration-200`}
    >
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

      {/* Grouped Suggestions List */}
      {showSuggestions && (
        <div className={isMobile ? 'divide-y divide-stone-100 pb-2' : 'py-2'}>
          {groupedSuggestions.map((group, groupIdx) => (
            <div key={group.id} className="mb-2 last:mb-0">
              <div className={`${isMobile ? 'px-5 py-2' : 'px-6 lg:px-8.5 py-1.5'}`}>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  {group.label}
                </h3>
              </div>
              <div className={isMobile ? 'divide-y divide-stone-50' : ''}>
                {group.items.map((item) => renderSuggestionItem(item))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skeletons when loading and no previous data to show */}
      {loading && displaySuggestions.length === 0 && (
        <div className={isMobile ? 'divide-y divide-stone-100 pb-2' : 'py-2'}>
          <div className={`${isMobile ? 'px-5 py-2' : 'px-6 lg:px-8.5 py-1.5'}`}>
            <div className="w-24 h-3 bg-stone-100 rounded animate-pulse"></div>
          </div>
          <div className={isMobile ? 'divide-y divide-stone-50' : ''}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`${isMobile ? 'w-full flex items-center gap-3.5 px-5 py-3.5' : 'w-full flex items-center gap-4.5 px-6 lg:px-8.5 py-2.5'}`}
              >
                <div
                  className={`${isMobile ? 'w-11 h-11 rounded-xl' : 'w-12 h-12 lg:w-14 lg:h-14 rounded-2xl'} bg-stone-100 animate-pulse flex-shrink-0`}
                ></div>
                <div className="flex-1 flex flex-col gap-2 justify-center">
                  <div className="h-4 bg-stone-100 rounded w-2/3 animate-pulse"></div>
                  <div className="h-3 bg-stone-100 rounded w-1/3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View all results button */}
      {query.trim().length >= 1 && !showNoResults && (
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
      )}

      {/* No Results */}
      {showNoResults && (
        <div className={isMobile ? 'py-12 text-center px-6' : 'py-16 text-center space-y-4'}>
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="material-symbols-outlined text-[32px] text-stone-300 block">
              search_off
            </span>
          </div>
          <p className="text-[18px] text-stone-800 font-bold font-display">
            No exact matches found for "{query}"
          </p>
          <p
            className={`text-[14px] text-stone-500 max-w-md mx-auto font-normal ${
              isMobile ? 'mt-2 mb-6' : ''
            }`}
          >
            We couldn't find anything matching your search. Try checking for typos, using broader
            terms, or explore our curated collections.
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
    </div>
  );
}
