import { useMemo } from 'react';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { galleryService } from '../services/domainServices';

/**
 * useInfiniteGallery — Custom hook for cursor-based/page-based infinite loading of gallery items.
 *
 * Features:
 * - Integrates with React Query's useInfiniteQuery
 * - Handles filtering (category, search, style, type, event)
 * - Computes flat array of items from all pages
 * - Deduplicates items across pages
 */
export function useInfiniteGallery(filters = {}) {
  const { category, type, search, ...dynamicFilters } = filters;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['infiniteGallery', category, type, search, dynamicFilters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = {
        page: pageParam,
        limit: 20, // Load 20 items per page
      };

      // Only add filters if they are not the "All" default
      if (category && category !== 'All') params.category = category;
      if (type && type !== 'all') params.type = type;
      if (search && search.trim() !== '') params.search = search;

      // Inject dynamic filters (like tags, style, event)
      Object.keys(dynamicFilters).forEach((key) => {
        if (dynamicFilters[key]) {
          params[key] = dynamicFilters[key];
        }
      });

      const res = await galleryService.getAll(params);
      if (!res.success) throw new Error('Failed to fetch gallery items');

      return res.data; // { data: items[], currentPage, totalPages, hasNextPage, totalCount }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage?.hasNextPage) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const formattedItems = useMemo(() => {
    // Flatten pages into a single array and deduplicate just in case
    const items = data?.pages ? data.pages.flatMap((page) => page.data || []) : [];

    // Deduplicate by ID
    const uniqueItems = Array.from(
      new Map(items.map((item) => [item._id || item.id, item])).values(),
    );

    // Enhance items with varied heights for masonry layout
    return uniqueItems.map((item) => {
      let cssHeight = item.height || 'aspect-[3/4]';
      if (item.aspectRatio) {
        // Handle numeric or string aspect ratio
        cssHeight =
          typeof item.aspectRatio === 'number'
            ? `aspect-[${item.aspectRatio}]`
            : `aspect-[${item.aspectRatio.replace(':', '/')}]`;
      }

      return {
        ...item,
        id: item._id || item.id,
        height: cssHeight,
      };
    });
  }, [data?.pages]);

  return {
    items: formattedItems,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  };
}

export default useInfiniteGallery;

export function useGalleryDynamicFilters(queryParams = {}) {
  return useQuery({
    queryKey: ['galleryDynamicFilters', queryParams],
    queryFn: async () => {
      const params = { ...queryParams };
      // Strip out non-filter params
      delete params.page;
      delete params.limit;
      delete params.spellcheck;

      const res = await galleryService.getDynamicFilters(params);
      if (!res.success) throw new Error('Failed to fetch dynamic filters for gallery');
      return res.data; // array of filterGroups
    },
    staleTime: 5 * 60 * 1000,
  });
}
