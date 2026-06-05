import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import logger from '../utils/logger';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        setLoading(true);
        // Fetch both configs and categories in parallel
        const [configRes, categoriesRes] = await Promise.allSettled([
          api.get('/config/public'),
          api.get('/categories/active'),
        ]);

        if (configRes.status === 'fulfilled' && configRes.value?.data?.success) {
          setConfig(configRes.value.data.data);
        }

        if (categoriesRes.status === 'fulfilled' && categoriesRes.value?.data?.success) {
          setCategories(categoriesRes.value.data.data);
        }
      } catch (err) {
        logger.error('Failed to fetch global configuration', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalData();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, categories, loading, error }}>
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
