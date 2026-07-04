import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProducts, useCategories, useDynamicFilters } from '../../hooks/useProductQueries';
import { useVisualSearch } from '../../hooks/useVisualSearch';
import { persistentStorage } from '../../utils/storage/persistentStorage';

export function useProductListingState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const visualSearch = useVisualSearch();
  const navigate = useNavigate();

  const categoryParam = searchParams.get('category') || searchParams.get('collection') || 'All';
  const searchParam = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const idsParam = searchParams.get('ids') || undefined;
  const couponParam = searchParams.get('coupon') || undefined;

  const [localSearch, setLocalSearch] = useState(searchParam);
  const [sortBy, setSortBy] = useState(() => {
    return persistentStorage.getItem('siri_sort_preference', { fallback: 'New Arrivals' });
  });
  const [filters, setFilters] = useState(() => {
    const saved = persistentStorage.getItem('siri_product_filters');
    if (saved && typeof saved === 'object') {
      return saved;
    }
    return {};
  });

  useEffect(() => {
    persistentStorage.setItem('siri_sort_preference', sortBy);
  }, [sortBy]);

  useEffect(() => {
    persistentStorage.setItem('siri_product_filters', filters);
  }, [filters]);

  // Sync external searchParam into localSearch
  useEffect(() => {
    setLocalSearch(searchParam);
  }, [searchParam]);

  // Debounce local typing into URL searchParams
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchParam) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (localSearch) next.set('search', localSearch);
            else next.delete('search');
            next.delete('page');
            return next;
          },
          { replace: true },
        );
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, searchParam, setSearchParams]);

  const sortMap = {
    Popularity: 'rating',
    'Price: Low to High': 'price_asc',
    'Price: High to Low': 'price_desc',
    'New Arrivals': 'newest',
  };

  const queryParams = {
    page: pageParam,
    limit: 50,
    search: searchParam,
    category: categoryParam !== 'All' ? categoryParam : undefined,
    ids: idsParam,
    coupon: couponParam,
    sort: sortMap[sortBy] || 'newest',
    spellcheck: searchParams.get('spellcheck') || undefined,
  };

  if (filters.priceRange && Array.isArray(filters.priceRange) && filters.priceRange.length > 0) {
    let min = Infinity;
    let max = -Infinity;
    filters.priceRange.forEach((range) => {
      const parts = range.split('-');
      const currentMin = parseInt(parts[0], 10) || 0;
      const currentMax = parts[1] ? parseInt(parts[1], 10) : Infinity;
      if (currentMin < min) min = currentMin;
      if (currentMax > max) max = currentMax;
    });
    if (min !== Infinity) queryParams.minPrice = min;
    if (max !== -Infinity && max !== Infinity) queryParams.maxPrice = max;
  }

  Object.keys(filters).forEach((key) => {
    if (key !== 'priceRange' && Array.isArray(filters[key]) && filters[key].length > 0) {
      queryParams[key] = filters[key].join(',');
    }
  });

  const { data: productsData, isLoading: loading, isFetching, isError } = useProducts(queryParams);
  const { data: filterGroups = [] } = useDynamicFilters(queryParams);
  const { data: categoriesData = [] } = useCategories();

  const categories = useMemo(() => {
    return ['All', ...categoriesData];
  }, [categoriesData]);

  const unifiedResults = useMemo(() => {
    if (!visualSearch.results) return [];
    const items = [];
    const seen = new Set();

    if (visualSearch.results.bestMatch) {
      items.push({ ...visualSearch.results.bestMatch, _isExactMatch: true });
      seen.add(visualSearch.results.bestMatch.id || visualSearch.results.bestMatch._id);
    }

    if (visualSearch.results.similarProducts) {
      visualSearch.results.similarProducts.forEach((p) => {
        const id = p.id || p._id;
        if (!seen.has(id)) {
          items.push(p);
          seen.add(id);
        }
      });
    }

    if (visualSearch.results.relatedProducts) {
      visualSearch.results.relatedProducts.forEach((p) => {
        const id = p.id || p._id;
        if (!seen.has(id)) {
          items.push(p);
          seen.add(id);
        }
      });
    }
    return items;
  }, [visualSearch.results]);

  const products = useMemo(() => {
    if (visualSearch.results) return unifiedResults;
    return productsData?.data || productsData?.products || [];
  }, [visualSearch.results, unifiedResults, productsData]);

  const totalPages = visualSearch.results ? 1 : productsData?.totalPages || 1;
  const totalCount = visualSearch.results ? unifiedResults.length : productsData?.totalCount || 0;

  const handleCategorySelect = useCallback(
    (cat) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (cat === 'All') {
          params.delete('category');
        } else {
          params.set('category', cat);
        }
        params.delete('page');
        return params;
      });
      setTimeout(() => {
        const element = document.getElementById('artisan-collection');
        if (element) {
          const yOffset = -80;
          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 50);
    },
    [setSearchParams],
  );

  const toggleFilter = useCallback((type, value) => {
    setFilters((prev) => {
      const current = prev[type] || [];
      const next = current.includes(value)
        ? current.filter((i) => i !== value)
        : [...current, value];

      if (next.length === 0) {
        const newFilters = { ...prev };
        delete newFilters[type];
        return newFilters;
      }
      return { ...prev, [type]: next };
    });
  }, []);

  const setFilterValue = useCallback((type, value) => {
    setFilters((prev) => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        const newFilters = { ...prev };
        delete newFilters[type];
        return newFilters;
      }
      return { ...prev, [type]: Array.isArray(value) ? value : [value] };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setSearchParams({});
    if (visualSearch.results) {
      visualSearch.reset();
    }
  }, [setSearchParams, visualSearch]);

  return useMemo(
    () => ({
      searchParams,
      setSearchParams,
      visualSearch,
      navigate,
      categoryParam,
      searchParam,
      pageParam,
      localSearch,
      setLocalSearch,
      sortBy,
      setSortBy,
      filters,
      toggleFilter,
      setFilterValue,
      clearAllFilters,
      productsData,
      loading,
      isFetching,
      isError,
      filterGroups,
      categories,
      unifiedResults,
      products,
      totalPages,
      totalCount,
      handleCategorySelect,
    }),
    [
      searchParams,
      setSearchParams,
      visualSearch,
      navigate,
      categoryParam,
      searchParam,
      pageParam,
      localSearch,
      setLocalSearch,
      sortBy,
      setSortBy,
      filters,
      toggleFilter,
      setFilterValue,
      clearAllFilters,
      productsData,
      loading,
      isFetching,
      isError,
      filterGroups,
      categories,
      unifiedResults,
      products,
      totalPages,
      totalCount,
      handleCategorySelect,
    ],
  );
}
