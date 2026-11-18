# Storefront Remediation Report: Shared Element Transitions, WhatsApp Returns, Fixes

Date: 2026-11-16 · Branch: `main` (uncommitted working tree) · Builds on the 2026-10-31 audit in
`CRITICAL-ISSUES-REGISTER.md`, whose fixes were already in the working tree.

This pass covered the highest-priority items in the brief: the shared element transition system,
the WhatsApp return/exchange workflow, references to removed features, and the bugs found along
the way. Some phases of the brief were **not** done, or done only in part. They are listed
honestly in §12.

---

## 1. Issues found

| # | Severity | Issue | Where |
|---|---|---|---|
| 1 | High | All 10 city SEO landing pages returned 404. `/:city(a\|b\|…)` is regex syntax, which React Router v7 does not support. Verified with `matchPath`: it matches nothing. | `routes/AppRoutes.jsx` |
| 2 | High | Back never restored the listing's scroll position. `MainLayout` scrolled to the top 10 ms after every pathname change, racing `ScrollManager`'s restore. `ProductDetails`, `EventDetail` and `MinimalLayout` also forced top on mount. | layouts, pages |
| 3 | Medium | Back to a filtered listing jumped to the shop anchor (initial-mount logic ignored POP). | `pages/ProductListing/index.jsx` |
| 4 | Medium | Clicking a product card's image pushed **two** history entries (inner `<Link>` + the card's `onClick` `navigate`), so Back needed two presses. | `ProductCard.jsx` |
| 5 | Medium | The order page downloaded *all* of a customer's legacy returns and exchanges twice, filtered them client-side, and subscribed to socket events the backend no longer emits. A per-order endpoint already existed. | `OrderDetail.jsx`, `ReturnExchangeSection.jsx` |
| 6 | Medium | `GET /exchanges/my-exchanges` started its `$lookup` from **every** exchange document, so its cost grew with the whole collection. | `exchangeController.ts` |
| 7 | Low (privacy) | The WhatsApp request URL carried the customer's email and phone. The phone is already visible to staff as the WhatsApp sender. | `WhatsAppReturnService.ts` |
| 8 | Low | Mobile gallery "back" used a hand-rolled `#root` slide animation plus a 350 ms delay before navigating. | `ProductGallery.jsx` |
| 9 | Low | Lightbox had no Escape handling and no dialog semantics. Thumbnails had no accessible names. | `ProductGallery.jsx` |
| 10 | Low | The policy page swallowed JSON errors with an empty `catch {}` and had no retry on load failure. | `GenericPolicyPage.jsx` |
| 11 | Low | The product-not-found action did a full page reload (`window.location.href`). | `ProductDetails.jsx` |
| 12 | Low | Gallery-feature leftovers (`isGalleryHidden`) and unused imports produced lint warnings. | `Home.jsx`, `api.js`, `ProductInfo.jsx`, admin activity |

## 2. Issues fixed

All of 1–12 above. Details are in the sections below.

## 3. Obsolete references removed

- Dead socket listeners `return:status_updated` / `return:created` (backend no longer emits them).
- Client-side "fetch everything and filter" logic for legacy returns, replaced by the existing per-order summary endpoint.
- `isGalleryHidden` (gallery feature removed). The CMS skip for saved `galleryInspiration` sections is kept, because stored layouts may still list it.
- Unused `toast`, `BRAND`, `WhatsAppIcon`, `handleImageError`, `formatCurrency`, `useParams` imports.

The legacy return/exchange **history** (read-only records from the old automated flow) is kept
on purpose. It is real customer data, and the endpoints serving it are read-only.

## 4. Components refactored

`ScrollManager` (rewritten), `ProductGallery`, `ProductCard`, `ProductDetails`, `ProductDetailSkeleton`
(geometry now matches the real gallery), `CloudinaryImage` (`placeholderSrc`), `MainLayout`,
`OrderDetail`, `ReturnExchangeSection`, `GenericPolicyPage`, `LocationLanding` (`slug` prop),
`CartItemRow`, `SearchSuggestionsList`, `SearchProductPreview`.

## 5. New reusable pieces

