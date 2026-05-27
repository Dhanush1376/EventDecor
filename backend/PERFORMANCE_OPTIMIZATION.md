# Performance Optimization Strategy

This document outlines the performance optimizations implemented for Siri Arts & Crafts backend under production load, balancing raw performance with necessary security constraints.

## 1. Database Optimization Strategy

### 1.1 Index Coverage
MongoDB performance relies heavily on indexes. Without them, queries trigger full collection scans, exhausting CPU and memory under load. We've implemented specific compound indexes to cover the hot paths:

- **Recommendation Feed Engine:** `Gallery.find({ isActive: true }).sort({ views: -1 })` and `Event.find({ isActive: true }).sort({ createdAt: -1 })` now utilize compound indexes `({ isActive: 1, category: 1, views: -1 })` and `({ isActive: 1, category: 1, createdAt: -1 })` respectively.
- **Product Review Page:** `Review.find({ product: id, status: 'approved' }).sort({ rating: -1, createdAt: -1 })` now utilizes a specific 4-part compound index to prevent in-memory sorts.
- **User Profiles:** The `UserPreferenceProfile` model's unique index on `userId` is strictly enforced to optimize the recommendation engine's O(1) lookup hot path.

*Note: Background index creation (`ensureIndexes.ts`) is triggered on app startup for models without pre-existing schemas.*

### 1.2 Connection Pooling & Resiliency
- `maxPoolSize`: Maintained at 20 (or via ENV).
- `heartbeatFrequencyMS`: Reduced to `10000` (10s) to detect MongoDB node failovers and network partitions 3x faster than the Mongoose default (30s).
- `maxIdleTimeMS`: Set to `60000` (60s) to proactively close unused socket connections during traffic lulls, preventing resource exhaustion on both the Express server and the MongoDB cluster.

---

## 2. API Optimization Strategy

### 2.1 Request Timeout Management
Long-running requests tie up Express worker threads and DB connections, leading to cascading failures.
- Implemented a global `requestTimeout` middleware (default: 30s).
- Exempts webhooks (Razorpay) and large file uploads (Cloudinary) which handle their own streaming timeouts.
- Logs 504 Gateway Timeouts to Winston for observability.

### 2.2 Search API Hardening (ReDoS Prevention)
The `searchAll` pipeline is heavily optimized:
- **Regex Capping:** Limit `generateFuzzyVariants` to 6 variants and total AI `expandedTerms` regex array to 15 items max. This prevents ReDoS (Regular Expression Denial of Service) via computationally expensive MongoDB `$in: [regex]` arrays.
- **Time Boxing:** Added `.maxTimeMS(5000)` to all search queries. If the query exceeds 5s, MongoDB aborts it, preventing a single complex query from hanging the DB.
- **Levenshtein Skip:** Asynchronous Levenshtein distance calculations skip inputs > 50 characters to protect the Node.js event loop.

### 2.3 Recommendation Engine Circuit Breakers
The AI recommendation engine is resource-intensive, hitting MongoDB, Redis, and Groq concurrently.
- **Circuit Breaker:** Added a fast-fail circuit breaker. 3 consecutive failures open the circuit for 60 seconds, during which requests immediately fall back to a cached, non-personalized cold-start feed.
- **Parallel Resilience:** Switched from `Promise.all` to `Promise.allSettled`. If the behavioral scoring engine fails, the trending feed engine still succeeds, allowing graceful degradation.
- **Result Capping:** Hard-capped candidate document fetches to 80 items per request to prevent V8 heap spikes during the scoring phase.

---

## 3. Memory Leak Prevention

Unbounded data structures are the primary cause of Node.js memory leaks.

### 3.1 Metrics Tracker Eviction
- The `routeMetrics` map now implements LRU eviction, capped at 500 unique routes.
- A 24-hour periodic flush ensures no long-tail accumulation of random parameterized paths.

### 3.2 Global MemoryCache Budget
- Multiple `MemoryCache` instances (category, CMS, analytics, etc.) now share a static `totalEntries` counter.
- Entries are size-estimated upon insertion. Values exceeding 512KB are rejected to prevent caching large datasets (like unpaginated DB dumps).
- Implemented cache pressure logging when instances exceed 90% capacity.

---

## 4. Monitoring & Profiling Recommendations

### 4.1 Built-in Telemetry
- `performanceMonitor.ts` tracks Event Loop Lag every 5 seconds. Warnings log if lag exceeds 100ms.
- Memory usage is tracked dynamically, warning if the V8 heap usage exceeds 85% of available limits.
- The `slowQueryLoggerPlugin` attaches to Mongoose globally, logging any DB operation taking longer than 1000ms.

### 4.2 Infrastructure Scaling (Render + Redis)
- **Horizontal Scaling:** Ensure Redis is enabled (`REQUIRE_REDIS=true`). Local memory caches do not synchronize state reliably across multiple instances.
- **Socket.io:** The application explicitly aborts startup if running in multi-instance mode without a Redis adapter for Socket.io.
- **Cloudinary Concurrency:** Ensure uploads from client directly use signed URLs where possible. Backend proxies are restricted to 5 concurrent streams to protect network bandwidth.

## 5. Security-Performance Balance

1. **AI Output Sanitization:** Sanitizing nested AI JSON objects costs CPU time but is strictly necessary to prevent Stored XSS. We mitigate this by caching the sanitized output, not the raw AI response.
2. **Search Regex Limitations:** Limiting typo-tolerance to 6 variants slightly degrades search UX for heavily misspelled queries, but mathematically eliminates the risk of DB CPU exhaustion.
3. **Tracking Deduping:** Processing 20 analytics events via `UserInteraction.insertMany` costs CPU, but deduplicating in memory first prevents DB write locks and protects the recommendation engine from manipulated velocity attacks.
