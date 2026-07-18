import { useState, useCallback, useEffect, useMemo } from 'react';
import { recycleBinApi } from '../services/recycleBinService';
import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';

export const useRecycleBin = () => {
  // ── State ──
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [purgePreview, setPurgePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [totalCount, setTotalCount] = useState(0);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState({
    search: '',
    entityType: 'all',
    timeRange: '',
    sort: 'deletedAt',
    sortOrder: 'desc',
  });

  // ── Data Fetching ──
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await recycleBinApi.getItems({
        page,
        limit,
        ...filters,
      });
      const resultData = res.data || {};
      setItems(resultData.data || resultData.items || resultData || []);
      setTotalCount(resultData.totalCount || resultData.length || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch recycle bin items');
      toast.error('Failed to load recycle bin data');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  const fetchStatsAndPreview = useCallback(async () => {
    try {
      const [statsRes, previewRes] = await Promise.all([
        recycleBinApi.getStats(),
        recycleBinApi.getPurgePreview(),
      ]);
      setStats(statsRes.data);
      setPurgePreview(previewRes.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Debounced search to prevent API spam
  const debouncedSearch = useMemo(
    () =>
      debounce((searchTerm) => {
        setFilters((prev) => ({ ...prev, search: searchTerm }));
        setPage(1); // Reset to page 1 on new search
      }, 500),
    [],
  );

  // ── Effects ──
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchStatsAndPreview();
  }, [fetchStatsAndPreview]);

  // ── Handlers ──
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const selectAll = (pageIds) => {
    if (selectedIds.size === pageIds.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      setSelectedIds(new Set(pageIds)); // Select all on page
    }
  };

  // ── Mutations ──

  const restoreItem = async (id, options = {}) => {
    try {
      const res = await recycleBinApi.restoreItem(id, options);
      toast.success(res.message || 'Item restored successfully');
      setItems((prev) => prev.filter((item) => item._id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      fetchStatsAndPreview(); // Refresh stats
      return { success: true, data: res.data };
    } catch (err) {
      // Handle 409 Conflict specifically
      if (err.message.includes('HTTP 409')) {
        // We'll let the UI handle the conflict modal
        throw err;
      }
      toast.error(`Failed to restore: ${err.message}`);
      return { success: false, error: err };
    }
  };

  const permanentDelete = async (id) => {
    try {
      const res = await recycleBinApi.permanentDelete(id);
      toast.success('Item permanently deleted');
      setItems((prev) => prev.filter((item) => item._id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      fetchStatsAndPreview();
      return { success: true, report: res.data?.report };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      toast.error(`Failed to delete: ${errorMsg}`);
      return { success: false, error: err };
    }
  };

  const bulkRestore = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const loadingToast = toast.loading(`Restoring ${ids.length} items...`);
    try {
      const res = await recycleBinApi.bulkRestore(ids);
      toast.success(res.message || `Restored ${res.data.success} items`, { id: loadingToast });
      if (res.data.failed > 0) {
        toast.error(`${res.data.failed} items failed to restore or had conflicts`);
      }
      setSelectedIds(new Set());
      fetchItems();
      fetchStatsAndPreview();
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      toast.error(`Bulk restore failed: ${errorMsg}`, { id: loadingToast });
      return { success: false, error: err };
    }
  };

  const bulkPermanentDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const loadingToast = toast.loading(`Deleting ${ids.length} items...`);
    try {
      const res = await recycleBinApi.bulkPermanentDelete(ids);
      toast.success(res.message || `Permanently deleted ${res.data.success} items`, {
        id: loadingToast,
      });
      if (res.data.failed > 0) {
        toast.error(`${res.data.failed} items failed to delete`);
      }
      setSelectedIds(new Set());
      fetchItems();
      fetchStatsAndPreview();
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      toast.error(`Bulk delete failed: ${errorMsg}`, { id: loadingToast });
      return { success: false, error: err };
    }
  };

  const emptyBin = async () => {
    const loadingToast = toast.loading('Emptying recycle bin...');
    try {
      const res = await recycleBinApi.emptyBin();
      toast.success(res.message || 'Recycle bin emptied successfully', { id: loadingToast });
      setSelectedIds(new Set());
      fetchItems();
      fetchStatsAndPreview();
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      toast.error(`Failed to empty bin: ${errorMsg}`, { id: loadingToast });
      return { success: false, error: err };
    }
  };

  return {
    items,
    stats,
    purgePreview,
    loading,
    error,
    totalCount,
    page,
    limit,
    filters,
    selectedIds,
    setPage,
    setLimit,
    handleFilterChange,
    handleSearchChange,
    toggleSelection,
    selectAll,
    restoreItem,
    permanentDelete,
    bulkRestore,
    bulkPermanentDelete,
    emptyBin,
    refresh: fetchItems,
  };
};
