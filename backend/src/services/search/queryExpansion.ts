import { getLearnedMappings } from './SearchAnalyticsService';
import {
  TRANSLITERATION_MAP,
  SYNONYM_MAP,
  CATEGORY_KEYWORDS,
  INTENT_EXPANSION_MAP,
  EVENT_KNOWLEDGE_GRAPH,
} from './searchDictionaries';
import { levenshteinSimilarity } from './rankingEngine';

// ── Pure query-string transforms: normalization, expansion, fuzzy/spell correction, category prediction ──
export function getSingularForm(word: string): string {
  const normalized = word.toLowerCase();
  if (normalized.endsWith('ies') && normalized.length > 5) {
    return normalized.slice(0, -3) + 'y';
  }
  if (normalized.endsWith('s') && !normalized.endsWith('ss') && normalized.length > 3) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

export function getTransliterationsAndSynonyms(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  const expanded = new Set<string>([normalized]);

  for (const word of words) {
    const singular = getSingularForm(word);

    // Check transliterations first
    const trans = TRANSLITERATION_MAP[word] || TRANSLITERATION_MAP[singular];
    if (trans) {
      for (const t of trans) {
        expanded.add(t);
        expanded.add(normalized.replace(word, t));

        // Synonyms for transliteration
        const synonyms = SYNONYM_MAP[t];
        if (synonyms) {
          for (const syn of synonyms) {
            expanded.add(syn);
            expanded.add(normalized.replace(word, syn));
          }
        }
      }
    }

    // Check direct synonyms
    const synonyms = SYNONYM_MAP[word] || SYNONYM_MAP[singular];
    if (synonyms) {
      for (const syn of synonyms) {
        expanded.add(syn);
        expanded.add(normalized.replace(word, syn));

        // Reverse-map synonyms to transliterated keys
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
    const singular = getSingularForm(word);
    if (word.length >= 2) {
      expanded.add(word);
      expanded.add(singular);
      const trans = TRANSLITERATION_MAP[word] || TRANSLITERATION_MAP[singular];
      if (trans) trans.forEach((t) => expanded.add(t));
      const synonyms = SYNONYM_MAP[word] || SYNONYM_MAP[singular];
      if (synonyms) synonyms.forEach((s) => expanded.add(s));
    }
  }

  // Check Event Knowledge Graph
  for (const [_eventName, data] of Object.entries(EVENT_KNOWLEDGE_GRAPH)) {
    if (
      data.aliases.some((alias) => normalized.includes(alias)) ||
      data.teluguAliases.some((alias) => normalized.includes(alias))
    ) {
      data.searchTerms.forEach((t) => expanded.add(t));
      data.products.forEach((p) => expanded.add(p.toLowerCase()));
    }
  }

  // Check learned mappings from continuous learning loop
  const learned = getLearnedMappings();
  const learnedSyns = learned[normalized];
  if (learnedSyns) {
    for (const syn of learnedSyns) {
      expanded.add(syn.toLowerCase());
    }
  }

  // Cap total expanded terms to prevent unbounded regex growth
  return Array.from(expanded).slice(0, 30);
}

export function generateFuzzyVariants(query: string): string[] {
  if (query.length < 3 || query.length > 50) return []; // Skip for very short or very long inputs

  const variants = new Set<string>();

  // Transpositions
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

export function getSpellCorrectedQuery(query: string): { corrected: string; confidence: number } {
  const words = query.toLowerCase().trim().split(/\s+/);
  let overallConfidence = 0;

  // Build comprehensive vocabulary from all known keys, values, and tokens in dictionaries
  const vocabulary = new Set<string>();

  const addTermToVocab = (term: string) => {
    if (!term) return;
    const lower = term.toLowerCase().trim();
    if (!lower) return;
    vocabulary.add(lower);

    // Also tokenize multi-word phrases and add individual tokens
    const tokens = lower.split(/[\s,_\-&/]+/);
    tokens.forEach((t) => {
      const clean = t.replace(/[^a-z0-9]/gi, '').trim();
      if (clean.length >= 2) {
        vocabulary.add(clean);
        // Add singular/plural forms so valid words aren't treated as typos
        if (clean.endsWith('s') && clean.length > 3) {
          vocabulary.add(clean.slice(0, -1));
        } else {
          vocabulary.add(clean + 's');
        }
      }
    });
  };

  // Add all transliterations
  Object.entries(TRANSLITERATION_MAP).forEach(([key, values]) => {
    addTermToVocab(key);
    values.forEach(addTermToVocab);
  });

  // Add all synonyms
  Object.entries(SYNONYM_MAP).forEach(([key, values]) => {
    addTermToVocab(key);
    values.forEach(addTermToVocab);
  });

  // Add all category keywords and names
  Object.entries(CATEGORY_KEYWORDS).forEach(([catName, keywords]) => {
    addTermToVocab(catName);
    keywords.forEach(addTermToVocab);
  });

  // Add event knowledge graph terms
  Object.values(EVENT_KNOWLEDGE_GRAPH).forEach((g) => {
    g.aliases.forEach(addTermToVocab);
    g.searchTerms.forEach(addTermToVocab);
  });

  const vocabArray = Array.from(vocabulary);
  const correctedWords: string[] = [];

  for (const word of words) {
    const cleanWord = word.replace(/[^a-z0-9]/gi, '');

    // If exact match, short word, or valid singular/plural match, keep word unchanged
    if (
      vocabulary.has(word) ||
      vocabulary.has(cleanWord) ||
      (cleanWord.endsWith('s') && vocabulary.has(cleanWord.slice(0, -1))) ||
      (cleanWord.endsWith('es') && vocabulary.has(cleanWord.slice(0, -2))) ||
      vocabulary.has(cleanWord + 's') ||
      cleanWord.length < 3
    ) {
      correctedWords.push(word);
      overallConfidence += 1;
      continue;
    }

    let bestMatch = word;
    let maxSimilarity = 0;

    for (const vWord of vocabArray) {
      // Never treat a plural/singular variation as a typo
      if (
        vWord === cleanWord + 's' ||
        vWord === cleanWord + 'es' ||
        cleanWord === vWord + 's' ||
        cleanWord === vWord + 'es'
      ) {
        continue;
      }

      const sim = levenshteinSimilarity(cleanWord, vWord);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        bestMatch = vWord;
      }
    }

    // Require high similarity (> 0.78) for spelling correction
    if (maxSimilarity > 0.78 && bestMatch.length >= 3) {
      correctedWords.push(bestMatch);
      overallConfidence += maxSimilarity;
    } else {
      correctedWords.push(word);
      overallConfidence += 0.5; // low confidence fallback
    }
  }

  const corrected = correctedWords.join(' ');
  return {
    corrected: corrected.toLowerCase() !== query.toLowerCase() ? corrected : query,
    confidence: overallConfidence / (words.length || 1),
  };
}

export function predictCategories(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];
  const words = normalizedQuery.split(/\s+/).filter((w) => w.length > 1);
  const scores = new Map<string, number>();
  const genericWords = new Set([
    'ceremony',
    'decor',
    'set',
    'item',
    'function',
    'traditional',
    'style',
  ]);

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;

    // Full phrase match bonus
    for (const keyword of keywords) {
      if (normalizedQuery === keyword) {
        score += 10;
      } else if (normalizedQuery.includes(keyword) && keyword.length >= 4) {
        score += 6;
      }
    }

    for (const word of words) {
      const singular = getSingularForm(word);
      for (const keyword of keywords) {
        if (keyword === word || keyword === singular) {
          score += genericWords.has(word) ? 1 : 4;
        } else if (!genericWords.has(word) && !genericWords.has(singular)) {
          if (
            (word.length >= 4 && keyword.includes(word)) ||
            (singular.length >= 4 && keyword.includes(singular))
          ) {
            score += 1.5;
          }
        }
      }
    }
    if (score >= 2) scores.set(category, (scores.get(category) || 0) + score);
  }

  for (const [eventName, data] of Object.entries(EVENT_KNOWLEDGE_GRAPH)) {
    let score = 0;
    if (normalizedQuery.includes(eventName.toLowerCase())) {
      score += 8;
    }

    for (const word of words) {
      const singular = getSingularForm(word);
      if (
        data.aliases.includes(word) ||
        data.aliases.includes(singular) ||
        data.teluguAliases.includes(word) ||
        data.teluguAliases.includes(singular)
      ) {
        score += genericWords.has(word) ? 1 : 4;
      } else if (!genericWords.has(word) && !genericWords.has(singular)) {
        if (
          data.aliases.some(
            (a) =>
              (word.length >= 4 && a.includes(word)) ||
              (singular.length >= 4 && a.includes(singular)),
          )
        ) {
          score += 1.5;
        }
      }
    }
    if (score >= 2) scores.set(eventName, (scores.get(eventName) || 0) + score);
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat.replace(/([a-z])([A-Z])/g, '$1 $2').trim())
    .slice(0, 3);
}

export function getIntentExpansions(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const intents: string[] = [];

  for (const [key, expansions] of Object.entries(INTENT_EXPANSION_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      intents.push(...expansions);
    }
  }

  // Check Event Knowledge Graph
  for (const [_eventName, data] of Object.entries(EVENT_KNOWLEDGE_GRAPH)) {
    if (
      data.aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized)) ||
      data.teluguAliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))
    ) {
      intents.push(...data.products);
    }
  }

  // Deduplicate and return a subset
  return [...new Set(intents)].slice(0, 4);
}
