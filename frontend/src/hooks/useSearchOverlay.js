import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutocomplete, useTrendingSearches } from './useSearchQueries';

const RECENT_SEARCHES_KEY = 'siri_recent_searches';
const MAX_RECENT = 8;

/**
 * useSearchOverlay — manages the intelligent floating search overlay.
 */
export function useSearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
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

  // Debounce the search query to minimize API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch trending searches via React Query
  const trendingQuery = useTrendingSearches({ limit: 8, enabled: isOpen });
  const trendingSearches = useMemo(() => {
    return trendingQuery.data?.searches || [];
  }, [trendingQuery.data]);

  // Fetch autocomplete suggestions via React Query
  const autocompleteQuery = useAutocomplete(debouncedQuery, { 
    limit: 8, 
    enabled: isOpen && debouncedQuery.trim().length >= 2 
  });

  const suggestions = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const list = autocompleteQuery.data?.suggestions || [];
    return list.filter((item) => item.type !== 'gallery');
  }, [autocompleteQuery.data, debouncedQuery]);

  const predictedCategories = useMemo(() => {
    return autocompleteQuery.data?.predictedCategories || [];
  }, [autocompleteQuery.data]);

  const correctedQuery = useMemo(() => {
    return autocompleteQuery.data?.correctedQuery || '';
  }, [autocompleteQuery.data]);

  const loading = autocompleteQuery.isLoading;

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setDebouncedQuery('');
    setActiveIndex(-1);
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
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
  }, [navigate, query, saveRecentSearch, handleClose]);

  // Execute a full search
  const executeSearch = useCallback((searchQuery) => {
    const q = (searchQuery || query).trim();
    if (q.length < 1) return;

    saveRecentSearch(q);
    navigate(`/collections?search=${encodeURIComponent(q)}`);
    handleClose();
  }, [navigate, query, saveRecentSearch, handleClose]);

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
  }, [suggestions, activeIndex, selectSuggestion, executeSearch, query, handleClose]);

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
