# Queue Processing (BullMQ)

To ensure the API remains highly responsive, all slow, I/O-bound, or external network operations are offloaded to background workers using [BullMQ](https://docs.bullmq.io/) backed by Redis.

## Queue Definitions

Queues are defined and initialized in `src/jobs/queues.ts`.

### 1. `emailQueue`

Handles all transactional emails (Welcome emails, Order Confirmations, Password Resets).

- **Why?** Connecting to SMTP or SendGrid APIs can take hundreds of milliseconds and can timeout.

### 2. `recommendationQueue`

Handles pre-computing heavy MongoDB aggregations for personalized feeds.

- **Why?** When a user requests a personalized feed and the cache is missed, the API immediately returns a generic "Trending" fallback and enqueues a job. The worker computes the personalized feed and writes it to Redis, so the user's next page load is personalized and instant.

### 3. `notificationQueue`

Handles pushing WebSocket, SMS, or Push notifications to clients.

## Worker Mechanics

Workers live in `src/jobs/workers/`.

- They are instantiated in `src/jobs/workerIndex.ts`, which is executed either in the main thread (for local dev) or in a separate Docker container (for production scalability).
- **Concurrency**: Workers process jobs concurrently (default: 5-10 jobs at a time per worker process).
- **Retries**: BullMQ is configured with exponential backoff. If an email fails to send due to a network glitch, it will automatically retry 3 times with increasing delays.

## Development

When developing locally, ensure Redis is running. If you want to bypass the queue for debugging, you can call the Job handler functions (e.g., `processEmailJob(job)`) directly in your service layer, though this should never be committed.
