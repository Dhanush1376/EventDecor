/**
 * Canonicalizes email addresses by trimming, lowercasing, and normalizing
 * domain-specific routing rules (e.g. Gmail dot and sub-addressing rules).
 */
export const canonicalizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '';

  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) {
    return email.trim().toLowerCase();
  }

  let username = parts[0];
  const domain = parts[1];

  // Gmail and Googlemail ignore everything after '+' for routing
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Remove sub-addressing (plus tags)
    const plusIndex = username.indexOf('+');
    if (plusIndex !== -1) {
      username = username.substring(0, plusIndex);
    }
    // We intentionally DO NOT remove dots from the username.
    // While Gmail ignores dots, removing them causes mismatches with existing
    // database entries that were registered with dots.
  }

  return `${username}@${domain}`;
};

/**
 * Checks if two email addresses are canonical matches.
 */
export const isSameEmail = (email1: string, email2: string): boolean => {
  return canonicalizeEmail(email1) === canonicalizeEmail(email2);
};
