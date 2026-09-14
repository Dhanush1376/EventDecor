import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import storeSettingsService from '../services/api/storeSettingsService';
// socket.io is imported dynamically inside the useEffect to keep it out of the initial bundle
import { getWebSocketUrl } from '../config/apiConfig';
import logger from '../utils/core/logger';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({});
  const [categories, setCategories] = useState([]);
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        setLoading(true);
        // Fetch categories
        const categoriesRes = await api.get('/categories/active');
        if (categoriesRes?.data?.success) {
          setCategories(categoriesRes.data.data);
        }

        // Fetch store settings
        const settingsRes = await storeSettingsService.getPublicSettings();
        if (settingsRes) {
          setStoreSettings(settingsRes);
        }
      } catch (err) {
        logger.error('Failed to fetch global data', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalData();

    // Visitor sockets are intentionally opt-in; the public config fetch remains the canonical source.
    if (import.meta.env.VITE_ENABLE_VISITOR_SOCKET !== 'true') return;

    // Setup Socket for live maintenance toggles.
    // Direct backend origin so the transport can upgrade to a real WebSocket.
    const socketServerUrl = getWebSocketUrl();
    let socketRef = null;

    import('socket.io-client')
      .then(({ io }) => {
        const socket = io(`${socketServerUrl}/visitor`, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 5000,
        });
        socketRef = socket;

        socket.on('MAINTENANCE_TOGGLED', (data) => {
          setStoreSettings((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              general: {
                ...prev.general,
                maintenanceMode: data.maintenanceMode,
              },
            };
          });
        });
      })
      .catch((err) => {
        logger.warn('[ConfigContext] Failed to load socket.io-client module:', err);
      });

    const handleSettingsSync = async () => {
      try {
        const settingsRes = await storeSettingsService.getPublicSettings();
        if (settingsRes) {
          setStoreSettings(settingsRes);
        }
      } catch (_e) {
        // Ignored
      }
    };

    window.addEventListener('store-settings-updated', handleSettingsSync);
    const handleStorageEvent = (e) => {
      if (e.key === 'store_settings_sync_time') {
        handleSettingsSync();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('store-settings-updated', handleSettingsSync);
      window.removeEventListener('storage', handleStorageEvent);
      if (socketRef) {
        socketRef.disconnect();
      }
    };
  }, []);

  const isMaintenanceMode = storeSettings?.general?.maintenanceMode === true;
  const isStoreClosed = storeSettings?.general?.storeEnabled === false && !isMaintenanceMode;

  const contextValue = useMemo(
    () => ({
      config,
      categories,
      storeSettings,
      loading,
      error,
      isStoreClosed,
      isMaintenanceMode,
    }),
    [config, categories, storeSettings, loading, error, isStoreClosed, isMaintenanceMode],
  );

  return <ConfigContext.Provider value={contextValue}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
