export function levenshteinSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1.0;

  // Skip computation for very long strings
  if (a.length > 50 || b.length > 50) return 0;

  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }

  const distance = dp[m][n];
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

export function ngramOverlapScore(queryNgrams: string[], targetNgrams: string[]): number {
  if (!queryNgrams.length || !targetNgrams.length) return 0;
  const targetSet = new Set(targetNgrams);
  let matches = 0;
  for (const q of queryNgrams) {
    if (targetSet.has(q)) matches++;
  }
  return matches / queryNgrams.length;
}

export function computeSearchScore(
  title: string,
  category: string,
  tags: string[],
  query: string,
  teluguTitle?: string,
  description?: string,
  materials?: string[],
  ngrams?: string[],
): number {
  const normalizedTitle = (title || '').toLowerCase();
  const normalizedTeluguTitle = (teluguTitle || '').toLowerCase();
  const normalizedCategory = (category || '').toLowerCase();
  const normalizedTags = (tags || []).map((t) => t.toLowerCase());
  const normalizedDesc = (description || '').toLowerCase();
  const normalizedMaterials = (materials || []).map((m) => m.toLowerCase());

  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);

  let score = 0;

  // Exact matching (Weight: 4.0)
  if (normalizedTitle === query || (normalizedTeluguTitle && normalizedTeluguTitle === query)) {
    score += 4.0;
  } else if (
    normalizedTitle.includes(query) ||
    (normalizedTeluguTitle && normalizedTeluguTitle.includes(query))
  ) {
    score += 2.0;
  }

  // Prefix matching (Weight: 2.5)
  if (
    normalizedTitle.startsWith(query) ||
    (normalizedTeluguTitle && normalizedTeluguTitle.startsWith(query))
  ) {
    score += 1.0;
  }

  // N-gram overlap for partial/substring matching (Weight: 1.5)
  if (ngrams && ngrams.length > 0) {
    // Generate ngrams from query words
    const queryNgrams = queryWords.flatMap((w) => {
      const res = [];
      for (let i = 2; i <= Math.min(w.length, 6); i++) res.push(w.substring(0, i));
      return res;
    });
    if (queryNgrams.length > 0) {
      const overlap = ngramOverlapScore(queryNgrams, ngrams);
      score += overlap * 1.5;
    }
  }

  // Word-level occurrences and fuzzy matching
  for (const word of queryWords) {
    let wordScore = 0;

    // Exact word boundary matches in title
    if (new RegExp(`\\b${word}\\b`).test(normalizedTitle)) {
      wordScore += 1.0;
    } else if (normalizedTitle.includes(word)) {
      wordScore += 0.5;
    } else {
      // Fuzzy matching against title words
      const titleWords = normalizedTitle.split(/\s+/);
      const maxFuzzy = Math.max(...titleWords.map((tw) => levenshteinSimilarity(word, tw)));
      if (maxFuzzy > 0.8) wordScore += 0.8;
      else if (maxFuzzy > 0.6) wordScore += 0.4;
    }

    if (normalizedTeluguTitle) {
      if (new RegExp(`\\b${word}\\b`).test(normalizedTeluguTitle)) wordScore += 1.0;
      else if (normalizedTeluguTitle.includes(word)) wordScore += 0.5;
    }

    // Category matching
    if (normalizedCategory.includes(word)) wordScore += 0.8;

    // Tag matching
    if (normalizedTags.some((t) => t.includes(word))) wordScore += 0.5;

    // Material matching
    if (normalizedMaterials.some((m) => m.includes(word))) wordScore += 0.4;

    // Description matching (lower weight)
    if (normalizedDesc.includes(word)) wordScore += 0.2;

    score += wordScore;
  }

  return score;
}

export function getMatchSource(
  title: string,
  category: string,
  tags: string[],
  query: string,
  teluguTitle?: string,
  description?: string,
  materials?: string[],
): string {
  const normalizedQuery = query.toLowerCase();

  if ((title || '').toLowerCase().includes(normalizedQuery)) return 'title';
  if (teluguTitle && teluguTitle.toLowerCase().includes(normalizedQuery)) return 'teluguTitle';
  if ((category || '').toLowerCase().includes(normalizedQuery)) return 'category';
  if ((tags || []).some((t) => t.toLowerCase().includes(normalizedQuery))) return 'tags';
  if ((materials || []).some((m) => m.toLowerCase().includes(normalizedQuery))) return 'materials';
  if ((description || '').toLowerCase().includes(normalizedQuery)) return 'description';

  return 'fuzzy';
}
