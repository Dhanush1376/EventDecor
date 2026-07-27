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

  // Function to check if a string contains technical jargon or code
  const isTechnical = (str) => {
    if (!str || typeof str !== 'string') return false;

    // Check for common technical indicators
    const technicalPatterns = [
      /<html/i,
      /<body/i,
      /<!DOCTYPE/i,
      /<script/i, // HTML content
      /Unexpected token/i,
      /JSON at position/i, // JSON parsing errors
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i, // Network errors
      /TypeError:/i,
      /ReferenceError:/i,
      /SyntaxError:/i, // JS errors
      /SQL syntax/i,
      /database/i,
      /MongoError/i,
      /Cast to ObjectId/i, // DB errors
      /stack trace/i,
      /at Array\./i,
      /at Object\./i, // Stack traces
      /failed to fetch/i, // Fetch generic error
      /Request failed with status code/i, // Axios generic error
      /E11000 duplicate key error/i, // MongoDB dup error
      /AxiosError/i,
      /Network Error/i,
    ];

    // If it's suspiciously long, it might be a stack trace or HTML dump
    if (str.length > 150) return true;

    return technicalPatterns.some((pattern) => pattern.test(str));
  };

  let candidate = null;

  // 1. Backend structured API error response
  const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
  if (serverMsg && typeof serverMsg === 'string') {
    candidate = serverMsg;
  }

  // 2. Normalized error from Axios interceptor
  if (!candidate && err?.normalized?.message && typeof err.normalized.message === 'string') {
    candidate = err.normalized.message;
  }

  // 3. Native JS error message
  if (!candidate && err?.message && typeof err.message === 'string') {
    candidate = err.message;
  }

  // Verify candidate is not technical
  if (candidate && !isTechnical(candidate)) {
    return candidate;
  }

  return fallback;
};

import toast from 'react-hot-toast';

export const patchToastError = () => {
  const originalError = toast.error;
  toast.error = (msg, options) => {
    let sanitizedMsg = msg;

    // If msg is an Error or AxiosError object
    if (typeof msg === 'object' && msg !== null) {
      sanitizedMsg = getErrorMessage(msg, 'An unexpected error occurred.');
    }
    // If it's a string, sanitize it using our logic
    else if (typeof msg === 'string') {
      sanitizedMsg = getErrorMessage({ message: msg }, 'An unexpected error occurred.');
    }

    return originalError(sanitizedMsg, options);
  };
};
