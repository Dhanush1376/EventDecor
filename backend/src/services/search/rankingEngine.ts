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

  // Exact matching
  if (normalizedTitle === query || (normalizedTeluguTitle && normalizedTeluguTitle === query)) {
    score += 1.5;
  } else if (
    normalizedTitle.includes(query) ||
    (normalizedTeluguTitle && normalizedTeluguTitle.includes(query))
  ) {
    score += 1.0;
  }

  // Prefix matching
  if (
    normalizedTitle.startsWith(query) ||
    (normalizedTeluguTitle && normalizedTeluguTitle.startsWith(query))
  ) {
    score += 0.4;
  }

  // Word-level occurrences
  for (const word of queryWords) {
    if (normalizedTitle.includes(word)) score += 0.4;
    if (normalizedTeluguTitle && normalizedTeluguTitle.includes(word)) score += 0.5;
  }

  // Category matching
  for (const word of queryWords) {
    if (normalizedCategory.includes(word)) score += 0.3;
  }

  // Tag matching
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
