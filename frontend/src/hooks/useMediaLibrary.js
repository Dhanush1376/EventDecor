import { useState, useCallback } from 'react';
import { mediaLibraryService } from '../services/mediaLibraryService';

export const useMediaLibrary = () => {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLibrary = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await mediaLibraryService.getMediaLibrary(params);
      if (response.success) {
        setItems(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await mediaLibraryService.getMediaStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch media stats:', err);
    }
  }, []);

  const uploadMedia = useCallback(async (file, folder, tags = []) => {
    setLoading(true);
    try {
      const response = await mediaLibraryService.uploadMedia(file, folder, tags);
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to upload media');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMedia = useCallback(async (id) => {
    try {
      await mediaLibraryService.deleteMedia(id);
      setItems((current) => current.filter((item) => item._id !== id));
      return true;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to delete media');
    }
  }, []);

  const restoreMedia = useCallback(async (id) => {
    try {
      await mediaLibraryService.restoreMedia(id);
      return true;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to restore media');
    }
  }, []);

  return {
    items,
    stats,
    pagination,
    loading,
    error,
    fetchLibrary,
    fetchStats,
    uploadMedia,
    deleteMedia,
    restoreMedia,
  };
};
