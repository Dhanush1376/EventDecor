import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

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
      let message = err.response?.data?.message || err.message || 'API Error';
      const status = err.response?.status;

      // ─── DESCRIPTIVE USER-FRIENDLY TRANSLATIONS ───
      if (err.message === 'Network Error' || message.includes('Network Error')) {
        message = 'Unable to connect to our studio. Please check your internet connection.';
      } else if (status === 403) {
        message = 'You do not have administrative clearance to access this curating tool.';
      } else if (status === 404) {
        message = 'The requested masterpiece or collection could not be found.';
      } else if (status >= 500) {
        message = 'The studio is experiencing a momentary pause. Please try again in a few moments.';
      }

      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiFunc]);

  return { data, loading, error, request, setData };
};