| File | Purpose |
|---|---|
| `frontend/src/utils/navigation/sharedElementTransition.js` | Transition engine: keys, intents, history wrapper, runner |
| `frontend/src/styles/globals/view-transitions.css` | Pseudo-element animation rules (tokens only) |
| `frontend/src/hooks/useLegacyReturnSummary.js` | One cached, cancellable query for an order's legacy returns |
| `frontend/src/components/policy/ReturnExchangeHelpCard.jsx` | WhatsApp how-to, CTA and fallback on return/exchange/refund policy pages |
| Tokens in `theme.css` | `--ease-standard`, `--ease-emphasized`, `--ease-emphasized-decelerate`, `--z-vt-media` |

## 6. Shared element transition implementation

**Approach.** I used the native View Transitions API rather than Framer Motion `layoutId`. Routes
are lazy and unmount on navigation, so `layoutId` would have needed both pages mounted at once
(an `AnimatePresence` route rewrite). The View Transitions API animates between two real DOM
states without that.

**Architecture**

1. **Identity.** Any element that shows an entity carries `data-vt="product-<id>"`. Build it with `productTransitionKey(id)` and `sharedElementProps(key)`. Array indexes are never used. Only the active carousel slide of a card is tagged.
2. **Intent.** A capture-phase click/Enter listener records which tagged element was activated. It uses an explicit `[data-vt-scope]` (whole card) or an `<a href>`. Buttons inside a card (wishlist, add to cart) are excluded, as are modifier-clicks and `target="_blank"`. An intent expires after 1.5 s and only applies if the destination path contains the entity id.
3. **History wrapper.** `createSharedElementHistory()` feeds `unstable_HistoryRouter`. A matching `PUSH` runs inside `document.startViewTransition()`, so every `<Link>` and `navigate()` is covered without touching call sites. Browser **Back/Forward** are handled in the history listener with the same runner. The key comes from the destination entry's state (Forward) or from the entry being left (Back).
4. **Runner.** It names the source element, starts the transition, and in the callback moves the name off the source. Then it performs the navigation and waits for the destination element. It also waits for `ScrollManager` to finish restoring scroll on POP, and for the image to decode (≤220 ms). Duration scales with distance and size change (340–560 ms, 10% faster going back).
5. **Instant destination.** The source image URL travels in history state (`vt.src`). The product page paints it in the hero slot while data loads (skeleton) and uses it as the gallery placeholder, so the transition never targets an empty box.
6. **Safety.**
   - Exactly one element per key is ever named, and only during a transition. This avoids the duplicate-name abort when a product appears twice on a page.
   - A watchdog performs the navigation if the browser never calls the update callback. Verified: in the non-rendering preview pane, navigation still completed in 536 ms.
   - A destination without the element gets 8 frames of grace once its route has committed, not the full timeout.
   - Duplicate pushes to the same destination are dropped.
   - A newer navigation finishes and skips the running transition.
   - Transitions are skipped for reduced motion, Save-Data, ≤2-core devices, hidden documents and browser swipe-back animations (`hasUAVisualTransition`).
7. **Visual rules.** The old page stays opaque and the new page fades in over it (no see-through "white flash"). Media is cropped with `object-fit: cover` during the morph, never stretched. Rounded corners and `z-index` above sticky headers apply where `view-transition-class` is supported. Product info (`.vt-reveal`) rises in just behind the image. Hover-zoom is removed from captured snapshots.

**Transitions covered**

| From → to | Status |
|---|---|
| Listing / category / search-param listing card → product page | ✔ |
| Product page → listing (Back), with scroll position and URL filters kept | ✔ |
| Browser Forward into a product page | ✔ |
| Home sections (best sellers, trending, recommended), collections, wishlist, related products → product page | ✔ (all render `ProductCard`) |
| Product page → related product page, and Back | ✔ |
| Cart row image → product page | ✔ |
| Search suggestion / search preview image → product page | ✔ |
| Gallery thumbnail → main image | ✔ |
| Main image ↔ full-screen viewer (open and close) | ✔ |
| Direct URL, refresh, missing image | Plain load (nothing to animate from). Cards without images are not tagged. |
| Event cards → event page | Not animated (event page has no hero tag yet) |
| Quick View → product page | Keeps its existing morph; not migrated |

## 7. Routes covered in this pass

`/`, `/collections` (with query state), `/product/:id`, `/cart`, `/wishlist`, `/contact`,
`/policy/:slug` (return/exchange/refund get the help card), `/returns` → `/policy/return-policy`,
10 city landing pages, `/dashboard/orders` (order detail), `/dashboard/returns/new` and
`/dashboard/returns/exchanges/new` (WhatsApp request, unchanged and working). I did not
individually review checkout, auth modals, account sections, blog, events or about in this pass.

