import { SYNONYM_MAP, TRANSLITERATION_MAP, CATEGORY_KEYWORDS } from './searchDictionaries';

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getTransliterationsAndSynonyms(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  const expanded = new Set<string>([normalized]);

  for (const word of words) {
    const trans = TRANSLITERATION_MAP[word];
    if (trans) {
      for (const t of trans) {
        expanded.add(t);
        expanded.add(normalized.replace(word, t));
        const synonyms = SYNONYM_MAP[t];
        if (synonyms) {
          for (const syn of synonyms) {
            expanded.add(syn);
            expanded.add(normalized.replace(word, syn));
          }
        }
      }
    }
    const synonyms = SYNONYM_MAP[word];
    if (synonyms) {
      for (const syn of synonyms) {
        expanded.add(syn);
        expanded.add(normalized.replace(word, syn));
        for (const [key, val] of Object.entries(TRANSLITERATION_MAP)) {
          if (val.includes(syn)) {
            expanded.add(key);
            expanded.add(normalized.replace(word, key));
          }
        }
      }
    }
  }

  for (const word of words) {
    if (word.length >= 2) {
      expanded.add(word);
      const trans = TRANSLITERATION_MAP[word];
      if (trans) trans.forEach((t) => expanded.add(t));
      const synonyms = SYNONYM_MAP[word];
      if (synonyms) synonyms.forEach((s) => expanded.add(s));
    }
  }

  return Array.from(expanded).slice(0, 30);
}

export function generateFuzzyVariants(query: string): string[] {
  if (query.length < 3 || query.length > 50) return [];

  const variants = new Set<string>();
  for (let i = 0; i < query.length - 1; i++) {
    const swapped = query.slice(0, i) + query[i + 1] + query[i] + query.slice(i + 2);
    variants.add(swapped);
  }

  const keyboardMap: Record<string, string[]> = {
    a: ['s', 'q'],
    s: ['a', 'd'],
    d: ['s', 'f'],
    f: ['d', 'g'],
    g: ['f', 'h'],
    h: ['g', 'j'],
    j: ['h', 'k'],
    k: ['j', 'l'],
    l: ['k'],
    q: ['w', 'a'],
    w: ['q', 'e'],
    e: ['w', 'r'],
    r: ['e', 't'],
    t: ['r', 'y'],
    y: ['t', 'u'],
    u: ['y', 'i'],
    i: ['u', 'o'],
    o: ['i', 'p'],
    p: ['o'],
    z: ['x'],
    x: ['z', 'c'],
    c: ['x', 'v'],
    v: ['c', 'b'],
    b: ['v', 'n'],
    n: ['b', 'm'],
    m: ['n'],
  };

  for (let i = 0; i < query.length && variants.size < 6; i++) {
    const char = query[i].toLowerCase();
    const adjacents = keyboardMap[char];
    if (adjacents) {
      for (const adj of adjacents) {
        variants.add(query.slice(0, i) + adj + query.slice(i + 1));
      }
    }
  }

  return Array.from(variants).slice(0, 6);
}

export function predictCategories(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/);
  const scores = new Map<string, number>();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const word of words) {
      for (const keyword of keywords) {
        if (keyword === word) score += 3;
        else if (keyword.includes(word) || word.includes(keyword)) score += 1;
      }
    }
    if (score > 0) scores.set(category, score);
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat)
    .slice(0, 3);
}

export function computeSearchScore(
  title: string,
  category: string,
  tags: string[],
  query: string,
  teluguTitle?: string,
): number {
  const normalizedTitle = (title || '').toLowerCase();
  const normalizedTeluguTitle = (teluguTitle || '').toLowerCase();
  const normalizedCategory = (category || '').toLowerCase();
  const normalizedTags = (tags || []).map((t) => t.toLowerCase());
  const queryWords = query.toLowerCase().split(/\s+/);

  let score = 0;

  if (normalizedTitle === query || (normalizedTeluguTitle && normalizedTeluguTitle === query)) {
    score += 1.5;
  } else if (
    normalizedTitle.includes(query) ||
    (normalizedTeluguTitle && normalizedTeluguTitle.includes(query))
  ) {
    score += 1.0;
  }

  if (
    normalizedTitle.startsWith(query) ||
    (normalizedTeluguTitle && normalizedTeluguTitle.startsWith(query))
  ) {
    score += 0.4;
  }

  for (const word of queryWords) {
    if (normalizedTitle.includes(word)) score += 0.4;
    if (normalizedTeluguTitle && normalizedTeluguTitle.includes(word)) score += 0.5;
  }

  for (const word of queryWords) {
    if (normalizedCategory.includes(word)) score += 0.3;
  }

  for (const word of queryWords) {
    if (normalizedTags.some((t) => t.includes(word))) score += 0.2;
  }

  return Math.min(score, 3.0);
}

export function getMatchSource(
  title: string,
  category: string,
  tags: string[],
  query: string,
  teluguTitle?: string,
): string {
  const normalizedQuery = query.toLowerCase();

  if ((title || '').toLowerCase().includes(normalizedQuery)) return 'title';
  if (teluguTitle && teluguTitle.toLowerCase().includes(normalizedQuery)) return 'teluguTitle';
  if ((category || '').toLowerCase().includes(normalizedQuery)) return 'category';
  if ((tags || []).some((t) => t.toLowerCase().includes(normalizedQuery))) return 'tags';
  return 'fuzzy';
}
