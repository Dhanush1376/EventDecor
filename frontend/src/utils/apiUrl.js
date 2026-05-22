/**
 * Resolves the API base URL. Production builds must set VITE_API_URL.
 * Local dev falls back to localhost when the variable is unset.
 */
export const getApiUrl = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    // Auto-append /api/v1 if the user only provided the root domain
    if (!configured.endsWith('/api') && !configured.endsWith('/api/v1')) {
      return configured.replace(/\/+$/, '') + '/api/v1';
    }
    return configured;
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api';
  }
  throw new Error(
    'VITE_API_URL is not set. Configure it in your deployment environment.'
  );
};
