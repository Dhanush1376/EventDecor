# 📈 Scaling Recommendations — Siri Arts & Crafts

## Current Architecture Scaling Characteristics

| Component | Current Config | Scaling Model |
|-----------|---------------|---------------|
| **Render Backend** | Standard plan (2GB RAM), PM2 cluster | Horizontal (add instances) |
| **MongoDB Atlas** | Shared/Dedicated cluster | Vertical (upgrade tier) + Read replicas |
| **Redis (Upstash)** | Serverless | Auto-scaling |
| **Cloudinary** | Cloud CDN | Auto-scaling (usage-based billing) |
| **Frontend (Vercel/Render)** | Static files + CDN | Auto-scaling |

---

## Horizontal Scaling Checklist

Before scaling to multiple Render instances, verify:

- [x] **Application is stateless** — No in-memory sessions; all state in MongoDB/Redis
- [x] **Redis is required** — `REQUIRE_REDIS=true` in production (prevents memory store fragmentation)
- [x] **Socket.io uses Redis adapter** — `@socket.io/redis-adapter` configured
- [x] **Rate limiting uses Redis store** — `rate-limit-redis` configured
- [x] **PM2 process.send('ready')** — Wait-ready signal for zero-downtime deployments
- [ ] **Verify connection pool math** — See below

---

## MongoDB Atlas Connection Pool Math

**Critical**: Each Node.js instance opens a connection pool to Atlas. You must stay below Atlas connection limits.

```
Total Connections = MONGO_POOL_SIZE × PM2_INSTANCES × RENDER_INSTANCES

Current:
  MONGO_POOL_SIZE = 10
  PM2_INSTANCES   = max (CPU cores on Render Standard ≈ 2)
  RENDER_INSTANCES = 1

  Total = 10 × 2 × 1 = 20 connections
```

### Atlas Connection Limits by Tier

| Atlas Tier | Max Connections | Safe Pool Size (2 Render × 2 PM2) |
|------------|----------------|-----------------------------------|
| M0 (Free)  | 500            | 10 (= 40 total)                  |
| M10        | 1,500          | 15 (= 60 total)                  |
| M20        | 3,000          | 20 (= 80 total)                  |
| M30        | 5,000          | 25 (= 100 total)                 |

**Recommendation**: When scaling to 2+ Render instances, reduce `MONGO_POOL_SIZE` to `5` per instance.

---

## Scaling Decision Matrix

### When to Scale Horizontally (More Instances)

| Signal | Threshold | Action |
|--------|-----------|--------|
| CPU consistently > 80% | 5+ minutes | Add Render instance |
| Memory > 75% | Sustained | Add Render instance |
| Response latency p95 > 2s | Sustained | Add Render instance |
| PM2 restarts > 5/hour | Sustained | Increase memory limit or add instance |

### When to Scale Vertically (Bigger Instance)

| Signal | Threshold | Action |
|--------|-----------|--------|
| PM2 OOM restarts | Frequent | Upgrade Render plan (Standard → Pro) |
| MongoDB slow queries | p95 > 500ms | Upgrade Atlas tier or add indexes |
| Redis latency > 10ms | Sustained | Upgrade Upstash plan |

---

## Caching Strategy

### Current Cache Layers

| Layer | What's Cached | TTL | Store |
|-------|--------------|-----|-------|
| User session profile | Auth middleware lookups | 60s | Redis |
| Admin analytics | Dashboard aggregations | 300s | Redis |
| CDN health probe | Cloudinary availability | 300s | In-memory |
| Safety lock | Global write lock state | 30s | In-memory |
| API responses | Admin response cache | Varies | Redis |

### Recommended Additions

1. **Product catalog cache** — Cache frequently accessed products in Redis (TTL: 5 min)
2. **Category list cache** — Categories rarely change (TTL: 30 min)
3. **HTTP caching headers** — Add `Cache-Control` to read-only API endpoints:
   ```
   Cache-Control: public, max-age=60, s-maxage=300
   ```
4. **CDN edge caching** — If using Cloudflare, configure page rules to cache `/api/v1/products` at the edge

---

## Render Plan Upgrade Path

| Stage | Plan | RAM | CPUs | Monthly Cost | Recommended For |
|-------|------|-----|------|-------------|-----------------|
| MVP/Launch | Standard | 2 GB | 2 | ~$25 | < 1K daily users |
| Growth | Pro | 4 GB | 4 | ~$85 | 1K-10K daily users |
| Scale | Pro Plus | 8 GB | 8 | ~$175 | 10K-50K daily users |

### Scaling Beyond Render

When you outgrow Render's capabilities:

1. **Container orchestration** — Migrate to AWS ECS/Fargate or Google Cloud Run
2. **Managed Kubernetes** — EKS/GKE for fine-grained control
3. **Database** — MongoDB Atlas scales independently regardless of compute platform
4. **Redis** — Migrate from Upstash to AWS ElastiCache or Redis Cloud for lower latency

---

## Performance Monitoring Checklist

Before scaling, ensure you can measure the impact:

- [ ] Sentry performance tracing enabled (`tracesSampleRate: 0.2`)
- [ ] Slow request logging enabled (`SLOW_REQUEST_LOG_MS=3000`)
- [ ] MongoDB Atlas → Performance Advisor for index recommendations
- [ ] Render → Metrics dashboard for CPU/Memory trends
- [ ] Application metrics endpoint (`/api/metrics`) for custom telemetry

---

## CDN/Edge Optimization

### Static Assets (Frontend)

The frontend nginx config already has:
- 1-year immutable caching for hashed assets
- Gzip compression level 6
- No-cache for `index.html` and service workers

### API Responses

For a CDN like Cloudflare in front of the API:
- **DO cache**: Product listings, category pages, public content
- **DO NOT cache**: Auth endpoints, user-specific data, payment endpoints
- **Use `Vary: Authorization`** to prevent cached authenticated responses from leaking

### Cloudinary

Cloudinary assets are served from their global CDN (`res.cloudinary.com`). Ensure:
- Use `f_auto,q_auto` transformations for automatic format/quality optimization
- Use responsive breakpoints for mobile optimization
- Set `secure: true` in Cloudinary config to enforce HTTPS delivery
