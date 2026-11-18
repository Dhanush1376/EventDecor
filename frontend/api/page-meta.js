/* global process */
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_OG_IMAGE,
  ROBOTS_INDEX,
  ROBOTS_NOINDEX,
  breadcrumbSchema,
  categoryPath,
  formatTitle,
  productSchema,
  renderHeadTags,
  toMetaDescription,
} from '../src/seo/seoConfig.js';

/**
 * Server-rendered <head> for product and event detail pages, served only to crawlers
 * (search engines and link-preview bots) via a user-agent-conditioned rewrite in vercel.json.
 *
 * The body is the exact same SPA shell every visitor gets; only the metadata that <SEO />
 * would add after JavaScript runs is filled in up front, so non-rendering crawlers (WhatsApp,
 * Facebook, LinkedIn, Bing's first pass) see the right title, description, image and
 * canonical. Unknown or removed items get a real 404 + noindex instead of a soft 404.
 */
const API_BASE = (
  process.env.PAGE_META_API_URL ||
  process.env.VITE_BACKEND_URL ||
  'https://eventdecor-fg3l.onrender.com'
).replace(/\/+$/, '');

const SEO_BLOCK = /<!-- SEO:START[\s\S]*?<!-- SEO:END -->/;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

let shellCache = null;

async function loadShell(req) {
  if (shellCache) return shellCache;
  for (const candidate of [
    path.join(process.cwd(), 'dist', 'app-shell.html'),
    path.join(process.cwd(), 'app-shell.html'),
  ]) {
    try {
      shellCache = fs.readFileSync(candidate, 'utf8');
      return shellCache;
    } catch {
      /* try next */
    }
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const response = await fetch(`https://${host}/app-shell.html`);
  if (!response.ok) throw new Error(`app-shell.html ${response.status}`);
  shellCache = await response.text();
  return shellCache;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (response.status === 404 || response.status === 400) return { notFound: true };
    if (!response.ok) return { error: true };
    const json = await response.json();
    const data = json?.data?.product || json?.data;
    return data && (data.title || data.name) ? { data } : { notFound: true };
  } catch {
    return { error: true };
  } finally {
    clearTimeout(timer);
  }
}

function productHead(product, id) {
  const pagePath = `/product/${id}`;
  const category =
    typeof product.primaryCategory?.name === 'string' ? product.primaryCategory.name : '';
  return {
    title: formatTitle(product.seoTitle || product.title),
    description:
      toMetaDescription(product.seoDescription || product.description) ||
      `${product.title} by Siri Arts & Crafts, available to order online.`,
    path: pagePath,
    ogType: 'product',
    image: product.imageSrc || product.images?.[0] || DEFAULT_OG_IMAGE,
    robots: ROBOTS_INDEX,
    schemas: [
      productSchema(product, { path: pagePath }),
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Shop', url: '/collections' },
        ...(category ? [{ name: category, url: categoryPath(category) }] : []),
        { name: product.title, url: pagePath },
      ]),
    ],
  };
}

function eventHead(item, id) {
  const pagePath = `/events/${id}`;
  const title = item.title || item.name;
  return {
    title: formatTitle(title),
    description:
      toMetaDescription(item.description) ||
      `${title}: event decoration by Siri Arts & Crafts. View the setup and book it for your occasion.`,
    path: pagePath,
    image: item.image || DEFAULT_OG_IMAGE,
    robots: ROBOTS_INDEX,
    schemas: [
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Events', url: '/events' },
        { name: title, url: pagePath },
      ]),
    ],
  };
}

export default async function handler(req, res) {
  const type = req.query.type === 'event' ? 'event' : 'product';
  const id = String(req.query.id || '');

  let shell;
  try {
    shell = await loadShell(req);
  } catch (error) {
    console.error('page-meta: could not load app shell', error?.message || error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).send('Internal Server Error');
  }

  const send = (status, head, cache) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', cache);
    return res.status(status).send(head ? shell.replace(SEO_BLOCK, renderHeadTags(head)) : shell);
  };

  if (!ID_PATTERN.test(id)) {
    return send(
      404,
      { title: formatTitle('Page Not Found'), description: '', robots: ROBOTS_NOINDEX },
      'no-store',
    );
  }

  let result;
  if (type === 'product') {
    result = await fetchJson(`${API_BASE}/api/v1/products/${encodeURIComponent(id)}`);
  } else {
    result = await fetchJson(`${API_BASE}/api/v1/showcases/${encodeURIComponent(id)}`);
    if (result.notFound)
      result = await fetchJson(`${API_BASE}/api/v1/events/${encodeURIComponent(id)}`);
  }

  if (result.data) {
    const head = type === 'product' ? productHead(result.data, id) : eventHead(result.data, id);
    return send(200, head, 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600');
  }
  if (result.notFound) {
    return send(
      404,
      {
        title: formatTitle(type === 'product' ? 'Product Not Found' : 'Event Not Found'),
        description: 'This page is no longer available.',
        robots: ROBOTS_NOINDEX,
      },
      'public, max-age=0, s-maxage=300',
    );
  }
  // Backend unavailable: plain shell (the client renders metadata), never cached.
  return send(200, null, 'no-store');
}
