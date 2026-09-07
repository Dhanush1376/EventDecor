/**
 * Phone Number Utilities
 *
 * Provides safe sanitization and validation for 10-digit Indian mobile numbers.
 * Automatically strips country prefixes (+91 / 91), leading zeros (0 / 00),
 * and non-digit characters.
 */

/**
 * Sanitizes phone number input:
 * - Safely handles null, undefined, numbers, strings
 * - Strips whitespace, dashes, parentheses, formatting characters
 * - Strips Indian country code prefixes: +91 or leading 91 (when > 10 digits)
 * - Strips any leading zeros (e.g. 09876543210 -> 9876543210)
 * - Returns at most 10 digits
 * - Never throws
 *
 * @param {any} value
 * @returns {string} Cleaned 10-digit numeric string or empty string
 */
export function sanitizePhoneNumber(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let str = '';
  try {
    str = String(value).trim();
  } catch {
    return '';
  }

  if (!str) return '';

  // 1. Remove spaces, dashes, parentheses, dots
  str = str.replace(/[\s\-().]/g, '');

  // 2. Handle country code prefix (+91 or +)
  if (str.startsWith('+91')) {
    str = str.slice(3);
  } else if (str.startsWith('+')) {
    str = str.replace(/^\+/, '');
  }

  // 3. Keep only numeric digits
  str = str.replace(/\D/g, '');

  // 4. If someone pasted a 12-digit number starting with 91 (e.g. 919876543210)
  if (str.length === 12 && str.startsWith('91')) {
    str = str.slice(2);
  }

  // 5. If someone pasted with an extra zero prefix (e.g. 0091...), handle standard 0091 prefix
  if (str.length > 10 && str.startsWith('0091')) {
    str = str.slice(4);
  }

  // 6. Strip all leading zeros (e.g. 09876543210 -> 9876543210, 0 -> "")
  str = str.replace(/^0+/, '');

  // 7. Cap at 10 digits
  return str.slice(0, 10);
}

/**
 * Validates whether the sanitized phone number is a valid 10-digit number.
 *
 * @param {any} value
 * @returns {boolean}
 */
export function isValidPhoneNumber(value) {
  const sanitized = sanitizePhoneNumber(value);
  return /^\d{10}$/.test(sanitized);
}
