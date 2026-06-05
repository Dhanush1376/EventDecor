import logger from '../config/logger';

// ══════════════════════════════════════════════
// AI INPUT SANITIZATION
// ══════════════════════════════════════════════

/**
 * Known prompt injection patterns.
 * Each pattern is tested against the lowercase input.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Role-switching / system prompt override
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+above/i,
  /disregard\s+(all\s+)?(previous|above|prior)/i,
  /forget\s+(all\s+)?(previous|above|prior)/i,
  /you\s+are\s+now\s+a/i,
  /act\s+as\s+(a|an)\s/i,
  /new\s+instructions?\s*:/i,
  /system\s*:\s*/i,
  /assistant\s*:\s*/i,
  /user\s*:\s*/i,
  // Delimiter injection
  /<\|/,
  /\|>/,
  /```system/i,
  /```assistant/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<<SYS>>/i,
  /<\/SYS>>/i,
  // Markdown/HTML injection into prompt
  /<script[\s>]/i,
  /<iframe[\s>]/i,
  /<img\s+.*onerror/i,
  /<svg[\s>]/i,
  /javascript:/i,
  /data:text\/html/i,
  // Command injection
  /\$\{.*\}/,
  /`.*`/,
  // Excessive special character sequences (unicode flood)
  /(.)\1{20,}/, // 20+ repeated characters
];

/**
 * Basic content moderation blocklist for offensive/spam patterns in search queries.
 */
const MODERATION_BLOCKLIST: RegExp[] = [
  /\b(porn|xxx|nude|nsfw|hack|exploit|inject|malware|phishing)\b/i,
  /\b(sql\s*inject|xss|csrf|rce|lfi|rfi)\b/i,
];

/**
 * Maximum allowed input length for AI processing.
 */
const MAX_INPUT_LENGTH = 200;

const stripUnsafeControlChars = (value: string) =>
  Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    })
    .join('');

const containsIndicScript = (value: string) =>
  Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return (code >= 0x0c00 && code <= 0x0c7f) || (code >= 0x0900 && code <= 0x097f);
  });

/**
 * Sanitize user input before embedding it in an AI/LLM prompt.
 *
 * - Strips null bytes and control characters
 * - Truncates to MAX_INPUT_LENGTH
 * - Detects and neutralizes injection patterns
 * - Returns sanitized string + threat score
 */
export function sanitizePromptInput(raw: string): {
  sanitized: string;
  threatScore: number;
  blocked: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let threatScore = 0;

  // Strip null bytes and control characters (except newlines/tabs)
  let sanitized = stripUnsafeControlChars(raw);

  // Truncate to max length
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH);
    reasons.push('truncated');
    threatScore += 1;
  }

  // Check for injection patterns
  const lowerInput = sanitized.toLowerCase();
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(lowerInput) || pattern.test(sanitized)) {
      reasons.push(`injection_pattern:${pattern.source.substring(0, 30)}`);
      threatScore += 5;
      // Strip the matched pattern from the sanitized output
      sanitized = sanitized.replace(pattern, ' ');
    }
  }

  // Check moderation blocklist
  for (const pattern of MODERATION_BLOCKLIST) {
    if (pattern.test(sanitized)) {
      reasons.push(`moderation_block:${pattern.source.substring(0, 30)}`);
      threatScore += 10;
    }
  }

  // Check for excessive unicode (potential homoglyph or flood attack)
  const nonAsciiRatio =
    sanitized.replace(/[\x20-\x7E]/g, '').length / Math.max(sanitized.length, 1);
  if (nonAsciiRatio > 0.5 && sanitized.length > 10) {
    // Allow Telugu/Hindi scripts but flag if it looks like unicode flooding
    if (!containsIndicScript(sanitized)) {
      reasons.push('unicode_flood');
      threatScore += 3;
    }
  }

  // Check for repetitive content (spam indicator)
  const words = sanitized.split(/\s+/);
  if (words.length > 5) {
    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
    if (uniqueWords.size < words.length * 0.3) {
      reasons.push('repetitive_content');
      threatScore += 3;
    }
  }

  const blocked = threatScore >= 10;

  if (blocked) {
    logger.warn(`[AI SANITIZER] Input BLOCKED (score: ${threatScore})`, {
      reasons,
      inputLength: raw.length,
      inputPreview: raw.substring(0, 50),
    });
  } else if (threatScore > 0) {
    logger.debug(`[AI SANITIZER] Input sanitized (score: ${threatScore})`, { reasons });
  }

  return { sanitized: sanitized.trim(), threatScore, blocked, reasons };
}

// ══════════════════════════════════════════════
// AI OUTPUT SANITIZATION
// ══════════════════════════════════════════════

/**
 * HTML entity escaping for strings rendered in the browser.
 * Prevents XSS through AI-generated content.
 */
