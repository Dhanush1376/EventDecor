// Barrel: queryParser was split into two cohesive modules for maintainability —
//   queryExpansion.ts : pure query-string transforms (normalization, transliteration/
//                       synonym expansion, fuzzy variants, spell correction, category
//                       prediction, intent expansions)
//   queryAnalysis.ts  : query intent analysis (search-mode detection, local analysis,
//                       AI-assisted analysis)
// The original public API is preserved — all named exports are re-exported here so
// every existing `./queryParser` import continues to resolve unchanged.
export * from './queryExpansion';
export * from './queryAnalysis';
