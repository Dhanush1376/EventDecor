// ══════════════════════════════════════════════════════════════════════
// Telugu-First AI Search Dictionaries
// ══════════════════════════════════════════════════════════════════════
// This is the linguistic brain of the search engine.
// Every Telugu word, transliteration, synonym, and event relationship
// is defined here so the search works like a Telugu-speaking consultant.
//
// The dictionaries were split into one file per concern for maintainability.
// This barrel preserves the original `searchDictionaries` public API so all
// existing imports (named) continue to resolve unchanged.
// ══════════════════════════════════════════════════════════════════════

export { TRANSLITERATION_MAP } from './transliterationMap';
export { SYNONYM_MAP } from './synonymMap';
export { CATEGORY_KEYWORDS } from './categoryKeywords';
export { INTENT_EXPANSION_MAP } from './intentExpansionMap';
export { EVENT_KNOWLEDGE_GRAPH, type EventGraphEntry } from './eventKnowledgeGraph';