## 8. Performance changes

- The order detail page now makes one cached, abortable request for legacy returns instead of four full-history requests.
- The product hero image now loads eagerly with `fetchpriority="high"` (an LCP candidate that was lazy).
- No new dependencies. The transition code is a few KB inside the main bundle. The production build passes `budget-check` and `performance-guards`.
- **Not measured:** LCP/INP/CLS. No Lighthouse or field data was collected this pass. Use the plan in §13.

## 9. Security and privacy changes

- The WhatsApp message no longer includes the customer's email or phone (integration test asserts this).
- The general WhatsApp link on policy pages carries a fixed generic message with no personal data.
- No secrets touched; no new endpoints.

## 10. Backend and database changes

- `getMyExchanges`: index-backed two-step query (`ReturnRequest.userId` → `ExchangeRequest.returnRequestId`, both indexed) replaces a full-collection `$lookup`. Response shape unchanged (each exchange still carries its `returnRequest`). Covered by `tests/integration/legacyReturnHistory.test.ts`.
- No schema changes and no migrations.

## 11. Tests run (actual results)

| Check | Result |
|---|---|
| Frontend ESLint | 0 errors, 5 warnings (admin-only hook-dependency warnings, pre-existing; was 13) |
| Frontend Vitest | 52 passed (13 new for the transition engine) |
| Frontend production build + budget + perf guards | Passed |
| Backend `tsc --noEmit` | Passed |
| Backend ESLint (`src`) | Passed |
| Backend Vitest | 219/219 passed across 27 files (baseline 217, plus 2 new `legacyReturnHistory` tests) |
| Browser (preview pane, 375×812 emulated) | Card click → product page: one history entry, key recorded, hero tagged, no leftover names. Back → listing at the exact prior scroll (1400 px). Forward → product. Sort query kept on Back. City landing renders. Policy help card renders with an encoded `wa.me` link. No horizontal overflow on `/`, product, `/cart`, `/contact`. |

**Not verified visually:** the animation itself. The preview pane was hidden during testing, and a
hidden pane gets no animation frames. I confirmed the flow (start, callback, watchdog, names, scroll)
but did not watch the motion. Before shipping, check it in a visible Chrome/Safari window:
listing → product → Back, thumbnail → main, main ↔ viewer.

## 12. Remaining work (not done in this pass)

- **Design system consolidation (Phase 3):** only motion and z-index tokens were added. The storefront still has many hard-coded hex colours, radii and font sizes (e.g. `text-[9px]`, `#2A2927`). Consolidating them is a larger, page-by-page job.
- **Full UX audit (Phase 5)** of checkout, auth, account, blog, events and about pages.
- **E2E tests (Phase 11):** no Playwright/Cypress suite exists. Shared element, checkout (Razorpay test mode) and WhatsApp flows should get E2E coverage.
- **Core Web Vitals measurement** and responsive checks at all nine widths (only 375 px was checked).
- Event page hero tag, and migrating the Quick View morph onto the shared system.
- Items still open in `CRITICAL-ISSUES-REGISTER.md`: SAC-002 restore drill, SAC-007 stuck outbox events, SAC-008 `unsafe-inline`, SAC-011 edge caching.

## 13. Infrastructure for higher traffic

- Measure first: k6 or Artillery against staging with a realistic mix (70% browse/listing, 20% product detail, 8% cart, 2% checkout). Ramp until p95 latency > 800 ms or error rate > 1%. That point is the measured capacity per instance.
- Keep the API stateless (it already uses Redis for the socket adapter and rate limits) and scale horizontally behind the load balancer. Size the Mongo pool per instance × instances below the Atlas tier's connection limit.
- Edge-cache the public CMS, category and product-listing GET endpoints with short TTLs plus `stale-while-revalidate` (SAC-011). Product, cart and order writes stay uncached.
- Serve images via Cloudinary/CDN only (already the case). Keep checkout idempotency and the atomic stock/coupon guards from the previous pass.

## 14. Production-readiness assessment

The changes in this pass are complete and verified as far as the tooling allowed: build, lint,
unit/integration tests, and functional browser checks. Two things should happen before calling
the storefront production-ready:

1. A visual check of the transitions in a visible browser.
2. The open register items (backup restore drill, outbox backlog).

Design-system consolidation and E2E coverage are the largest remaining pieces of the original
brief.
