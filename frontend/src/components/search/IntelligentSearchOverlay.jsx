import { m as motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';
import '../../styles/visual-search.css';
import logger from '../../utils/core/logger';

import { SearchInputHeader } from './SearchInputHeader';
import { SearchSuggestionsList } from './SearchSuggestionsList';
import { SearchDiscovery } from './SearchDiscovery';
import { VisualSearchPanel } from './VisualSearchPanel';

/**
 * IntelligentSearchOverlay — premium luxury search portal experience.
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
  const handleClose = onClose;

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
  const [_isDragging, setIsDragging] = useState(false);
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
      toast.error(
        "Your browser doesn't support voice search. Try a modern browser like Chrome or Safari.",
      );
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
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
      logger.error('Speech recognition error: ', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
    } catch (err) {
      logger.error('Failed to start speech recognition: ', err);
    }
  }, [isRecording, setQuery]);

  // Auto-focus input when opened and Focus Trap
  useEffect(() => {
    let focusTimer;
    if (isOpen) {
      setSearchMode(initialMode);
      if (initialMode === 'text') {
        focusTimer = setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }

      // Focus Trap
      const overlayElement = document.querySelector('[role="dialog"][aria-label="Search Portal"]');
      const handleTab = (e) => {
        if (e.key === 'Tab' && overlayElement) {
          const focusableElements = overlayElement.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusableElements.length) {
            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              last.focus();
              e.preventDefault();
            } else if (!e.shiftKey && document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };
      window.addEventListener('keydown', handleTab);
      return () => {
        clearTimeout(focusTimer);
        window.removeEventListener('keydown', handleTab);
      };
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
    const isMobileDevice =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

    if (isMobileDevice || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-suggestion]');
      if (items[activeIndex]) {
        items[activeIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  const showEmptyState = query.trim().length < 2 && !loading;
  const showSuggestions = suggestions.length > 0 && query.trim().length >= 2;
  const showNoResults = !loading && query.trim().length >= 2 && suggestions.length === 0;

  return (
    <AnimatePresence>
      {isOpen &&
        (isMobile ? (
          /* Mobile Search Overlay */
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

            <SearchInputHeader
              isMobile={isMobile}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              onClose={onClose}
              query={query}
              setQuery={setQuery}
              onKeyDown={onKeyDown}
              inputRef={inputRef}
              loading={loading}
              isRecording={isRecording}
              toggleVoiceSearch={toggleVoiceSearch}
              visualSearch={visualSearch}
              showSuggestions={showSuggestions}
            />

            {/* Mobile Body Content Area */}
            {searchMode === 'visual' ? (
              <VisualSearchPanel
                handleDragEnter={handleDragEnter}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                fileInputRef={fileInputRef}
                startCamera={startCamera}
                isMobile={true}
              />
            ) : (
              <div
                ref={listRef}
                id="search-suggestions-list"
                role="listbox"
                className="flex-1 overflow-y-auto bg-white flex flex-col overscroll-contain"
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

                <SearchSuggestionsList
                  query={query}
                  setQuery={setQuery}
                  correctedQuery={correctedQuery}
                  suggestions={suggestions}
                  loading={loading}
                  activeIndex={activeIndex}
                  setActiveIndex={setActiveIndex}
                  onSelectSuggestion={onSelectSuggestion}
                  onExecuteSearch={onExecuteSearch}
                  isMobile={true}
                />

                {showEmptyState && (
                  <SearchDiscovery
                    discoveryData={discoveryData}
                    recentSearches={recentSearches}
                    setQuery={setQuery}
                    onExecuteSearch={onExecuteSearch}
                    onRemoveRecent={onRemoveRecent}
                    onClearRecent={onClearRecent}
                    handleClose={handleClose}
                    isMobile={true}
                  />
                )}
              </div>
            )}

            {/* iOS Safari/Chrome keyboard bottom gap cover */}
            <div className="absolute top-full left-0 right-0 h-[600px] bg-white pointer-events-none" />
          </motion.div>
        ) : (
          /* Desktop Overlay */
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-950/65 backdrop-blur-[24px]"
              onClick={onClose}
            />

            <div
              className="absolute top-[10%] left-1/4 w-[380px] h-[380px] bg-primary/10 rounded-full filter blur-[100px] pointer-events-none animate-pulse"
              style={{ animationDuration: '8s' }}
            />
            <div
              className="absolute bottom-[20%] right-1/4 w-[420px] h-[420px] bg-amber-500/5 rounded-full filter blur-[120px] pointer-events-none animate-pulse"
              style={{ animationDuration: '10s', animationDelay: '2s' }}
            />

            <motion.div
              initial={{ opacity: 0, y: -24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-2xl mx-auto mt-[8vh] lg:mt-[12vh] px-4"
            >
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

              <div className="bg-[#fcfbf9]/95 border-none rounded-[32px] shadow-[0_32px_80px_-10px_rgba(27,24,20,0.18)] focus-within:shadow-[0_32px_80px_-10px_rgba(184,157,112,0.12)] transition-all duration-500 overflow-hidden">
                <SearchInputHeader
                  isMobile={false}
                  searchMode={searchMode}
                  setSearchMode={setSearchMode}
                  onClose={onClose}
                  query={query}
                  setQuery={setQuery}
                  onKeyDown={onKeyDown}
                  inputRef={inputRef}
                  loading={loading}
                  isRecording={isRecording}
                  toggleVoiceSearch={toggleVoiceSearch}
                  visualSearch={visualSearch}
                  showSuggestions={showSuggestions}
                />

                {/* Category Prediction Pills */}
                {searchMode === 'text' &&
                  predictedCategories.length > 0 &&
                  query.trim().length >= 2 && (
                    <div className="px-6 lg:px-8.5 pb-4 flex items-center gap-2 flex-wrap">
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
                  <div className="mx-6 lg:mx-8.5 h-[1px] bg-stone-200/50" />
                )}

                <div
                  ref={listRef}
                  id="search-suggestions-list"
                  role="listbox"
                  className="max-h-[50vh] overflow-y-auto overflow-x-hidden overscroll-contain pb-2"
                >
                  {searchMode === 'visual' ? (
                    <VisualSearchPanel
                      handleDragEnter={handleDragEnter}
                      handleDragOver={handleDragOver}
                      handleDragLeave={handleDragLeave}
                      handleDrop={handleDrop}
                      fileInputRef={fileInputRef}
                      startCamera={startCamera}
                      isMobile={false}
                    />
                  ) : (
                    <>
                      <SearchSuggestionsList
                        query={query}
                        setQuery={setQuery}
                        correctedQuery={correctedQuery}
                        suggestions={suggestions}
                        loading={loading}
                        activeIndex={activeIndex}
                        setActiveIndex={setActiveIndex}
                        onSelectSuggestion={onSelectSuggestion}
                        onExecuteSearch={onExecuteSearch}
                        isMobile={false}
                      />

                      {showEmptyState && (
                        <SearchDiscovery
                          discoveryData={discoveryData}
                          recentSearches={recentSearches}
                          setQuery={setQuery}
                          onExecuteSearch={onExecuteSearch}
                          onRemoveRecent={onRemoveRecent}
                          onClearRecent={onClearRecent}
                          handleClose={handleClose}
                          isMobile={false}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="hidden lg:flex items-center justify-center gap-6 mt-6 text-white/50 text-[11px] font-bold uppercase tracking-widest select-none">
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
