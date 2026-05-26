import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../services/searchService';

const RECENT_SEARCHES_KEY = 'siri_recent_searches';
const MAX_RECENT = 8;

/**
 * useSearchOverlay — manages the intelligent floating search overlay.
 * 
 * Features:
 * - Global Cmd+K / Ctrl+K keyboard shortcut to open
 * - Debounced autocomplete with API calls
 * - Recent searches persistence (localStorage)
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Category prediction from query intent
 * - Trending searches on empty state
 */
export function useSearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [predictedCategories, setPredictedCategories] = useState([]);
  const [correctedQuery, setCorrectedQuery] = useState('');
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef(null);
  const searchRequestIdRef = useRef(0);
  const navigate = useNavigate();

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, MAX_RECENT));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Fetch trending searches when overlay opens with empty query
  useEffect(() => {
    if (isOpen && trendingSearches.length === 0) {
      searchService.getTrending({ limit: 8 })
        .then((res) => {
          if (res?.success && res.data?.searches) {
            setTrendingSearches(res.data.searches);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, trendingSearches.length]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  const handleClose = useCallback(() => {
    searchRequestIdRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsOpen(false);
    setQuery('');
    setSuggestions([]);
    setPredictedCategories([]);
    setCorrectedQuery('');
    setActiveIndex(-1);
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      // Escape closes
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSuggestions([]);
      setPredictedCategories([]);
      setCorrectedQuery('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setActiveIndex(-1);

    // Cancel previous request if still pending
    const abortController = new AbortController();
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchService.autocomplete(query, { 
          limit: 8,
          signal: abortController.signal 
        });
        
        if (searchRequestIdRef.current === requestId && res?.success && res.data) {
          const filtered = (res.data.suggestions || []).filter(item => item.type !== 'gallery');
          setSuggestions(filtered);
          setPredictedCategories(res.data.predictedCategories || []);
          setCorrectedQuery(res.data.correctedQuery || '');
        }
      } catch (err) {
        const canceled = err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled';
        if (!canceled && searchRequestIdRef.current === requestId) {
          setSuggestions([]);
          setCorrectedQuery('');
        }
      } finally {
        if (searchRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }, 250); // 250ms debounce for fast feel but reduced API load

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortController.abort(); // Cancel request on unmount or query change
    };
  }, [query]);

  // Save a search to recent history
  const saveRecentSearch = useCallback((searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) return;

    const trimmed = searchQuery.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  // Remove a single recent search
  const removeRecentSearch = useCallback((searchQuery) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s !== searchQuery);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  // Clear all recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Navigate to a suggestion
  const selectSuggestion = useCallback((suggestion) => {
    saveRecentSearch(suggestion.title || query);

    if (suggestion.type === 'category') {
      navigate(`/collections?category=${encodeURIComponent(suggestion.title)}`);
    } else if (suggestion.type === 'product') {
      navigate(`/product/${suggestion.slug || suggestion.id}`);
    } else if (suggestion.type === 'event') {
      navigate(`/events/${suggestion.slug || suggestion.id}`);
    } else if (suggestion.type === 'gallery') {
      navigate(`/gallery/${suggestion.id}`);
    } else {
      navigate(`/collections?search=${encodeURIComponent(suggestion.title)}`);
    }

    handleClose();
  }, [navigate, query, saveRecentSearch]);

  // Execute a full search
  const executeSearch = useCallback((searchQuery) => {
    const q = (searchQuery || query).trim();
    if (q.length < 1) return;

    saveRecentSearch(q);
    navigate(`/collections?search=${encodeURIComponent(q)}`);
    handleClose();
  }, [navigate, query, saveRecentSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    const itemCount = suggestions.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          selectSuggestion(suggestions[activeIndex]);
        } else {
          executeSearch(query);
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
      default:
        break;
    }
  }, [suggestions, activeIndex, selectSuggestion, executeSearch, query]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    query,
    setQuery,
    suggestions,
    predictedCategories,
    correctedQuery,
    trendingSearches,
    recentSearches,
    loading,
    activeIndex,
    setActiveIndex,
    handleOpen,
    handleClose,
    handleKeyDown,
    selectSuggestion,
    executeSearch,
    removeRecentSearch,
    clearRecentSearches,
    saveRecentSearch,
  };
}

export default useSearchOverlay;
