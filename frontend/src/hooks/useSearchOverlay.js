import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAutocomplete, useTrendingSearches, useDiscoveryData } from './useSearchQueries';
import { useSearchAnalytics } from './useSearchAnalytics';

const RECENT_SEARCHES_KEY = 'siri_recent_searches';
const MAX_RECENT = 12;

/**
 * useSearchOverlay — manages the intelligent floating search overlay.
 */
export function useSearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState('text');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortControllerRef = useRef(null);
  const navigate = useNavigate();
  const { trackEvent } = useSearchAnalytics();

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

  // Debounce the search query to minimize API calls and cancel previous requests
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const newController = new AbortController();
    abortControllerRef.current = newController;

    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => {
      clearTimeout(timer);
      newController.abort();
    };
  }, [query]);

  // Fetch full discovery data
  const discoveryQuery = useDiscoveryData({ enabled: isOpen && !debouncedQuery.trim() });

  // Extract components from discovery data
  const discoveryData = useMemo(() => {
    return (
      discoveryQuery.data || {
        trending: [],
        popularProducts: [],
        newArrivals: [],
        eventCollections: [],
      }
    );
  }, [discoveryQuery.data]);

  // Fallback for trending searches if discovery data is not ready
  const trendingQuery = useTrendingSearches({ limit: 8, enabled: isOpen && !discoveryQuery.data });
  const trendingSearches = useMemo(() => {
    return discoveryData.trending.length > 0
      ? discoveryData.trending
      : trendingQuery.data?.searches || [];
  }, [discoveryData.trending, trendingQuery.data]);

  // Fetch autocomplete suggestions via React Query
  const autocompleteQuery = useAutocomplete(debouncedQuery, {
    limit: 8,
    enabled: isOpen && debouncedQuery.trim().length >= 1,
    signal: abortControllerRef.current?.signal,
  });

  const predictedCategories = useMemo(() => {
    return autocompleteQuery.data?.predictedCategories || [];
  }, [autocompleteQuery.data]);

  const suggestions = useMemo(() => {
    let list = autocompleteQuery.data?.suggestions || autocompleteQuery.data?.items || [];
    const hasProducts = list.some((s) => s.type === 'product');

    if (hasProducts) {
      list = list.filter((s) => s.type !== 'keyword');
    }

    const groups = [
      { id: 'categories', items: [] },
      { id: 'collections', items: [] },
      { id: 'products', items: [] },
      { id: 'others', items: [] },
    ];

    list.forEach((item) => {
      if (item.type === 'category') groups[0].items.push(item);
      else if (item.type === 'event' || item.type === 'gallery') groups[1].items.push(item);
      else if (item.type === 'product') groups[2].items.push(item);
      else groups[3].items.push(item);
    });

    return groups.flatMap((g) => g.items);
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
    if (!searchQuery || searchQuery.trim().length < 1) return;

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
  const selectSuggestion = useCallback(
    (suggestion) => {
      saveRecentSearch(suggestion.title || query);
      trackEvent('suggestion_clicked', debouncedQuery, {
        itemId: suggestion.id,
        itemType: suggestion.type,
        itemTitle: suggestion.title,
      });

      if (suggestion.type === 'category') {
        navigate(`/collections?category=${encodeURIComponent(suggestion.title)}`);
      } else if (suggestion.type === 'product') {
        navigate(`/product/${suggestion.slug || suggestion.id}`);
      } else if (suggestion.type === 'event') {
        navigate(`/events/${suggestion.slug || suggestion.id}`);
      } else if (suggestion.type === 'gallery') {
        navigate(`/gallery/${suggestion.id}`);
      } else {
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/events')) {
          navigate(`/events?search=${encodeURIComponent(suggestion.title)}`);
        } else if (currentPath.startsWith('/gallery')) {
          navigate(`/gallery?search=${encodeURIComponent(suggestion.title)}`);
        } else {
          navigate(`/collections?search=${encodeURIComponent(suggestion.title)}`);
        }
      }

      handleClose();
    },
    [navigate, query, debouncedQuery, saveRecentSearch, handleClose, trackEvent],
  );

  // Execute a full search
  const executeSearch = useCallback(
    (searchQuery) => {
      const q = (searchQuery || query).trim();
      if (q.length < 1) return;

      saveRecentSearch(q);
      trackEvent('search_executed', q);

      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/events')) {
        navigate(`/events?search=${encodeURIComponent(q)}`);
      } else if (currentPath.startsWith('/gallery')) {
        navigate(`/gallery?search=${encodeURIComponent(q)}`);
      } else {
        navigate(`/collections?search=${encodeURIComponent(q)}`);
      }

      handleClose();
    },
    [navigate, query, saveRecentSearch, handleClose, trackEvent],
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
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
    },
    [suggestions, activeIndex, selectSuggestion, executeSearch, query, handleClose],
  );

  const handleOpen = useCallback((mode = 'text') => {
    setInitialMode(typeof mode === 'string' ? mode : 'text');
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    initialMode,
    query,
    setQuery,
    suggestions,
    predictedCategories,
    correctedQuery,
    discoveryData,
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
