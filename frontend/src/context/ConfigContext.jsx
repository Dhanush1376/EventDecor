import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import storeSettingsService from '../services/api/storeSettingsService';
// socket.io is imported dynamically inside the useEffect to keep it out of the initial bundle
import { getApiRootUrl } from '../config/apiConfig';
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

    // Setup Socket for live maintenance toggles
    let socketServerUrl = getApiRootUrl();
    if (socketServerUrl.endsWith('/api/v1')) {
      socketServerUrl = socketServerUrl.slice(0, -7);
    } else if (socketServerUrl.endsWith('/api')) {
      socketServerUrl = socketServerUrl.slice(0, -4);
    }
    let socketRef = null;

    import('socket.io-client')
      .then(({ io }) => {
        const socket = io(`${socketServerUrl}/visitor`, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
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

    return () => {
      if (socketRef) {
        socketRef.disconnect();
      }
    };
  }, []);

  return (
    <ConfigContext.Provider value={{ config, categories, storeSettings, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
