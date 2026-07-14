// Barrel: recommendationEngine was split into two cohesive modules —
//   recommendationServing.ts    : real-time recommendation serving
//     (getPersonalizedRecommendations + circuit breaker/weights, getSimilarRecommendations,
//      enrichScoredItems) and the shared RecommendedItem/RecommendationContext types
//   recommendationPrecompute.ts : offline batch jobs (precomputeCatalogRecommendations,
//     precomputeActiveUsersFeeds, initRecommendationSystem)
// Public API preserved — all named exports re-exported so every importer (incl.
// require('.../recommendationEngine')) resolves unchanged.
export * from './recommendationServing';
export * from './recommendationPrecompute';
