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
  const queryVariants = [query];
  if (query.includes('jewelry')) queryVariants.push(query.replace(/\bjewelry\b/g, 'jewellery'));
  if (query.includes('jewellery')) queryVariants.push(query.replace(/\bjewellery\b/g, 'jewelry'));

  if (
    queryVariants.some(
      (qv) => normalizedTitle === qv || (normalizedTeluguTitle && normalizedTeluguTitle === qv),
    )
  ) {
    score += 5.0;
  } else if (
    queryVariants.some(
      (qv) =>
        normalizedTitle.includes(qv) ||
        (normalizedTeluguTitle && normalizedTeluguTitle.includes(qv)),
    )
  ) {
    score += 3.0;
  }

  // Prefix matching (Weight: 2.0)
  if (
    queryVariants.some(
      (qv) =>
        normalizedTitle.startsWith(qv) ||
        (normalizedTeluguTitle && normalizedTeluguTitle.startsWith(qv)),
    )
  ) {
    score += 1.5;
  }

  // All query words present in title bonus (Weight: 3.5)
  const allWordsInTitle =
    queryWords.length > 1 &&
    queryWords.every((w) => {
      const candidates = [w];
      if (w === 'jewelry') candidates.push('jewellery');
      if (w === 'jewellery') candidates.push('jewelry');
      if (w === 'tray') candidates.push('trays');
      if (w === 'trays') candidates.push('tray');
      if (w === 'bangle') candidates.push('bangles');
      if (w === 'bangles') candidates.push('bangle');
      return candidates.some((c) => normalizedTitle.includes(c));
    });
  if (allWordsInTitle) {
    score += 3.5;
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
    const wordCandidates = [word];
    if (word === 'jewelry') wordCandidates.push('jewellery');
    else if (word === 'jewellery') wordCandidates.push('jewelry');
    if (word === 'tray') wordCandidates.push('trays');
    else if (word === 'trays') wordCandidates.push('tray');
    if (word === 'bangle') wordCandidates.push('bangles');
    else if (word === 'bangles') wordCandidates.push('bangle');

    // Exact word boundary matches in title
    if (wordCandidates.some((wc) => new RegExp(`\\b${wc}\\b`).test(normalizedTitle))) {
      wordScore += 1.5;
    } else if (wordCandidates.some((wc) => normalizedTitle.includes(wc))) {
      wordScore += 0.8;
    } else {
      // Fuzzy matching against title words
      const titleWords = normalizedTitle.split(/\s+/);
      const maxFuzzy = Math.max(...titleWords.map((tw) => levenshteinSimilarity(word, tw)));
      if (maxFuzzy > 0.8) wordScore += 0.8;
      else if (maxFuzzy > 0.6) wordScore += 0.4;
    }

    if (normalizedTeluguTitle) {
      if (wordCandidates.some((wc) => new RegExp(`\\b${wc}\\b`).test(normalizedTeluguTitle)))
        wordScore += 1.0;
      else if (wordCandidates.some((wc) => normalizedTeluguTitle.includes(wc))) wordScore += 0.5;
    }

    // Category matching
    if (wordCandidates.some((wc) => normalizedCategory.includes(wc))) wordScore += 0.8;

    // Tag matching
    if (wordCandidates.some((wc) => normalizedTags.some((t) => t.includes(wc)))) wordScore += 0.6;

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
