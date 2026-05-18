const SENSITIVE_FIELDS = [
  'password',
  'token',
  'otp',
  'secret',
  'authorization',
  'cookie',
  'cvv',
  'cardnumber',
  'pin',
  'securitycode',
  'signature'
];

/**
 * Recursively redacts sensitive keys from payloads (body, query, headers) to prevent leakage in logs.
 * Includes a depth limit to protect performance and prevent call stack exhaustion under cyclic loops.
 */
export const sanitizeData = (data: any, depth = 0): any => {
  if (depth > 5) return '[DEPTH_LIMIT_REACHED]'; // Recursion depth safeguard
  if (data === null || data === undefined) return data;

  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }

  // Handle objects
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key is sensitive
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED_SENSITIVE]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};
