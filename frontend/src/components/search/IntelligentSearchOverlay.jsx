import { useRef, useEffect, useMemo, useState, useCallback } from 'react';

import { useVisualSearch } from '../../hooks/useVisualSearch';
import { LazyMotion, domAnimation, m as motion, AnimatePresence } from 'framer-motion';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { SearchSuggestionsSkeleton } from '../ui/Skeleton';
import '../../styles/visual-search.css';

/**
 * IntelligentSearchOverlay — premium luxury search portal experience.
 *
 * Inspired by high-end luxury fashion boutiques and modern Spotlight search systems.
 * Features:
 * - Ambient gradient glows in the background
 * - Warm sand-cream glassmorphic card boundaries
 * - Unique icons for curated categories with dynamic hover colors
 * - Gold primary branding highlights and custom typography
 * - Clean micro-transitions and full keyboard compatibility
 */
export function IntelligentSearchOverlay({
  isOpen,
  initialMode = 'text',
  query,
  setQuery,
  suggestions,
  predictedCategories,
  trendingSearches,
  recentSearches,
  loading,
  activeIndex,
  setActiveIndex,
  onClose,
  onKeyDown,
  onSelectSuggestion,
  onExecuteSearch,
  onRemoveRecent,
  onClearRecent,
  correctedQuery,
  visualSearch,
}) {
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [searchMode, setSearchMode] = useState('text'); // 'text' | 'visual'
  const [isDragging, setIsDragging] = useState(false);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchMode(initialMode);
      if (initialMode === 'text' && inputRef.current)
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialMode]);

  // When visual search moves to scanning, we can close the intelligent search overlay
  // so the visual search results overlay can take over seamlessly.
  useEffect(() => {
    if (visualSearch?.phase === 'scanning' || visualSearch?.phase === 'results') {
      onClose();
    }
  }, [visualSearch?.phase, onClose]);

  // Handle drag events
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        visualSearch?.handleImageSelect(file, 'drag_drop');
      }
    },
    [visualSearch],
  );

  const startCamera = useCallback(async () => {
    const isMobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

    if (isMobile || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
      return;
    }
    // For desktop, we can just trigger the visual search overlay's own camera by switching to it
    // But since we want to keep it simple, we just open the file input or let the user click camera.
    // If they are on desktop, falling back to file input is safest for now without building the whole viewfinder here.
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Combine trending searches (what most users search) and default suggestions
  const combinedSuggestions = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Prioritize trending searches (most of the users search)
    if (Array.isArray(trendingSearches)) {
      for (const item of trendingSearches) {
        if (item && item.query) {
          const queryVal = item.query.trim();
          const lower = queryVal.toLowerCase();
          if (queryVal && !seen.has(lower)) {
            seen.add(lower);
            list.push(queryVal);
          }
        }
      }
    }

    // 2. Append default/static suggested queries
    const defaultSuggestions = [
      'Wedding Stage Decor',
      'Simple Birthday Backdrop',
      'Traditional Pooja Altar Setup',
      'Fresh Floral Garland Swags',
      'Premium Amber Up-lighting',
      'Luxury Welcome Sign Boards',
    ];

    for (const term of defaultSuggestions) {
      const lower = term.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(term);
      }
    }

    return list.slice(0, 8);
  }, [trendingSearches]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-suggestion]');
      if (items[activeIndex]) {
        items[activeIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'product':
        return 'shopping_bag';
      case 'event':
        return 'celebration';
      case 'gallery':
        return 'photo_library';
      case 'category':
        return 'category';
      default:
        return 'search';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'product':
        return 'Product';
      case 'event':
        return 'Event';
      case 'gallery':
        return 'Gallery';
      case 'category':
        return 'Category';
      default:
        return 'Search';
    }
  };

  const highlightMatch = (text, searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-primary/15 text-primary rounded-sm px-0.5 font-semibold">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const formatPrice = (val) => {
    if (val == null) return '';
    const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.-]/g, ''));
    return isNaN(num) ? '' : `₹${num.toLocaleString('en-IN')}`;
  };

  const showEmptyState = query.trim().length < 2 && !loading;
  const showSuggestions = suggestions.length > 0 && query.trim().length >= 2;
  const showNoResults = !loading && query.trim().length >= 2 && suggestions.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex flex-col font-body"
          role="dialog"
          aria-modal="true"
          aria-label="Search Portal"
        >
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-950/65 backdrop-blur-[24px]"
            onClick={onClose}
          />

          {/* Ambient Lighting Blurs behind search card */}
          <div
            className="absolute top-[10%] left-1/4 w-[380px] h-[380px] bg-primary/10 rounded-full filter blur-[100px] pointer-events-none animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="absolute bottom-[20%] right-1/4 w-[420px] h-[420px] bg-amber-500/5 rounded-full filter blur-[120px] pointer-events-none animate-pulse"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
          />

          {/* Search Container */}
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-2xl mx-auto mt-[8vh] md:mt-[12vh] px-4"
          >
            {/* Hidden File Inputs for Visual Search */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) visualSearch?.handleImageSelect(file, 'upload');
              }}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) visualSearch?.handleImageSelect(file, 'camera');
              }}
              className="hidden"
            />

            {/* Search Input Card */}
            <div className="bg-[#fcfbf9]/95 border-none rounded-[32px] shadow-[0_32px_80px_-10px_rgba(27,24,20,0.18)] focus-within:shadow-[0_32px_80px_-10px_rgba(184,157,112,0.12)] transition-all duration-500 overflow-hidden">
              {/* Header / Input Row */}
              <div className="flex items-center gap-4 px-6 py-4.5 md:px-8.5 md:py-5.5 relative min-h-[72px]">
                {searchMode === 'visual' ? (
                  <>
                    <button
                      onClick={() => setSearchMode('text')}
                      className="w-8 h-8 rounded-full bg-stone-200/50 hover:bg-stone-300/50 flex items-center justify-center text-stone-600 transition-all duration-300 flex-shrink-0 cursor-pointer -ml-2"
                      aria-label="Back to text search"
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                    <h2 className="flex-1 text-[18px] md:text-[20px] text-stone-900 font-display font-medium">
                      Search by Image
                    </h2>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[26px] text-primary flex-shrink-0 select-none animate-pulse">
                      search
                    </span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Search decor, events, styles..."
                      className="flex-1 min-w-0 bg-transparent border-none outline-none appearance-none ring-0 focus:ring-0 focus:outline-none focus:border-transparent text-[18px] md:text-[20px] text-stone-900 placeholder:text-stone-400/70 placeholder:text-[14px] md:placeholder:text-[16px] font-body font-normal search-portal-input"
                      style={{
                        outline: 'none',
                        border: 'none',
                        boxShadow: 'none',
                        WebkitAppearance: 'none',
                        appearance: 'none',
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      aria-label="Search input"
                      aria-autocomplete="list"
                      aria-expanded={showSuggestions}
                      aria-controls="search-suggestions-list"
                    />

                    {/* Clear button */}
                    {query && !loading && (
                      <button
                        onClick={() => setQuery('')}
                        className="w-8 h-8 rounded-full bg-stone-200/50 hover:bg-primary/10 flex items-center justify-center text-stone-500 hover:text-primary transition-all duration-300 flex-shrink-0 cursor-pointer"
                        aria-label="Clear search"
                      >
                        <span className="material-symbols-outlined text-[15px] leading-none">
                          close
                        </span>
                      </button>
                    )}

                    {/* Visual Search Button */}
                    {visualSearch?.isEnabled && (
                      <button
                        onClick={() => setSearchMode('visual')}
                        className="w-8 h-8 rounded-full bg-stone-200/50 hover:bg-[#d4af37]/10 flex items-center justify-center text-stone-500 hover:text-[#d4af37] transition-all duration-300 flex-shrink-0 cursor-pointer"
                        aria-label="Search by Image"
                      >
                        <span className="material-symbols-outlined text-[18px] leading-none">
                          photo_camera
                        </span>
                      </button>
                    )}

                    {/* Keyboard shortcut hint */}
                    <kbd className="hidden md:flex items-center justify-center px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-[9px] font-bold tracking-widest text-stone-500 shadow-xs select-none font-mono">
                      ESC
                    </kbd>
                  </>
                )}
              </div>

              {/* Category Prediction Pills (Only in text mode) */}
              {searchMode === 'text' &&
                predictedCategories.length > 0 &&
                query.trim().length >= 2 && (
                  <div className="px-6 md:px-8.5 pb-4 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mr-1">
                      Matching Category:
                    </span>
                    {predictedCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() =>
                          onSelectSuggestion({ id: `cat:${cat}`, title: cat, type: 'category' })
                        }
                        className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border border-primary/10 cursor-pointer"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

              {/* Divider */}
              {searchMode === 'text' && (showSuggestions || showEmptyState || showNoResults) && (
                <div className="mx-6 md:mx-8.5 h-[1px] bg-stone-200/50" />
              )}

              {/* Content Area */}
              <div
                ref={listRef}
                id="search-suggestions-list"
                role="listbox"
                className="max-h-[50vh] overflow-y-auto overflow-x-hidden overscroll-contain pb-2"
              >
                {searchMode === 'visual' ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full px-6 md:px-8.5 py-6 flex flex-col gap-5"
                  >
                    {/* Drag and Drop Zone */}
                    <div
                      onDragEnter={handleDragEnter}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`vs-upload-zone ${isDragging ? 'dragging' : ''}`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[32px]">
                            cloud_upload
                          </span>
                        </div>
                        <div>
                          <p className="text-on-surface font-semibold text-[15px]">
                            Upload an image
                          </p>
                          <p className="text-on-surface-variant/60 text-[12px] mt-1">
                            Drag and drop or click to browse
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Camera Action Row */}
                    <div className="flex gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startCamera();
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors text-on-surface-variant font-bold text-[13px] uppercase tracking-wider cursor-pointer bg-white"
                      >
                        <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                        Use Camera
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {/* ── Text Search Mode Content ── */}
                    {correctedQuery &&
                      query.trim().toLowerCase() !== correctedQuery.toLowerCase() && (
                        <div className="px-6 md:px-8.5 py-3.5 bg-primary/5 text-primary text-[13px] font-medium flex items-center gap-2 border-b border-[#d0c5af]/15">
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

                    {/* ── Suggestions ── */}
                    {showSuggestions && (
                      <div className="py-2">
                        {suggestions.map((item, idx) => (
                          <button
                            key={item.id}
                            data-suggestion
                            role="option"
                            aria-selected={activeIndex === idx}
                            onClick={() => onSelectSuggestion(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`w-full flex items-center gap-4.5 px-6 md:px-8.5 py-2.5 text-left transition-all duration-200 group border-b border-stone-100/30 last:border-b-0 ${
                              activeIndex === idx
                                ? 'bg-primary/8 translate-x-1'
                                : 'hover:bg-stone-50/50 hover:translate-x-0.5'
                            }`}
                          >
                            {/* Thumbnail or Icon */}
                            {item.image ? (
                              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200/60 shadow-xs group-hover:scale-105 transition-transform duration-300">
                                <CloudinaryImage
                                  src={item.image}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                  containerClassName="w-full h-full"
                                  width={80}
                                  height={80}
                                  loading="eager"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/8 flex items-center justify-center flex-shrink-0 border border-primary/10">
                                <span className="material-symbols-outlined text-[22px] text-primary">
                                  {getTypeIcon(item.type)}
                                </span>
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[15px] md:text-[16px] text-stone-800 font-display font-medium truncate leading-snug group-hover:text-primary transition-colors duration-200">
                                  {highlightMatch(item.title, query)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.category && item.type !== 'category' && (
                                  <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                                    {item.category}
                                  </span>
                                )}
                                {item.price > 0 && (
                                  <span className="text-[13px] text-primary font-display font-semibold italic">
                                    {formatPrice(item.price)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Type Badge */}
                            <span className="hidden md:inline-flex px-2.5 py-1 bg-stone-100 rounded-lg text-[9px] font-bold uppercase tracking-widest text-stone-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-300">
                              {getTypeLabel(item.type)}
                            </span>

                            {/* Arrow icon */}
                            <span className="material-symbols-outlined text-[18px] text-stone-300 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300">
                              north_east
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* View all results */}
                    {query.trim().length >= 2 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onExecuteSearch(query);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-6 md:px-8 py-4 text-primary font-bold text-[12px] uppercase tracking-widest hover:bg-primary/5 transition-colors border-t border-stone-200/50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">search</span>
                        View all results for "{query}"
                      </button>
                    )}

                    {/* ── No Results ── */}
                    {showNoResults && (
                      <div className="py-12 text-center space-y-3">
                        <span className="material-symbols-outlined text-[42px] text-stone-300 mb-2 block">
                          search_off
                        </span>
                        <p className="text-[15px] text-stone-600 font-medium">
                          No results for "{query}"
                        </p>
                        <p className="text-[12px] text-stone-400 max-w-xs mx-auto font-light">
                          Try different spelling or keywords, or explore categories below.
                        </p>
                      </div>
                    )}

                    {/* ── Empty State: Trending + Recent ── */}
                    {showEmptyState && (
                      <div className="py-2">
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between px-6 md:px-8.5 py-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                                Recent Searches
                              </span>
                              <button
                                onClick={onClearRecent}
                                className="text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors cursor-pointer"
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
                                className="flex items-center gap-3 px-6 md:px-8.5 py-1.5 hover:bg-stone-50/60 transition-all border-b border-stone-100/30 last:border-b-0 group cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px] text-stone-300 group-hover:text-primary transition-colors">
                                  history
                                </span>
                                <span className="flex-1 text-[13px] text-stone-600 group-hover:text-stone-900 font-medium transition-colors">
                                  {search}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveRecent(search);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full flex items-center justify-center hover:bg-stone-200/50 cursor-pointer"
                                  aria-label={`Remove ${search}`}
                                >
                                  <span className="material-symbols-outlined text-[14px] text-stone-400 hover:text-stone-700">
                                    close
                                  </span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Suggested Searches List */}
                        <div
                          className={`pt-2 pb-1.5 ${recentSearches.length > 0 ? 'border-t border-stone-200/30 mt-2' : ''}`}
                        >
                          <div className="px-6 md:px-8.5 py-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                              Suggested Searches
                            </span>
                          </div>
                          {combinedSuggestions.map((term) => (
                            <div
                              key={term}
                              onClick={() => {
                                setQuery(term);
                                onExecuteSearch(term);
                              }}
                              className="flex items-center gap-3 px-6 md:px-8.5 py-1.5 hover:bg-stone-50/60 transition-all border-b border-stone-100/30 last:border-b-0 group cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px] text-primary/55 group-hover:text-primary transition-colors">
                                search
                              </span>
                              <span className="flex-1 text-[13px] text-stone-600 group-hover:text-stone-900 font-medium transition-colors">
                                {term}
                              </span>
                              <span className="material-symbols-outlined text-[15px] text-stone-300 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                north_east
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Bottom Keyboard Guide hints */}
            <div className="hidden md:flex items-center justify-center gap-6 mt-6 text-white/50 text-[11px] font-bold uppercase tracking-widest select-none">
              <span className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/10 rounded-md text-[10px] font-mono shadow-xs">
                  ↑↓
                </kbd>
                Navigate
              </span>
              <span className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/10 rounded-md text-[10px] font-mono shadow-xs">
                  ↵
                </kbd>
                Select
              </span>
              <span className="flex items-center gap-2">
                <kbd className="px-2 py-0.5 bg-white/10 border border-white/10 rounded-md text-[10px] font-mono shadow-xs">
                  esc
                </kbd>
                Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default IntelligentSearchOverlay;
