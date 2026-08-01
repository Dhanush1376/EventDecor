import { ArrowLeft, Search, X, Camera } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

export function SearchInputHeader({
  isMobile,
  searchMode,
  setSearchMode,
  onClose,
  query,
  setQuery,
  onKeyDown,
  inputRef,
  loading,
  isRecording,
  toggleVoiceSearch,
  visualSearch,
  showSuggestions,
}) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholders = [
    'Search wedding decor...',
    'Find gift hampers...',
    'Search by occasion...',
    'Browse pooja items...',
    'Search return gifts...',
  ];

  useEffect(() => {
    if (query) return; // Pause rotation when user is typing
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [query, placeholders.length]);

  const currentPlaceholder = placeholders[placeholderIndex];

  if (isMobile) {
    return (
      <div className="flex items-center gap-2 px-3 pb-3 pt-[calc(12px+env(safe-area-inset-top,0px))] bg-surface border-b border-outline-variant/25 flex-shrink-0">
        {/* Back Button */}
        <button
          onClick={searchMode === 'visual' ? () => setSearchMode('text') : onClose}
          className="w-8 h-8 min-h-0 rounded-full flex items-center justify-center text-stone-700 active:bg-stone-200/60 transition-colors flex-shrink-0"
          aria-label={searchMode === 'visual' ? 'Back to text search' : 'Close search'}
        >
          <ArrowLeft className="text-[20px]" strokeWidth={1.5} />
        </button>

        {searchMode === 'visual' ? (
          <h2 className="flex-1 text-[17px] text-stone-900 font-display font-medium px-1">
            Search by Image
          </h2>
        ) : (
          /* Search Input Pill container */
          <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-outline-variant/40 rounded-full focus-within:border-primary/40 focus-within:bg-white transition-all duration-300">
            <Search className="text-[20px] text-stone-400 select-none" strokeWidth={1.5} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={currentPlaceholder}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-[15.5px] text-stone-900 placeholder:text-stone-400/60 py-0.5 search-portal-input transition-all duration-300"
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

            {loading ? (
              <div className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center bg-stone-100 flex-shrink-0">
                <div className="w-3.5 h-3.5 border-[1.5px] border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : query ? (
              <button
                onClick={() => setQuery('')}
                className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center bg-stone-200/50 text-stone-500 active:bg-stone-300/50 transition-all flex-shrink-0"
                aria-label="Clear search"
              >
                <X className="text-[15px]" strokeWidth={1.5} />
              </button>
            ) : null}

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
                onClick={() => visualSearch.open()}
                className="w-7 h-7 min-h-0 rounded-full flex items-center justify-center bg-stone-100 text-stone-500 active:bg-stone-200 transition-all flex-shrink-0"
                aria-label="Search by Image"
              >
                <Camera className="text-[16px]" strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4.5 lg:px-8.5 lg:py-5.5 relative min-h-[72px]">
      {searchMode === 'visual' ? (
        <>
          <button
            onClick={() => setSearchMode('text')}
            className="w-8 h-8 min-h-0 rounded-full bg-stone-200/50 hover:bg-stone-300/50 flex items-center justify-center text-stone-600 transition-all duration-300 flex-shrink-0 cursor-pointer -ml-2"
            aria-label="Back to text search"
          >
            <ArrowLeft className="text-[20px]" strokeWidth={1.5} />
          </button>
          <h2 className="flex-1 text-[18px] lg:text-[20px] text-stone-900 font-display font-medium">
            Search by Image
          </h2>
        </>
      ) : (
        <>
          <Search
            className="text-[26px] text-primary flex-shrink-0 select-none transition-colors duration-500"
            strokeWidth={1.5}
          />
          <div className="flex-1 min-w-0 relative">
            <AnimatePresence mode="wait">
              {!query && (
                <motion.div
                  key={placeholderIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center pointer-events-none"
                >
                  <span className="text-[18px] lg:text-[20px] text-stone-400/70 font-body font-normal">
                    {currentPlaceholder}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder=""
              className="w-full bg-transparent border-none outline-none appearance-none ring-0 focus:ring-0 focus:outline-none focus:border-transparent text-[18px] lg:text-[20px] text-stone-900 font-body font-normal search-portal-input relative z-10"
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
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
            {/* Loading or Clear button */}
            {loading ? (
              <div
                className="flex items-center justify-center rounded-full bg-stone-100"
                style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  minHeight: '36px',
                }}
              >
                <div className="w-4 h-4 border-[2px] border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : query ? (
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
                <X className="text-[16px] leading-none" strokeWidth={1.5} />
              </button>
            ) : null}

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
                onClick={() => visualSearch.open()}
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
                <Camera className="text-[20px] leading-none" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Keyboard shortcut hint */}
          <kbd className="hidden lg:flex items-center justify-center px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-[9px] font-bold tracking-widest text-stone-500 shadow-xs select-none font-mono">
            ESC
          </kbd>
        </>
      )}
    </div>
  );
}
