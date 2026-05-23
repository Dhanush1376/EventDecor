import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { normalizeApiError } from '../utils/apiErrors';

export const useApi = (apiFunc) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFunc(...args);
      if (response.success) {
        setData(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Something went wrong');
      }
    } catch (err) {
      if (err.code === 'ERR_NO_SESSION' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return null;
      }

      const normalized = err.normalized || normalizeApiError(err);
      let message = normalized.message;

      if (normalized.status === 403) {
        message = 'You do not have administrative clearance to access this curating tool.';
      } else if (normalized.status === 404) {
        message = 'The requested masterpiece or collection could not be found.';
      }

      setError(message);
      if (normalized.status !== 401) {
        toast.error(message);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  return { data, loading, error, request, setData };
};
