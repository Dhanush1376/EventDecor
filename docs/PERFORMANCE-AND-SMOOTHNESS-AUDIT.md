# Performance & Smoothness Audit — Siri Arts & Crafts

Audit date: 2026-10-31

## Measurement caveat

All browser timings come from **one cold load** of `https://siriartsandcrafts.com/` in the Claude desktop built-in browser while the pane was **hidden**. Background tabs are throttled, so paint/LCP/DCL numbers from that run (first-paint 16.6 s, DCL 16.3 s, LCP not recorded) **are not trustworthy and aren't used as findings**. Network-level numbers (TTFB, transfer sizes, API durations) are less affected and are reported as *indicative*. No Lighthouse, WebPageTest, Slow-4G or field (CrUX/RUM) data was collected. **LCP, INP, CLS, FCP and TBT are therefore UNVERIFIED.**

## Measured (indicative)

| Metric | Value | Source |
|---|---|---|
| HTML TTFB (curl, edge) | 1.74 s | `curl -w` |
| HTML TTFB (browser) | 1.56 s | Navigation Timing |
| `domInteractive` | ≈3.5 s | Navigation Timing |
| API `/health` (Render direct) | 0.99 s | curl |
| `/api/v1/categories/active` | ≈3.0 s | Resource Timing |
| `/api/v1/cms` | ≈2.9 s | Resource Timing |
| `/api/v1/csrf-token` | ≈0.95 s | Resource Timing |
| `/api/business-metrics` (public, see SAC-013) | 5.4 s | curl |
| JS files on homepage | 50 (≈327 KB transferred) | Resource Timing |
| Total transferred | ≈670 KB+ (more images loaded later) | Resource Timing |
| Largest images | 590 KB, 346 KB (Cloudinary originals, no transforms) | Resource Timing |
| Long tasks | 4 (≈416 ms over 50 ms, throttled) | Long Task API |

## Build analysis (local `vite build`, working tree)

Largest chunks (raw / brotli): `observability` 461 / 127 KB (Sentry + LogRocket), `jspdf` 389 / 105 KB, `index` (entry) 375 / 80 KB, `BarChart` (recharts) 350 / 83 KB, `framework` 220 / 61 KB, `html2canvas` 195 / 37 KB, admin `Dashboard` 211 / 36 KB, CSS 456 / 43 KB. Only `framework` and `domainServices` are `modulepreload`ed by `index.html`. Whether `observability` loads on the storefront's critical path wasn't confirmed.

The project has `postbuild` budget and performance-guard scripts. They passed.

## Problems

1. **Image weight (P1, SAC-011):** Cloudinary originals served at full resolution. This is the single biggest likely LCP problem on mobile. Use `f_auto,q_auto,w_<n>` with `srcset`/`sizes`, and preload the hero/LCP image.
2. **Slow public data APIs (P1):** categories and CMS take ~3 s and gate homepage sections. They're public and rarely change, so cache them at Vercel/Cloudflare (`s-maxage` + `stale-while-revalidate`) or inline a build-time snapshot.
3. **Backend hosting latency:** the API sits on Render behind a Vercel rewrite and Cloudflare. Every API call crosses edge → Render. Whether the Render plan sleeps when idle (cold starts of 30 s+) is UNVERIFIED. Confirm the plan.
4. **CSRF bootstrap round trip (~1 s)** before mutating calls. Acceptable, but it could be issued with the HTML or lazily.
5. **Heavy vendor code:** keep LogRocket off by default or lazy-load it after interaction. Confirm `jspdf`/`html2canvas`/`recharts` load only on invoice/admin routes.
6. **Artificial delay:** `AdminSettings.jsx:335` (2 s sleep in the fake reset, SAC-014). No artificial delays found on storefront paths in a grep of `setTimeout(...2000|3000)`. The remaining hits are UI feedback timers.

## Truthfulness

Payment, stock and order confirmation stay server-authoritative (order creation waits for the server, and payment success needs server verification). That's correct and must stay so. But with SAC-001, "in stock" is effectively always true, which is a correctness problem, not a speed one.

## What is needed to sign off performance

- Lighthouse mobile (Slow 4G, 4× CPU) on `/`, a category page, a product page and the cart, with a visible pane or headless CI.
- RUM via Sentry Web Vitals or `web-vitals` for at least a week.
- Large-catalogue and concurrent-request load test of the product listing and search APIs against a staging DB.
