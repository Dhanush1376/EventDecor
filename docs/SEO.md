# SEO & Crawlability

## Implemented
- Dynamic `sitemap.xml` from the API (`/sitemap.xml`)
- `frontend/public/robots.txt` with sitemap reference
- Per-route meta via `SEO.jsx` + `react-helmet-async`
- Canonical redirect (www → apex) in `vercel.json`

## SPA limitation (SEO-02)
Product, event, and gallery detail pages are rendered client-side. Crawlers that do not execute JavaScript may not index dynamic content.

**Recommended next steps (choose one):**
1. **Prerender** key routes at build time (e.g. `vite-plugin-prerender` for `/`, `/collections`, top categories).
2. **SSR/SSG** for landing and collection pages (Next.js migration or Vite SSR).
3. **Prerender.io / Rendertron** middleware for bot user-agents on Vercel edge.

Until then, ensure `SEO.jsx` is used on every public route and structured data (JSON-LD) is added for products/events where applicable.

## Accessibility (SEO-03)
Run Lighthouse in Chrome DevTools on:
- Home, Checkout, Dashboard (customer)
- Admin booking wizard and order management

Target: WCAG 2.1 AA. Focus areas: focus rings, `aria-label` on icon buttons, form error announcements, keyboard traps in modals.
