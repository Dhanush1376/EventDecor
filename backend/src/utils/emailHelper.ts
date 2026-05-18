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

  let [username, domain] = parts;

  // Gmail and Googlemail ignore dots and everything after '+' for routing
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    // Remove dots
    username = username.replace(/\./g, '');
    
    // Remove sub-addressing (plus tags)
    const plusIndex = username.indexOf('+');
    if (plusIndex !== -1) {
      username = username.substring(0, plusIndex);
    }
  }

  return `${username}@${domain}`;
};

/**
 * Checks if two email addresses are canonical matches.
 */
export const isSameEmail = (email1: string, email2: string): boolean => {
  return canonicalizeEmail(email1) === canonicalizeEmail(email2);
};
