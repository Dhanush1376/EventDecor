import DOMPurify from 'dompurify';

/**
 * Strict DOMPurify configuration for React rendering
 * - Disallows dangerous elements and attributes
 * - Removes unknown protocols and scripts
 * - Allows basic formatting and structural tags commonly used in CMS or policies
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'src', 'alt', 'width', 'height'],
  ALLOW_DATA_ATTR: false,
  // Ensure that links open securely
  ADD_ATTR: ['target'],
};

// Add hooks to ensure all external links have rel="noopener noreferrer"
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  if ('target' in node && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
  // Ensure all image src attributes are safe (HTTPS only for external, or relative)
  if (node.nodeName && node.nodeName.toLowerCase() === 'img') {
    const src = node.getAttribute('src');
    if (src && src.startsWith('http://')) {
      // Automatically upgrade to https if possible, or leave it for CSP to block
      node.setAttribute('src', src.replace('http://', 'https://'));
    }
  }
});

/**
 * Sanitizes an HTML string using a strict DOMPurify configuration.
 *
 * @param {string} dirtyHtml - The untrusted HTML string to sanitize.
 * @returns {string} The sanitized, safe HTML string.
 */
export const sanitizeHtml = (dirtyHtml) => {
  if (!dirtyHtml) return '';
  return DOMPurify.sanitize(dirtyHtml, STRICT_CONFIG);
};

/**
 * Creates an object suitable for React's dangerouslySetInnerHTML prop.
 * This ensures that any string passed to dangerouslySetInnerHTML goes
 * through sanitization first, mitigating XSS vulnerabilities.
 *
 * @param {string} dirtyHtml - The untrusted HTML string.
 * @returns {{__html: string}} Object with sanitized HTML.
 */
export const createSafeHtml = (dirtyHtml) => {
  return {
    __html: sanitizeHtml(dirtyHtml)
  };
};
