import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { cleanExpiredDrafts, getStorageStats } from '../services/draftService';

const DraftContext = createContext(null);

export function DraftProvider({ children }) {
  const [stats, setStats] = useState({ count: 0, estimatedBytes: 0 });
  const [isCleaning, setIsCleaning] = useState(true);

  // Load stats and clean on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setIsCleaning(true);
        // Clean drafts older than 30 days
        await cleanExpiredDrafts(30);

        if (mounted) {
          const freshStats = await getStorageStats();
          setStats(freshStats);
        }
      } catch (error) {
        toast.error('Failed to initialize drafts storage');
      } finally {
        if (mounted) {
          setIsCleaning(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const freshStats = await getStorageStats();
      setStats(freshStats);
    } catch (error) {
      toast.error('Failed to refresh stats');
    }
  }, []);

  const value = {
    stats,
    isCleaning,
    refreshStats,
  };

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraftContext() {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error('useDraftContext must be used within a DraftProvider');
  }
  return context;
}