export function htmlEscapeString(str: string): string {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Recursively sanitize all string values in an object.
 * Used to sanitize AI/recommendation API responses before sending to frontend.
 */
export function sanitizeOutputStrings<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return htmlEscapeString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeOutputStrings(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      sanitized[key] = sanitizeOutputStrings(value);
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Validate and sanitize the AI analysis response structure.
 * Ensures the parsed Groq response conforms to expected types.
 * Returns null if validation fails.
 */
export function validateAIResponse(data: any): {
  detectedLanguage: string;
  correctedQuery: string;
  category: string | null;
  style: string | null;
  colors: string[];
  tags: string[];
  priceMin: number | null;
  priceMax: number | null;
  expandedTerms: string[];
} | null {
  if (!data || typeof data !== 'object') return null;

  // Validate and coerce string fields
  const detectedLanguage =
    typeof data.detectedLanguage === 'string' ? data.detectedLanguage.substring(0, 20) : 'english';

  const correctedQuery =
    typeof data.correctedQuery === 'string'
      ? htmlEscapeString(data.correctedQuery.substring(0, MAX_INPUT_LENGTH))
      : '';

  // Validate category against known whitelist
  const VALID_CATEGORIES = new Set([
    'Wedding',
    'Birthday',
    'Pooja',
    'Engagement',
    'Festival',
    'Floral',
    'Traditional',
    'Modern',
    'Lighting',
    'Stage',
    'Diwali',
    'Mehendi',
    'Haldi',
    'Sangeet',
  ]);
  const category =
    typeof data.category === 'string' && VALID_CATEGORIES.has(data.category) ? data.category : null;

  // Validate style against known whitelist
  const VALID_STYLES = new Set([
    'traditional',
    'modern',
    'luxury',
    'minimalist',
    'rustic',
    'premium',
    'simple',
  ]);
  const style = typeof data.style === 'string' && VALID_STYLES.has(data.style) ? data.style : null;

  // Validate arrays — must be arrays of short strings
  const sanitizeStringArray = (arr: any, maxLength = 10, maxItemLength = 50): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item: any) => typeof item === 'string' && item.length <= maxItemLength)
      .slice(0, maxLength)
      .map((item: string) => htmlEscapeString(item));
  };

  const colors = sanitizeStringArray(data.colors, 10, 20);
  const tags = sanitizeStringArray(data.tags, 15, 50);
  const expandedTerms = sanitizeStringArray(data.expandedTerms, 20, 80);

  // Validate numeric fields
  const priceMin =
    typeof data.priceMin === 'number' && data.priceMin >= 0 && data.priceMin <= 10_000_000
      ? data.priceMin
      : null;
  const priceMax =
    typeof data.priceMax === 'number' && data.priceMax >= 0 && data.priceMax <= 10_000_000
      ? data.priceMax
      : null;

  return {
    detectedLanguage,
    correctedQuery,
    category,
    style,
    colors,
    tags,
    priceMin,
    priceMax,
    expandedTerms,
  };
}

// ══════════════════════════════════════════════
// TRACKING INPUT SANITIZATION
// ══════════════════════════════════════════════

/**
 * Strip HTML tags from tracking metadata strings.
 * Prevents stored XSS through interaction metadata.
 */
export function stripHtmlTags(str: string | undefined): string | undefined {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').substring(0, 500);
}

/**
 * Sanitize tracking event metadata.
 * Strips HTML, truncates, and validates field types.
 */
export function sanitizeTrackingMetadata(metadata: any): Record<string, any> {
  if (!metadata || typeof metadata !== 'object') return {};

  return {
    category: stripHtmlTags(metadata.category)?.substring(0, 100),
    style: stripHtmlTags(metadata.style)?.substring(0, 50),
    tags: Array.isArray(metadata.tags)
      ? metadata.tags
          .filter((t: any) => typeof t === 'string')
          .slice(0, 20)
          .map((t: string) => t.substring(0, 50))
      : undefined,
    priceRange: ['budget', 'mid', 'premium', 'luxury'].includes(metadata.priceRange)
      ? metadata.priceRange
      : undefined,
    searchQuery: stripHtmlTags(metadata.searchQuery)?.substring(0, 200),
    dwellTimeMs:
      typeof metadata.dwellTimeMs === 'number' &&
      metadata.dwellTimeMs >= 0 &&
      metadata.dwellTimeMs <= 3_600_000
        ? metadata.dwellTimeMs
        : undefined,
    scrollDepth:
      typeof metadata.scrollDepth === 'number' &&
      metadata.scrollDepth >= 0 &&
      metadata.scrollDepth <= 100
        ? metadata.scrollDepth
        : undefined,
    source: stripHtmlTags(metadata.source)?.substring(0, 100),
  };
}
