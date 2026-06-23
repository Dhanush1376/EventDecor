export const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);
export const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
export const MAX_GET_RETRIES = 4;
export const MAX_MUTATION_RETRIES = 2;
export const SLOW_REQUEST_MS = 4000;

export const pathIncludesAuth = (url = '') => String(url).toLowerCase().includes('/auth/');

export const isQueueable = (url, method) => {
  if (!url) return false;
  const path = url.toLowerCase();
  const m = method.toLowerCase();

  if (m !== 'post' && m !== 'put' && m !== 'delete' && m !== 'patch') {
    return false;
  }

  if (path.includes('/auth/')) return false;
  if (path.includes('/payment') || path.includes('/verify-payment')) return false;
  if (path.includes('/safety-lock') || path.includes('/cms/publish')) return false;
  if (path.includes('/tracking') || path.includes('/analytics')) return false;

  return true;
};

export const getRequestDescription = (config) => {
  const url = config.url || '';
  const method = (config.method || 'POST').toUpperCase();
  if (url.includes('/users/cart')) return 'Update Shopping Cart';
  if (url.includes('/users/wishlist')) return 'Update Wishlist';
  if (url.includes('/inquiries')) return 'Submit Custom Inquiry';
  if (url.includes('/custom-orders')) return 'Submit Custom Order Inquiry';
  if (url.includes('/event-bookings')) return 'Book Event Consultation';
  if (url.includes('/reviews')) return 'Submit Product Review';
  return `${method} request to ${url.split('/').pop()}`;
};

export const isPathProtected = (path) => {
  if (!path) return false;
  return (
    path.includes('/auth/profile') ||
    path.includes('/users/cart') ||
    path.includes('/users/wishlist') ||
    path.includes('/users/profile') ||
    path.includes('/users/addresses') ||
    path.includes('/users/team') ||
    path.includes('/orders') ||
    path.includes('/admin/') ||
    (path.includes('/custom-orders') &&
      (!path.includes('/custom-orders/config') ||
        path.includes('/config/admin') ||
        path.includes('/config/draft') ||
        path.includes('/config/publish'))) ||
    path.includes('/notifications') ||
    path.includes('/analytics/') ||
    (path.includes('/reviews') &&
      !path.includes('/reviews/public') &&
      !path.includes('/reviews/product/')) ||
    path.includes('/upload') ||
    path.includes('/recommendations/for-you')
  );
};
