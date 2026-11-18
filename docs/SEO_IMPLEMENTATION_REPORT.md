# SEO Implementation Report — Siri Arts & Crafts

Date: 16 November 2026 · Scope: `frontend/` (React 19 + Vite SPA on Vercel behind Cloudflare) and the sitemap in `backend/`.

Google picks sitelinks itself, and nothing here can force a particular arrangement. What this work changes is the signal Google gets: one canonical URL per page, a unique title and description for each page, the same section names in every navigation surface, honest structured data, and noindex on private pages. Search results only change after Google recrawls and reprocesses the site, which usually takes days to weeks.

---

## 1. Existing SEO problems found (verified against the live site)

| # | Problem | Evidence | Impact |
|---|---|---|---|
| 1 | **Every URL returned the same HTML with `<link rel="canonical" href="https://siriartsandcrafts.com/">`** | `curl` of `/collections`, `/events`, `/policy/*` | Each page's raw HTML said it was a duplicate of the homepage |
| 2 | **Duplicate head tags at runtime.** react-helmet-async v3 on React 19 hoists every `<Helmet>` instance's tags side by side and never removes static ones | Rendered DOM showed 3× description, 3× robots, 3× canonical, 3× each JSON-LD block | Conflicting canonicals and descriptions, so Google may ignore them |
| 3 | 404 page was **indexable**: `NotFound` passed a `robots` prop the SEO component ignored | Unknown URLs returned 200 + "index, follow" | Soft 404s in the index |
| 4 | The sitemap Google received was a **stale static file** (`frontend/public/sitemap.xml`, lastmod 2026‑09‑23). Vercel serves static files before rewrites, so the dynamic `/sitemap.xml` rewrite never ran | Live sitemap had 288 URLs | — |
| 5 | Sitemap contained **136 `/gallery/*` URLs, `/custom-orders` and `/showcases`** (all redirects or duplicates) and `/policy/cancellation-policy` (does not exist, API 404) | Live sitemap | Wasted crawl budget; sitemap errors |
| 6 | Every static sitemap entry used **"today" as lastmod** | `sitemapGenerator.ts` | Made-up lastmod values, which Google learns to ignore |
| 7 | Shop page **H1 came from the CMS: "Heritage Collection "**. There was a second H1 "Shop" further down | `/api/v1/cms` → `shopPage.hero.title` | This is the source of the "Heritage Collection" sitelink |
| 8 | Events page had two H1s, the first being the CMS text "Luxury Event Scapes" | `ShowcaseHero.jsx`, `EventShowcases` | Unclear page label |
| 9 | Homepage had **no H1**; product pages used **H2** for the product name | DOM | Weak page-topic signal |
| 10 | Labels differed between surfaces: "Collections" (footer, breadcrumbs, error page), "Shop" (header), "Contact" vs "Contact Us", "Event Decorations" | Footer CMS data, `ProductDetails`, `EventDetail` breadcrumb | Mixed anchor text for the same URL |
| 11 | **Product schema always said `InStock`**, used a rolling fake `priceValidUntil`, an incomplete `shippingDetails`, and `aggregateRating` with `reviewCount` defaulting to 1 | `SEO.jsx`, `ProductDetails.jsx` | Inaccurate structured data, which risks a manual action |
| 12 | `LocalBusiness` schema used hardcoded geo coordinates and an invented `priceRange`. `WebSite` used the retired `SearchAction`. A `SiteNavigationElement` list tried to steer sitelinks | `SEO.jsx` | Inaccurate or unsupported markup |
| 13 | Wishlist view and cart view rendered **indexable** metadata (the nested component overrode the page's noindex) | `WishlistView.jsx`, `CartView/index.jsx` | Private pages could be indexed |
| 14 | Event detail passed `image=` (ignored), so it had no OG image. Its title had the suffix "\| Premium Decor" | `EventDetail.jsx` | Poor previews and titles |
| 15 | Legacy URLs (`/gallery`, `/showcases`, `/shipping`, `/terms`, …) were **client-side** redirects that return HTTP 200 | `AppRoutes.jsx` | Soft redirects; Google kept the old URLs |
| 16 | Missing hashed JS chunks under `/assets/` were answered with **index.html (200, text/html)** by the catch-all rewrite | `vercel.json` | Cause of the "Update Available" result (see §5) |
| 17 | robots.txt disallowed `/cart/`, `/checkout/`, `/wishlist/`, `/track/`, `/dashboard/` | `public/robots.txt` | Blocked crawlers from seeing noindex. The trailing slash also meant `/cart` itself wasn't covered |
| 18 | OG image declared as 1200×630, but `og-image.webp` is 630×630 | file inspection | Wrong preview metadata |
| 19 | Policy pages showed **"Last updated: <today>"** when the policy failed to load | `GenericPolicyPage.jsx` | Made-up date |

## 2. Incorrect sitelinks investigated

| Sitelink | Origin | Fix |
|---|---|---|
| Heritage Collection | Shop page H1 = CMS `shopPage.hero.title` ("Heritage Collection ") | H1 is now "Shop" |
| Update Available | ErrorBoundary chunk-load error screen got indexed (see §5) | Error state is now noindex; missing assets now return a real 404 |
| Blossom Couple Ring Tray | A real product page Google chose on its own | Kept indexable. Improved product metadata, breadcrumbs and links to the Shop |
| Ganesh pooja backdrops | A real product or category Google chose on its own | Same as above |
| Our Story / Contact Us | Legitimate pages | Labels made consistent everywhere |

Product pages were **not** deindexed. They are legitimate content.

## 3. Heritage Collection → Shop

- `/collections` stays the Shop URL. It is already indexed and holds all the internal links, and changing URLs would reset those signals for no gain. `/shop` now 301-redirects to `/collections`.
- Shop hero H1 is now always **"Shop"** (`ProductListingHeader.jsx`). The second listing heading is now an H2.
- Title: *Shop Handcrafted Wedding & Event Decor | Siri Arts & Crafts*, with a unique description, a CollectionPage + BreadcrumbList schema, and a prerendered head.
- Category views `/collections?category=<name>` are indexable with their own title, description, canonical and breadcrumb (*Jewellery Trays | Shop | Siri Arts & Crafts*) and are listed in the sitemap. Search results (`?search=`) are noindex.
- Admin Shop/Events editors: the "Hero Title" field is now labelled as not displayed, and the "e.g. Heritage Collection" placeholder is gone.
- Visible "Collections" labels on public pages (breadcrumbs, error page, 404, homepage hero CTA, About CTA) now say "Shop".

## 4. Events

- `/events` keeps its URL. The H1 is now **"Events"** and the secondary heading is an H2. Title: *Events & Event Decor | Siri Arts & Crafts*.
- `/showcases` (a duplicate of `/events`) now 301-redirects to `/events` at the edge and on the client.
- Event detail pages: the title is the event name only, the OG image comes from the event, and the breadcrumb is **Home › Events › <name>** (previously "Collections"). A not-found event is now noindex.
- No `Event` schema is emitted. These are decor packages and showcases with no dates or venues, so `Event` markup would be made up.

## 5. "Update Available": root cause and fix

**Root cause.** `ErrorBoundary` renders the heading *"Update Available"* when a lazy-loaded JS chunk fails to load. After each deploy the old hashed chunks disappear. Googlebot renders pages with aggressively cached JavaScript, so it requested old chunk URLs. Vercel's catch-all rewrite answered those with **index.html (200, text/html)**, the dynamic import failed, and the error screen became the rendered content of the page. Google then took "Update Available" as that page's label. It is not a PWA prompt: `PwaUpdatePrompt` returns `null`, and `sw-cleanup.js` only unregisters old service workers.

**Fix.** The update-recovery behaviour is unchanged.
1. While the error screen is shown, `ErrorBoundary` adds `<meta name="robots" content="noindex, nofollow">` and removes it on recovery. The error heading is no longer a heading element.
2. `vercel.json`: the SPA fallback now excludes `/assets/`, so a missing chunk returns a **real 404** instead of HTML. `lazyWithRetry`'s reload-on-new-deploy recovery still works.
3. Precompressed `index.html.br/.gz` files are regenerated after prerendering, so servers with `gzip_static` never serve a stale shell.

## 6. Product SEO

- Title: `seoTitle || title` + brand (e.g. *Floral Jewelry Tray | Siri Arts & Crafts*). Description: `seoDescription || description`, stripped of HTML and capped at 160 characters. Products without text get a generated description built from real fields.
- OG image is the product image. Breadcrumb: **Home › Shop › <Category> › <Product>**, both visible and as schema.
- Product name is now the page **H1**.
- `Product` schema is built only from real data: `Offer` only with a real price, availability from real `stock`, `AggregateRating` only when `rating > 0` **and** the review count is > 0. Removed: fake `priceValidUntil`, incomplete shipping data, always-InStock.
- A missing product is noindex on the client. Crawlers get an **HTTP 404** from the crawler function.

## 7. Policy pages

Six policies exist in the CMS: Privacy, Terms and Conditions, Shipping, Return, Exchange, Refund. There is no Cancellation or standalone Return & Exchange policy, and none was created.

- Each has a unique title and an accurate description written from its actual content (`POLICY_PAGES` in `seoConfig.js`), a canonical, OG tags, WebPage + BreadcrumbList schema, a prerendered head, and a sitemap entry with the real `updatedAt` as lastmod.
- H1 = policy title, H2 = sections (existing structure confirmed).
- "Last updated" shows the real CMS `updatedAt` in `<time>`, formatted for en-IN. Nothing is shown if that date is unknown.
- A nonexistent policy slug is noindex. `/cancellation` now 301-redirects to the Terms and Conditions page, which contains the "Returns and Cancellations" section, instead of to a 404 policy.
- Policy text and business commitments were not changed.

## 8. Cart, checkout, wishlist

`noindex, follow` is enforced three ways:
- In `<SEO />` by route (`isNoindexPath`), whatever props a page passes.
- With an `X-Robots-Tag: noindex, follow` response header from Vercel, which works without JavaScript.
- They are excluded from the sitemap.

robots.txt no longer blocks them, so crawlers can see the noindex. Authentication and authorisation are unchanged.

## 9. Other private routes

The same treatment applies to `/dashboard/*`, `/admin/*`, `/track/*`, `/order-success`, `/accept-invite`, `/coupons`, `/invoice-preview`, `/events/book`, `/events/dashboard`, `/booking-success/*`, login/register/reset paths, `/product/:id/reviews(/images)` (thin duplicates of the product page), search results, 404 and error states. Noindex pages get no canonical.

## 10. Metadata architecture

```
src/seo/seoConfig.js    single source of truth: titles, descriptions, nav labels, noindex rules,
                        canonical builder, schema builders, HTML head renderer (framework-free)
src/seo/headManager.js  replaces react-helmet-async for storefront SEO: exactly one set of tags;
                        page-level <SEO> beats the layout default; removes prerendered tags on hydration
src/components/seo/SEO.jsx   route-aware component used by every page
scripts/prerender-seo.mjs    postbuild: writes per-page heads into static HTML
api/page-meta.js             crawler-only server head for /product/:id and /events/:id
api/sitemap.js               sitemap proxy with cache + static fallback
```

- **Static pages** (Home, Shop, Events, Our Story, Contact Us, Blog, 6 policies) have their full head prerendered at build time: `dist/index.html` for the homepage and `dist/_seo/*.html` for the rest, with explicit `vercel.json` rewrites. No runtime cost. The build **fails** if a rewrite is missing.
- **Every other route** is served `dist/app-shell.html`, a generic head with **no canonical**. `<SEO />` fills in the correct tags after render.
- **Product and event pages for crawlers** (user-agent-conditioned rewrite) are served the same SPA shell with the real head injected from the API: title, description, canonical, OG image, Product/Breadcrumb JSON-LD. CDN-cached for 10 minutes. Removed items return 404. Humans keep the normal static SPA, so they get no extra latency, and shared element transitions are untouched.
- No new dependencies. react-helmet-async remains only for the admin drafts page title.

## 11. Sitemap changes

`backend/src/utils/sitemapGenerator.ts` was rewritten:
- **Includes:** `/`, `/collections`, `/events`, `/about`, `/contact`, `/blog`, category pages (only categories with active products), active non-deleted products, active showcases and events (`/events/:id`), published policies, blog posts, and routed location pages.
- **Excludes:** private routes, redirecting URLs (`/gallery`, `/showcases`, `/custom-orders`, …), unrouted location slugs, duplicates.
- **lastmod** only from real `updatedAt` dates. The Shop/Events/Blog lastmod is the newest child change. Pages with no meaningful date get no lastmod. `changefreq` and `priority` were removed, since Google ignores them.
- Cached in memory for 10 minutes with single-flight builds, refreshed when content changes, and serves the last good copy on error. It **no longer writes into `frontend/public`**.
- `frontend/public/sitemap.xml` was deleted, so Vercel's `/sitemap.xml` → `api/sitemap` rewrite now runs. The function falls back to a static-pages-only sitemap if the backend is cold.

## 12. robots.txt

```
User-agent: *
Allow: /
Disallow: /admin
Sitemap: https://siriartsandcrafts.com/sitemap.xml
```
CSS, JS, images and `/api/` (needed to render pages) are all crawlable. Cloudflare's managed AI-crawler block is prepended at the edge. That block comes from the Cloudflare dashboard, not the repo, and does not affect Googlebot.

## 13. Structured data

| Page | Schema |
|---|---|
| Home | Organization (name, logo, real address/phone/email from store settings), WebSite, WebPage |
| Shop / category | CollectionPage, BreadcrumbList |
| Events | CollectionPage, BreadcrumbList |
| Event detail | BreadcrumbList |
| Product | Product (+ Offer from real price and stock; AggregateRating only with real reviews), BreadcrumbList |
| Our Story | AboutPage, BreadcrumbList |
| Contact Us | Organization + ContactPoint, ContactPage, BreadcrumbList |
| Policies | WebPage, BreadcrumbList |
| Blog / locations | Unchanged article/FAQ data from the CMS |

Removed: hardcoded geo coordinates, `priceRange`, made-up opening-hours defaults, `SearchAction`, `SiteNavigationElement`, rolling `priceValidUntil`, default `reviewCount: 1`.

## 14. Internal linking

- Header (desktop and mobile): Shop · Events · Our Story · **Contact Us** (now also on desktop). CMS link labels are normalised by href and ordered to match the primary navigation.
- Footer labels are normalised the same way: "Collections" → Shop, "Contact" → Contact Us. CMS Gallery and Bespoke links are still filtered out.
- Breadcrumbs: Product (Home › Shop › Category › Product), Event (Home › Events › Name), Collection detail (Home › Shop › …).
- Public CTAs now link to the Shop with "Visit the Shop" / "Browse the Shop".
- Legacy URLs are server-side **301** redirects in a single hop.

## 15. Canonical URLs

Canonicals are absolute, always `https://siriartsandcrafts.com` (never a preview host), with no trailing slash (`trailingSlash: false`) and no query string, except the category canonical `?category=<name>`. There is no shared canonical in the shell, none on noindex pages, and nothing points to the homepage by default. `/index.html` 301s to `/`.

## 16. Google Search Console plan

1. **Deploy both services.** Deploy the frontend on Vercel. Deploy the backend on Render: until then `/sitemap.xml` still proxies the old generator's output, which includes the gallery URLs.
2. Verify the property with a DNS TXT record. The commented `google-site-verification` placeholder was removed from `index.html`.
3. **Sitemaps:** remove any old sitemap entries and submit `https://siriartsandcrafts.com/sitemap.xml`. Check that the "Discovered URLs" count roughly equals products + categories + showcases + ~20 static pages.
4. **URL Inspection → Test live URL → Request indexing** for `/`, `/collections`, `/events`, `/about`, `/contact` and the six policy pages. Confirm that the "User-declared canonical" equals the page URL.
5. **Pages report:**
   - *Alternate page with proper canonical* / *Duplicate, Google chose different canonical*: these should shrink as pages stop declaring the homepage canonical.
   - *Page with redirect* (`/gallery/*`, `/showcases`, `/custom-orders`): expected. They drop out over time and need no action.
   - *Soft 404*: unknown URLs and missing products are now noindex (404 for crawlers on products). Use *Validate fix*.
   - *Excluded by noindex*: cart, checkout, wishlist, dashboard. Expected.
   - *Blocked by robots.txt*: should be gone, since only `/admin` remains blocked.
6. **Removals tool:** only if "Update Available" or a private URL is still showing in results after recrawl, use a *temporary* removal for that exact URL. Do not remove product URLs.
7. **Enhancements:** check Product snippets / Merchant listings and Breadcrumbs. Validate a few product URLs in the Rich Results Test.
8. Watch **Core Web Vitals** and **HTTPS** for regressions over the next 28-day window.

## 17. Validation results

| Check | Result |
|---|---|
| `npm run build` (frontend) incl. prerender, budget and performance guards | ✅ passes; 12 heads prerendered |
| Frontend unit tests (`vitest`) | ✅ 91/91, incl. 39 new SEO tests: noindex rules, unique titles/descriptions, length limits, vercel rewrite coverage, schema honesty, escaping |
| Backend sitemap unit test | ✅ 4/4: only canonical URLs, no private or redirect URLs, no made-up lastmod, valid escaped XML |
| ESLint on changed files | ✅ clean |
| Prerendered HTML | ✅ one canonical per page, correct robots; shell has no canonical; `.br/.gz` match HTML |
| Production build in browser (live API data): `/`, `/collections`, category, search, `/events`, `/contact`, `/about`, policies, missing policy, `/cart`, `/wishlist`, `/checkout`, 404, product, event | ✅ exactly 1 title / description / robots / canonical each; correct index or noindex; expected schema types; single H1 ("Shop", "Events", product name, …) |
| Header labels | ✅ Shop · Events · Our Story · Contact Us |
| `api/page-meta.js` (local, live API) | ✅ product and event 200 with full head; unknown id → 404 noindex; malformed id → 404 |
| `api/sitemap.js` | ✅ proxies the backend; static fallback path present |

**Not yet verified** (needs the deployed site):
- Vercel's handling of the `has` user-agent rewrites, `trailingSlash`, the 301 redirects and the `X-Robots-Tag` headers.
- The new backend sitemap against the real database.
- Google Rich Results Test and Schema Markup Validator runs.
- Lighthouse.

After deploying, run:

```bash
curl -sI https://siriartsandcrafts.com/gallery/x
```
```bash
curl -s https://siriartsandcrafts.com/collections | grep -E "<title>|canonical"
```
```bash
curl -s -A "Googlebot" https://siriartsandcrafts.com/product/6a0c74fa9b8633afb920de7b | grep -E "<title>|canonical|ld\+json"
```
```bash
curl -sI https://siriartsandcrafts.com/cart | grep -i x-robots-tag
```
```bash
curl -s https://siriartsandcrafts.com/sitemap.xml | grep -c "<loc>"
```

## 18. Remaining issues and recommendations

- **CMS clean-up (admin, no code needed):**
  - The Shop hero subtitle reads "Curated Artisian" (typo).
  - Footer CMS links still include Gallery and Bespoke. They are filtered out but worth deleting.
  - `storefront.seoTitle` ("Siri Arts and Crafts") no longer overrides the homepage title. Use CMS `seo.homeTitle` if an override is wanted.
- **OG image:** replace `og-image.webp` (630×630 WebP) with a 1200×630 JPG/PNG for reliable previews on LinkedIn and WhatsApp.
- **Location landing pages:** 10 city pages (incl. Chennai and Bangalore) are kept as they are. If the business doesn't actually serve those cities, Google may treat them as doorway pages. Review or consolidate them.
- **Product URLs use database IDs** rather than slugs. They were left unchanged, because changing them needs a redirect map. Optional future work.
- `api/social-proxy.js` is an unused leftover (never wired up in `vercel.json`) and can be deleted.
- `nginx.conf` (Docker deployment) only got the app-shell fallback, not the per-page prerender mapping. Vercel is the production host.
- Contact and About H1s come from CMS copy ("Let's Connect.", "The Siri Arts Story"). That's acceptable; titles and labels already say Contact Us and Our Story.
