import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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
  discoveryData,
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
  const isMobile = useMediaQuery('(max-width: 767px)');
  const navigate = useNavigate();
  const handleClose = onClose;

  const fallbackCollections = [
    { title: 'Wedding Decors', icon: 'favorite' },
    { title: 'Pooja Settings', icon: 'self_improvement' },
    { title: 'Birthday Setups', icon: 'cake' },
    { title: 'Engagement Trays', icon: 'diamond' },
    { title: 'House Warming', icon: 'home' },
  ];

  const dynamicTrending = useMemo(() => {
    if (discoveryData?.trending && discoveryData.trending.length > 0) {
      return discoveryData.trending;
    }
    const terms = new Set();

    if (discoveryData?.eventCollections && discoveryData.eventCollections.length > 0) {
      discoveryData.eventCollections.forEach((c) => {
        if (c.title) terms.add(c.title);
      });
    }

    if (discoveryData?.popularProducts && discoveryData.popularProducts.length > 0) {
      discoveryData.popularProducts.forEach((p) => {
        if (p.title) {
          const words = p.title.trim().split(/\s+/);
          if (words.length <= 2) {
            terms.add(p.title);
          } else {
            terms.add(words.slice(0, 2).join(' '));
          }
        }
      });
    }

    const defaults = [
      'Marigold Garland',
      'Brass Diya',
      'Stage Backdrop',
      'Coconut Decor',
      'Banana Leaf Stage',
    ];
    defaults.forEach((d) => terms.add(d));

    return Array.from(terms).map((t) => ({ query: t }));
  }, [discoveryData]);

  const handleVisualImageSelectAndRedirect = useCallback(
    (file) => {
      if (!file) return;
      visualSearch.open();
      visualSearch.handleImageSelect(file, 'upload');
    },
    [visualSearch],
  );
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const [searchMode, setSearchMode] = useState('text'); // 'text' | 'visual'
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Toggle voice search recording
  const toggleVoiceSearch = useCallback(() => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(
        "Your browser doesn't support voice search. Try a modern browser like Chrome or Safari.",
      );
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    // Set to true so user sees words as they speak, giving that cool interactive feel
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('');
      setQuery(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Optional: you can auto-execute the search here by calling onExecuteSearch(query)
      // but usually users prefer to see the interpreted text first.
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  }, [isRecording, setQuery]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchMode(initialMode);
      if (initialMode === 'text' && inputRef.current)
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialMode]);

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
        handleVisualImageSelectAndRedirect(file);
      }
    },
    [handleVisualImageSelectAndRedirect],
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

  // We no longer mix static suggestions, we just use the discovery modules in empty state
  // This combinedSuggestions is preserved for mobile view empty state to map over trending if it exists
  const combinedSuggestions = useMemo(() => {
    return Array.isArray(trendingSearches)
      ? trendingSearches.map((t) => (typeof t === 'string' ? t : t.query)).slice(0, 8)
      : [];
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
      {isOpen &&
        (isMobile ? (
          /* Mobile Search Overlay (Full-screen, light blue header theme matching Image 2) */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[9999] flex flex-col bg-white font-body"
            role="dialog"
            aria-modal="true"
            aria-label="Search Portal"
          >
            {/* Hidden File Inputs for Visual Search */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVisualImageSelectAndRedirect(file);
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
                if (file) handleVisualImageSelectAndRedirect(file);
              }}
              className="hidden"
            />

            {/* Mobile Header Bar - light sky blue styling */}
            <div className="flex items-center gap-2 px-3 pb-3 pt-[calc(12px+env(safe-area-inset-top,0px))] bg-surface border-b border-outline-variant/25 flex-shrink-0">
              {/* Back Button */}
              {searchMode === 'visual' ? (
                <button
                  onClick={() => setSearchMode('text')}
                  className="w-8 h-8 min-h-0 rounded-full flex items-center justify-center text-stone-700 active:bg-stone-200/60 transition-colors flex-shrink-0"
                  aria-label="Back to text search"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="w-8 h-8 min-h-0 rounded-full flex items-center justify-center text-stone-700 active:bg-stone-200/60 transition-colors flex-shrink-0"
                  aria-label="Close search"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
              )}

              {searchMode === 'visual' ? (
                <h2 className="flex-1 text-[17px] text-stone-900 font-display font-medium px-1">
                  Search by Image
                </h2>
              ) : (
                /* Search Input Pill container */
                <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-full focus-within:border-primary/40 focus-within:bg-white transition-all duration-300">
                  <span className="material-symbols-outlined text-[20px] text-stone-400 select-none">
                    search
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Search decor, events..."
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-[15.5px] text-stone-900 placeholder:text-stone-400/60 py-0.5 search-portal-input"
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
                  />

                  {query && !loading && (
                    <button
                      onClick={() => setQuery('')}
                      className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center bg-stone-200/50 text-stone-500 active:bg-stone-300/50 transition-all flex-shrink-0"
                      aria-label="Clear search"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  )}

                  {(!query || isRecording) && (
                    <button
                      onClick={toggleVoiceSearch}
                      className={`relative w-7 h-7 min-h-0 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                        isRecording
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-stone-100 text-stone-500 active:bg-stone-200'
                      }`}
                      aria-label="Voice Search"
                    >
                      {isRecording && (
                        <span className="absolute inset-0 rounded-full bg-rose-400 opacity-25 animate-ping" />
                      )}
                      <span className="material-symbols-outlined text-[16px]">
                        {isRecording ? 'mic' : 'mic_none'}
                      </span>
                    </button>
                  )}

                  {!query && visualSearch?.isEnabled && (
                    <button
                      onClick={() => {
                        visualSearch.open();
                      }}
                      className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center bg-stone-100 text-stone-500 active:bg-stone-200 transition-all flex-shrink-0"
                      aria-label="Search by Image"
                    >
                      <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Body Content Area */}
            {searchMode === 'visual' ? (
              <div className="flex-1 overflow-y-auto bg-white px-5 py-6 flex flex-col gap-6">
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="vs-upload-zone"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
                    </div>
                    <div>
                      <p className="text-on-surface font-semibold text-[15px]">Upload an image</p>
                      <p className="text-on-surface-variant/60 text-[12px] mt-1">
                        Drag and drop or click to browse
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startCamera();
                  }}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border border-stone-200 active:bg-stone-50 text-stone-700 font-bold text-[13px] uppercase tracking-wider bg-white cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  Use Camera
                </button>
              </div>
            ) : (
              /* Text Search Results/Suggestions */
              <div
                ref={listRef}
                id="search-suggestions-list"
                role="listbox"
                className="flex-1 overflow-y-auto bg-white flex flex-col"
              >
                {predictedCategories.length > 0 && query.trim().length >= 2 && (
                  <div className="px-5 py-2.5 bg-stone-50 border-b border-stone-200/40 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mr-1">
                      Categories:
                    </span>
                    {predictedCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() =>
                          onSelectSuggestion({ id: `cat:${cat}`, title: cat, type: 'category' })
                        }
                        className="px-3.5 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-bold uppercase tracking-wider border border-primary/10"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {correctedQuery && query.trim().toLowerCase() !== correctedQuery.toLowerCase() && (
                  <div className="px-5 py-3.5 bg-primary/5 text-primary text-[13px] font-medium flex items-center gap-2 border-b border-stone-100">
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
                        className="font-bold underline"
                      >
                        {correctedQuery}
                      </button>
                      ?
                    </span>
                  </div>
                )}

                {loading && query.trim().length >= 2 && <SearchSuggestionsSkeleton />}

                {showSuggestions && (
                  <div className="divide-y divide-stone-100">
                    {suggestions.map((item, idx) => (
                      <button
                        key={item.id}
                        data-suggestion
                        role="option"
                        aria-selected={activeIndex === idx}
                        onClick={() => onSelectSuggestion(item)}
                        className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left active:bg-stone-50 transition-colors"
                      >
                        {item.image ? (
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200/60 shadow-xs">
                            <CloudinaryImage
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              containerClassName="w-full h-full"
                              width={64}
                              height={64}
                              loading="eager"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 border border-primary/10 text-primary">
                            <span className="material-symbols-outlined text-[20px]">
                              {getTypeIcon(item.type)}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-[14.5px] text-stone-800 font-medium truncate leading-tight">
                            {highlightMatch(item.title, query)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.category && item.type !== 'category' && (
                              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                {item.category}
                              </span>
                            )}
                            {item.price > 0 && (
                              <span className="text-[12px] text-primary font-semibold">
                                {formatPrice(item.price)}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="material-symbols-outlined text-[18px] text-stone-300 flex-shrink-0">
                          north_east
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {query.trim().length >= 2 &&
                  !showNoResults &&
                  (loading ? (
                    <div className="w-full py-4 px-5 border-t border-stone-100 flex items-center justify-center">
                      <Skeleton className="h-5 w-2/3 rounded-md" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onExecuteSearch(query);
                      }}
                      className="w-full py-4 text-center text-primary font-bold text-[12px] uppercase tracking-wider border-t border-stone-100 active:bg-stone-50"
                    >
                      View all results for "{query}"
                    </button>
                  ))}

                {showNoResults && (
                  <div className="py-16 text-center px-6">
                    <span className="material-symbols-outlined text-[48px] text-stone-300 mb-3 block">
                      search_off
                    </span>
                    <p className="text-[15px] text-stone-600 font-semibold">
                      No results for "{query}"
                    </p>
                    <p className="text-[12px] text-stone-400 mt-1">
                      Check spelling or try different keywords.
                    </p>
                  </div>
                )}

                {showEmptyState && (
                  <div className="divide-y divide-stone-100">
                    {recentSearches.length > 0 && (
                      <div className="py-1">
                        <div className="flex items-center justify-between px-5 py-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Recent Searches
                          </span>
                          <button
                            onClick={onClearRecent}
                            className="text-[10px] font-bold uppercase tracking-wider text-primary"
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
                            className="flex items-center gap-3.5 px-5 py-1.5 active:bg-stone-50 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px] text-stone-400">
                              history
                            </span>
                            <span className="flex-1 text-[13.5px] text-stone-700 font-medium">
                              {search}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveRecent(search);
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center active:bg-stone-200/60"
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

                    <div className="py-2">
                      {/* Discovery Engine Modules */}

                      {/* 0. Visual Search Onboarding Card */}
                      <div
                        onClick={() => {
                          handleClose();
                          navigate('/collections?visual=true');
                        }}
                        className="mx-5 mb-4 mt-2 p-3.5 rounded-2xl bg-gradient-to-r from-primary-container/15 via-surface-bright/95 to-primary-container/5 border border-primary-container/30 hover:border-primary-container/50 shadow-sm active:scale-[0.98] transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer group"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleClose();
                            navigate('/collections?visual=true');
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-container/15 flex items-center justify-center text-primary-container flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                            <span className="material-symbols-outlined text-[20px]">
                              photo_camera
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] text-stone-800 font-display font-semibold tracking-wide">
                              Have an image in mind?
                            </span>
                            <span className="text-[11px] text-stone-500 font-body font-normal mt-0.5">
                              Find matching decors using any photo
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="w-9 h-9 min-h-0 flex items-center justify-center bg-[#d4af37] hover:bg-stone-900 text-white rounded-full transition-colors shadow-md cursor-pointer flex-shrink-0 group-hover:scale-105"
                          aria-label="Upload Image"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClose();
                            navigate('/collections?visual=true');
                          }}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>

                      {/* 1. Event Collections */}
                      {((discoveryData?.eventCollections &&
                        discoveryData.eventCollections.length > 0) ||
                        true) && (
                        <div className="mb-4 mt-2">
                          <div className="px-5 mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
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
                                  navigate(
                                    `/collections?category=${encodeURIComponent(col.title)}`,
                                  );
                                }}
                                className="snap-start flex flex-col items-center gap-2 flex-shrink-0 active:scale-95 transition-transform"
                              >
                                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                                  <span className="material-symbols-outlined text-[24px]">
                                    {col.icon ||
                                      (col.title.includes('Wedding')
                                        ? 'favorite'
                                        : col.title.includes('Birthday')
                                          ? 'cake'
                                          : col.title.includes('Pooja')
                                            ? 'self_improvement'
                                            : col.title.includes('Engagement')
                                              ? 'diamond'
                                              : col.title.includes('Baby')
                                                ? 'child_care'
                                                : col.title.includes('House')
                                                  ? 'home'
                                                  : col.title.includes('Haldi') ||
                                                      col.title.includes('Mehendi')
                                                    ? 'spa'
                                                    : col.title.includes('Reception') ||
                                                        col.title.includes('Sangeet')
                                                      ? 'celebration'
                                                      : 'category')}
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

                      {/* 2. Trending Searches (Pill Chips) */}
                      {((discoveryData?.trending && discoveryData.trending.length > 0) || true) && (
                        <div className="mb-4">
                          <div className="px-5 mb-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[14px] text-orange-500">
                                local_fire_department
                              </span>
                              Trending Now
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 px-5">
                            {dynamicTrending.slice(0, 5).map((term, idx) => {
                              const queryStr = typeof term === 'string' ? term : term.query;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setQuery(queryStr);
                                    onExecuteSearch(queryStr);
                                  }}
                                  className="px-3.5 py-1.5 bg-stone-100/80 hover:bg-stone-200 border border-stone-200/60 rounded-full text-[12.5px] text-stone-700 font-medium transition-colors cursor-pointer"
                                >
                                  {queryStr}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 3. Popular Products */}
                      {discoveryData?.popularProducts?.length > 0 && (
                        <div className="mb-2">
                          <div className="px-5 mb-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                              Popular Items
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
                                    <p className="text-[11px] font-bold text-primary mt-0.5">
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
                )}
              </div>
            )}
          </motion.div>
        ) : (
          /* Desktop Overlay (original layout) */
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
                  if (file) handleVisualImageSelectAndRedirect(file);
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
                  if (file) handleVisualImageSelectAndRedirect(file);
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

                      {/* Action Buttons Group */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                        {/* Clear button */}
                        {query && !loading && (
                          <button
                            onClick={() => setQuery('')}
                            className="flex items-center justify-center rounded-full bg-stone-200/50 hover:bg-primary/10 text-stone-500 hover:text-primary transition-all duration-300 cursor-pointer"
                            style={{
                              width: '36px',
                              height: '36px',
                              minWidth: '36px',
                              minHeight: '36px',
                              padding: 0,
                            }}
                            aria-label="Clear search"
                          >
                            <span className="material-symbols-outlined text-[16px] leading-none">
                              close
                            </span>
                          </button>
                        )}

                        {/* Voice Search Button */}
                        <button
                          onClick={toggleVoiceSearch}
                          className={`relative flex items-center justify-center rounded-full transition-all duration-300 cursor-pointer ${
                            isRecording
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-stone-200/50 text-stone-500 hover:bg-[#d4af37]/10 hover:text-[#d4af37]'
                          }`}
                          style={{
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            minHeight: '36px',
                            padding: 0,
                          }}
                          aria-label="Voice Search"
                        >
                          {/* Cool animation ripples when recording */}
                          {isRecording && (
                            <>
                              <span
                                className="absolute inset-0 rounded-full bg-rose-400 opacity-25 animate-ping"
                                style={{ animationDuration: '1.5s' }}
                              />
                              <span
                                className="absolute inset-0 rounded-full bg-rose-300 opacity-20 animate-ping"
                                style={{ animationDuration: '2s', animationDelay: '0.4s' }}
                              />
                            </>
                          )}
                          <span className="material-symbols-outlined text-[20px] leading-none z-10">
                            {isRecording ? 'mic' : 'mic_none'}
                          </span>
                        </button>

                        {/* Visual Search Button */}
                        {visualSearch?.isEnabled && (
                          <button
                            onClick={() => {
                              visualSearch.open();
                            }}
                            className="flex items-center justify-center rounded-full bg-stone-200/50 hover:bg-[#d4af37]/10 text-stone-500 hover:text-[#d4af37] transition-all duration-300 cursor-pointer"
                            style={{
                              width: '36px',
                              height: '36px',
                              minWidth: '36px',
                              minHeight: '36px',
                              padding: 0,
                            }}
                            aria-label="Search by Image"
                          >
                            <span className="material-symbols-outlined text-[20px] leading-none">
                              photo_camera
                            </span>
                          </button>
                        )}
                      </div>

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
                        className="vs-upload-zone"
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
                          <span className="material-symbols-outlined text-[18px]">
                            photo_camera
                          </span>
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
                      {query.trim().length >= 2 &&
                        !showNoResults &&
                        (loading ? (
                          <div className="w-full flex items-center justify-center py-4 px-6 md:px-8 border-t border-stone-200/50">
                            <Skeleton className="h-5 w-1/3 rounded-md" />
                          </div>
                        ) : (
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
                        ))}

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

                          {/* Discovery Engine Modules for Desktop */}
                          <div
                            className={`pt-4 pb-2 ${recentSearches.length > 0 ? 'border-t border-stone-200/30 mt-3' : ''}`}
                          >
                            <div className="grid grid-cols-12 gap-8 px-6 md:px-8.5">
                              {/* Left Column: Trending & Collections */}
                              <div className="col-span-12 md:col-span-5 flex flex-col gap-6">
                                {/* 1. Trending Searches */}
                                {((discoveryData?.trending && discoveryData.trending.length > 0) ||
                                  true) && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 block flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-[14px] text-orange-500">
                                        local_fire_department
                                      </span>
                                      Trending Now
                                    </span>
                                    <div className="flex flex-wrap gap-2.5">
                                      {dynamicTrending.slice(0, 6).map((term, idx) => {
                                        const queryStr =
                                          typeof term === 'string' ? term : term.query;
                                        return (
                                          <button
                                            key={idx}
                                            onClick={() => {
                                              setQuery(queryStr);
                                              onExecuteSearch(queryStr);
                                            }}
                                            className="px-3.5 py-1.5 bg-stone-100/80 hover:bg-primary/10 hover:text-primary border border-stone-200/60 hover:border-primary/20 rounded-full text-[13px] text-stone-600 font-medium transition-colors cursor-pointer"
                                          >
                                            {queryStr}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* 2. Event Collections */}
                                {((discoveryData?.eventCollections &&
                                  discoveryData.eventCollections.length > 0) ||
                                  true) && (
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 block">
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
                                              navigate(
                                                `/collections?category=${encodeURIComponent(col.title)}`,
                                              );
                                            }}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors group border border-transparent hover:border-stone-200 text-left"
                                          >
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                              <span className="material-symbols-outlined text-[16px]">
                                                {col.icon ||
                                                  (col.title.includes('Wedding')
                                                    ? 'favorite'
                                                    : col.title.includes('Birthday')
                                                      ? 'cake'
                                                      : col.title.includes('Pooja')
                                                        ? 'self_improvement'
                                                        : col.title.includes('Engagement')
                                                          ? 'diamond'
                                                          : col.title.includes('Baby')
                                                            ? 'child_care'
                                                            : col.title.includes('House')
                                                              ? 'home'
                                                              : col.title.includes('Haldi') ||
                                                                  col.title.includes('Mehendi')
                                                                ? 'spa'
                                                                : col.title.includes('Reception') ||
                                                                    col.title.includes('Sangeet')
                                                                  ? 'celebration'
                                                                  : 'category')}
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
                              </div>

                              {/* Right Column: Popular Products & Visual Search */}
                              <div className="col-span-12 md:col-span-7 flex flex-col gap-6 relative">
                                {/* Divider on desktop */}
                                <div className="hidden md:block absolute left-[-16px] top-0 bottom-0 w-px bg-stone-200/40"></div>

                                {/* Welcome / Visual Search Inspiration Card */}
                                <div
                                  onClick={() => {
                                    handleClose();
                                    navigate('/collections?visual=true');
                                  }}
                                  className="p-4 rounded-2xl bg-gradient-to-r from-primary-container/15 via-[#fdfbf7]/90 to-primary-container/5 border border-primary-container/25 hover:border-primary-container/45 shadow-sm hover:shadow-luxury hover:scale-[1.01] transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer group"
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleClose();
                                      navigate('/collections?visual=true');
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-full bg-primary-container/15 flex items-center justify-center text-primary-container flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                                      <span className="material-symbols-outlined text-[22px]">
                                        photo_camera
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[15.5px] text-stone-800 font-display font-semibold tracking-wide">
                                        Visual Search Concierge
                                      </span>
                                      <span className="text-[12px] text-stone-500 font-body font-normal mt-0.5">
                                        Drag & drop or upload an image to find matching decors
                                        instantly
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="px-4 py-2 min-h-0 rounded-full bg-primary hover:bg-[#8c7335] text-white flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] shadow-md transition-all duration-300"
                                    aria-label="Open Visual Search"
                                    tabIndex={-1}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClose();
                                      navigate('/collections?visual=true');
                                    }}
                                  >
                                    <span>Upload Photo</span>
                                    <span className="material-symbols-outlined text-[14px]">
                                      arrow_forward
                                    </span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                                  {/* 3. Popular Products */}
                                  {discoveryData?.popularProducts?.length > 0 && (
                                    <div className="col-span-2 sm:col-span-1">
                                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 block">
                                        Popular Items
                                      </span>
                                      <div className="flex flex-col gap-3">
                                        {discoveryData.popularProducts
                                          .slice(0, 3)
                                          .map((product) => (
                                            <button
                                              key={product.id}
                                              onClick={() => {
                                                handleClose();
                                                navigate(`/product/${product.slug || product.id}`);
                                              }}
                                              className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-stone-50 transition-colors text-left group"
                                            >
                                              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-stone-200/50">
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

                                  {/* 4. New Arrivals */}
                                  {discoveryData?.newArrivals?.length > 0 && (
                                    <div className="col-span-2 sm:col-span-1">
                                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-3 block">
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
        ))}
    </AnimatePresence>
  );
}

export default IntelligentSearchOverlay;
