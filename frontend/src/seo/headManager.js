/**
 * Minimal document-head manager for storefront SEO.
 *
 * Why not react-helmet-async: v3 on React 19 delegates to React's native <title>/<meta>
 * hoisting, which renders every <Helmet> instance's tags side by side — the layout's defaults
 * plus each page's values — and never removes tags already present in the HTML. Pages ended up
 * with several descriptions, robots directives and canonicals (one of them always the
 * homepage). This manager keeps exactly one set of SEO tags in <head>.
 *
 * Every <SEO /> instance registers its resolved head. The active one is the highest priority
 * (page-level beats the layout default); among equals, the earliest registered wins, which is
 * the deepest component because React runs child effects before parent effects.
 */

const MANAGED_ATTR = 'data-seo';
// Tags written by the build-time prerenderer (scripts/prerender-seo.mjs) or the crawler
// metadata function carry data-rh="true"; they are replaced on the first client update.
const PRERENDERED_SELECTOR = 'meta[data-rh], link[data-rh], script[data-rh]';

const registry = new Map();
let sequence = 0;
let lastAppliedKey = null;

function pickActive() {
  let best = null;
  for (const entry of registry.values()) {
    if (
      !best ||
      entry.priority > best.priority ||
      (entry.priority === best.priority && entry.order < best.order)
    ) {
      best = entry;
    }
  }
  return best;
}

function createTag(tagName, attrs, text) {
  const el = document.createElement(tagName);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null && value !== '') el.setAttribute(key, value);
  }
  if (text !== undefined) el.textContent = text;
  el.setAttribute(MANAGED_ATTR, '');
  return el;
}

function applyHead(head) {
  if (typeof document === 'undefined' || !head) return;
  const key = JSON.stringify(head);
  if (key === lastAppliedKey) return;
  lastAppliedKey = key;

  document.title = head.title;

  const headEl = document.head;
  headEl
    .querySelectorAll(`[${MANAGED_ATTR}], ${PRERENDERED_SELECTOR}`)
    .forEach((el) => el.remove());

  const fragment = document.createDocumentFragment();
  for (const meta of head.meta) fragment.appendChild(createTag('meta', meta));
  for (const link of head.links) fragment.appendChild(createTag('link', link));
  for (const schema of head.schemas) {
    fragment.appendChild(
      createTag('script', { type: 'application/ld+json' }, JSON.stringify(schema)),
    );
  }
  headEl.appendChild(fragment);
}

function flush() {
  const active = pickActive();
  if (active) applyHead(active.head);
}

export function registerHead(id, head, priority) {
  const existing = registry.get(id);
  registry.set(id, { head, priority, order: existing ? existing.order : sequence++ });
  flush();
}

export function unregisterHead(id) {
  registry.delete(id);
  // Leave the current tags in place until the next page registers; clearing them here would
  // briefly leave the document without a title/description during route transitions.
  if (registry.size) flush();
}
