/**
 * Extracts the most meaningful error message from any error object.
 * Priority order:
 *   1. Backend API response message (err.response.data.message)
 *   2. Normalized API error message (err.normalized.message)
 *   3. Native error message (err.message)
 *   4. Provided fallback string
 *
 * @param {unknown} err - The caught error object
 * @param {string} [fallback='Something went wrong. Please try again.'] - Fallback message
 * @returns {string} The best available human-readable error message
 */
export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;

  // 1. Backend structured API error response
  const serverMsg =
    err?.response?.data?.message ||
    err?.response?.data?.error;
  if (serverMsg && typeof serverMsg === 'string') return serverMsg;

  // 2. Normalized error from Axios interceptor
  if (err?.normalized?.message && typeof err.normalized.message === 'string') {
    return err.normalized.message;
  }

  // 3. Native JS error message (skip generic Axios codes)
  if (
    err?.message &&
    typeof err.message === 'string' &&
    !err.message.startsWith('Request failed with status code')
  ) {
    return err.message;
  }

  return fallback;
};
