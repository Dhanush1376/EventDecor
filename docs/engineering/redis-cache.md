# Redis Cache Strategy

Redis is a critical piece of the EventDecor infrastructure. It is used for caching, distributed locking, rate limiting, session management, and task queues.

## 1. Tiered Caching

For highly accessed endpoints (like the Recommendation Engine or Product Catalog), we employ a **Tiered Cache Strategy**:

- **L1 Cache (In-Memory)**:
  - Using `node-cache`.
  - Extremely fast (sub-millisecond), bypasses the network.
  - Used for immutable or highly volatile/frequently read data.
  - TTL is usually very short (e.g., 5-60 seconds).
- **L2 Cache (Redis)**:
  - Centralized cache shared across all Node.js instances.
  - Used for expensive aggregations (e.g., personalized feeds, category trees).
  - TTL ranges from 5 minutes to 24 hours depending on the resource.

## 2. Distributed Locks

To prevent race conditions (especially around Inventory and Event Bookings), we use Redis to acquire distributed locks (`src/utils/DistributedLock.ts`).

- When a user proceeds to checkout, a lock is placed on the specific inventory items.
- If the payment fails or times out, the lock is automatically released based on its TTL.

## 3. Session & Token Management

- Instead of storing massive session data, we store the hash of a user's Refresh Token in Redis.
- This allows us to instantly revoke tokens globally if an account is compromised, without needing to query MongoDB on every request.

## Cache Invalidation Strategy

Currently, cache invalidation is handled application-side:

- Time-based invalidation (TTL).
- Event-based invalidation (e.g., when an Admin updates a Product, the `clearCache()` utility is called on the `product:{id}` key).
