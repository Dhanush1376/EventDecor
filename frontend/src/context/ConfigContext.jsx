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
  const [storeSettings, setStoreSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('siri_public_settings');
      if (cached) return JSON.parse(cached);
    } catch (_e) {}
    return null;
  });
  const [loading, setLoading] = useState(!storeSettings);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchGlobalData = async () => {
      try {
        // Fetch categories
        const categoriesRes = await api.get('/categories/active');
        if (isMounted && categoriesRes?.data?.success) {
          setCategories(categoriesRes.data.data);
        }

        // Fetch store settings
        const settingsRes = await storeSettingsService.getPublicSettings();
        if (isMounted && settingsRes) {
          setStoreSettings(settingsRes);
        }
      } catch (err) {
        logger.error('Failed to fetch global data', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGlobalData();

    const handleSettingsSync = async () => {
      try {
        const settingsRes = await storeSettingsService.getPublicSettings();
        if (isMounted && settingsRes) {
          setStoreSettings(settingsRes);
        }
      } catch (_e) {
        // Ignored
      }
    };

    window.addEventListener('store-settings-updated', handleSettingsSync);
    const handleStorageEvent = (e) => {
      if (e.key === 'store_settings_sync_time' || e.key === 'siri_store_name') {
        handleSettingsSync();
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    let socketRef = null;
    if (import.meta.env.VITE_ENABLE_VISITOR_SOCKET === 'true') {
      const socketServerUrl = getWebSocketUrl();
      import('socket.io-client')
        .then(({ io }) => {
          if (!isMounted) return;
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
    }

    return () => {
      isMounted = false;
      window.removeEventListener('store-settings-updated', handleSettingsSync);
      window.removeEventListener('storage', handleStorageEvent);
      if (socketRef) {
        socketRef.disconnect();
      }
    };
  }, []);

  const storeName = useMemo(() => {
    return (
      storeSettings?.general?.storeName?.trim() ||
      import.meta.env.VITE_SITE_NAME ||
      'Siri Arts & Crafts'
    );
  }, [storeSettings]);

  const storeNameUpper = useMemo(() => storeName.toUpperCase(), [storeName]);
  const storeTagline = storeSettings?.general?.tagline?.trim() || 'Handcrafted Heritage & Artistry';
  const supportEmail = storeSettings?.general?.supportEmail?.trim() || 'sirisha.atmakuri@gmail.com';

  const isMaintenanceMode = storeSettings?.general?.maintenanceMode === true;
  const isStoreClosed = storeSettings?.general?.storeEnabled === false && !isMaintenanceMode;

  const contextValue = useMemo(
    () => ({
      config,
      categories,
      storeSettings,
      storeName,
      storeNameUpper,
      storeTagline,
      supportEmail,
      loading,
      error,
      isStoreClosed,
      isMaintenanceMode,
    }),
    [
      config,
      categories,
      storeSettings,
      storeName,
      storeNameUpper,
      storeTagline,
      supportEmail,
      loading,
      error,
      isStoreClosed,
      isMaintenanceMode,
    ],
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

export const useStoreName = () => {
  const { storeName } = useConfig();
  return storeName;
};
