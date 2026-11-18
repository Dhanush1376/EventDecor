import mongoose from 'mongoose';
import logger from '../config/logger';

/**
 * Canonical production origin. Sitemap URLs must always use it (never a preview or API host),
 * and must match the canonical tags emitted by the frontend (frontend/src/seo/seoConfig.js).
 */
const SITE_URL = (process.env.SITEMAP_SITE_URL || 'https://siriartsandcrafts.com').replace(
  /\/+$/,
  '',
);

/**
 * Only canonical, public, indexable URLs belong here. Deliberately excluded:
 *  - private/transactional routes (cart, checkout, wishlist, dashboard, track, admin…) — noindex
 *  - redirecting legacy URLs (/gallery, /custom-orders, /showcases, /shipping, /terms…)
 *  - search/filter variants of the Shop page
 */
const STATIC_PATHS = ['/', '/collections', '/events', '/about', '/contact', '/blog'];

/** Location landing slugs that have a route in frontend/src/routes/AppRoutes.jsx. */
const ROUTED_LOCATION_SLUGS = new Set([
  'wedding-decorations-hyderabad',
  'event-decorators-telangana',
  'event-decorators-secunderabad',
  'event-decorators-ongole',
  'wedding-decorations-ongole',
  'handmade-gifts-ongole',
  'event-decorators-vijayawada',
  'event-decorators-guntur',
  'wedding-decorations-bangalore',
  'event-decorators-chennai',
]);

const CACHE_TTL_MS = 10 * 60 * 1000;
let cachedXml: string | null = null;
let cachedAt = 0;
let inflight: Promise<string> | null = null;

interface SitemapImage {
  loc: string;
  title?: string;
}

interface SitemapEntry {
  path: string;
  lastmod?: Date | string | null;
  images?: SitemapImage[];
}

function escapeXml(unsafe: string): string {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      default:
        return '&quot;';
    }
  });
}

function toLastmod(value?: Date | string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

function absolute(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/** Same encoding as categoryPath() in the frontend so sitemap URLs equal canonical URLs. */
function categoryPath(name: string): string {
  return `/collections?category=${encodeURIComponent(name)}`;
}

function maxDate(dates: (Date | string | null | undefined)[]): Date | null {
  const times = dates
    .map((d) => (d ? new Date(d).getTime() : NaN))
    .filter((t) => Number.isFinite(t));
  return times.length ? new Date(Math.max(...times)) : null;
}

function renderXml(entries: SitemapEntry[]): string {
  const seen = new Set<string>();
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
  for (const entry of entries) {
    const loc = absolute(entry.path);
    if (seen.has(loc)) continue;
    seen.add(loc);
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(loc)}</loc>\n`;
    const lastmod = toLastmod(entry.lastmod);
    // lastmod is only emitted when we have a real modification date — never "today".
    if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
    for (const image of entry.images || []) {
      if (!image.loc || !/^https?:\/\//i.test(image.loc)) continue;
      xml += '    <image:image>\n';
      xml += `      <image:loc>${escapeXml(image.loc)}</image:loc>\n`;
      if (image.title) xml += `      <image:title>${escapeXml(image.title)}</image:title>\n`;
      xml += '    </image:image>\n';
    }
    xml += '  </url>\n';
  }
  xml += '</urlset>\n';
  return xml;
}

const notDeleted = { isDeleted: { $ne: true } };

async function buildEntries(): Promise<SitemapEntry[]> {
  // Models are normally registered by the app already; require lazily (avoids circular imports).
  const registered = new Set(mongoose.modelNames());
  const ensure = (name: string, load: () => unknown) => {
    if (!registered.has(name)) load();
  };
  ensure('Product', () => require('../models/Product'));
  ensure('Category', () => require('../models/Category'));
  ensure('ShowcaseCollection', () => require('../models/ShowcaseCollection'));
  ensure('Event', () => require('../models/Event'));
  ensure('Policy', () => require('../models/Policy'));
  ensure('Blog', () => require('../models/Blog'));
  ensure('Location', () => require('../models/Location'));

  const Product = mongoose.model('Product');
  const Category = mongoose.model('Category');
  const Showcase = mongoose.model('ShowcaseCollection');
  const Event = mongoose.model('Event');
  const Policy = mongoose.model('Policy');
  const Blog = mongoose.model('Blog');
  const Location = mongoose.model('Location');

  const [products, showcases, events, policies, blogs, locations] = await Promise.all([
    Product.find({ isActive: true, ...notDeleted })
      .select('_id updatedAt imageSrc title primaryCategory')
      .lean() as Promise<any[]>,
    Showcase.find({ isActive: true, ...notDeleted })
      .select('_id updatedAt image title')
      .lean() as Promise<any[]>,
    Event.find({ isActive: true, ...notDeleted })
      .select('_id updatedAt image title')
      .lean() as Promise<any[]>,
    Policy.find({ status: 'published' }).select('slug updatedAt').lean() as Promise<any[]>,
    Blog.find({ ...notDeleted })
      .select('slug updatedAt publishDate')
      .lean() as Promise<any[]>,
    Location.find({ ...notDeleted })
      .select('slug updatedAt')
      .lean() as Promise<any[]>,
  ]);

  // Category pages = categories that actually contain at least one active product.
  const categoryIds = Array.from(
    new Set(products.map((p) => p.primaryCategory && String(p.primaryCategory)).filter(Boolean)),
  );
  const categories = categoryIds.length
    ? ((await Category.find({ _id: { $in: categoryIds }, isActive: true, ...notDeleted })
        .select('_id name updatedAt')
        .lean()) as any[])
    : [];

  const productDates = products.map((p) => p.updatedAt);
  const showcaseDates = [...showcases, ...events].map((s) => s.updatedAt);

  const entries: SitemapEntry[] = [];

  // Static pages: lastmod only where it reflects real content changes.
  for (const path of STATIC_PATHS) {
    let lastmod: Date | null = null;
    if (path === '/collections') lastmod = maxDate(productDates);
    if (path === '/events') lastmod = maxDate(showcaseDates);
    if (path === '/blog') lastmod = maxDate(blogs.map((b) => b.updatedAt || b.publishDate));
    entries.push({ path, lastmod });
  }

  for (const cat of categories) {
    if (!cat.name) continue;
    const id = String(cat._id);
    const catProducts = products.filter((p) => String(p.primaryCategory) === id);
    entries.push({
      path: categoryPath(cat.name),
      lastmod: maxDate([cat.updatedAt, ...catProducts.map((p) => p.updatedAt)]),
    });
  }

  for (const prod of products) {
    entries.push({
      path: `/product/${prod._id}`,
      lastmod: prod.updatedAt,
      images: prod.imageSrc ? [{ loc: prod.imageSrc, title: prod.title }] : [],
    });
  }

  // /events/:id resolves showcases first, then legacy events (see EventDetail.jsx).
  for (const item of [...showcases, ...events]) {
    entries.push({
      path: `/events/${item._id}`,
      lastmod: item.updatedAt,
      images: item.image ? [{ loc: item.image, title: item.title }] : [],
    });
  }

  for (const policy of policies) {
    if (!policy.slug) continue;
    entries.push({ path: `/policy/${policy.slug}`, lastmod: policy.updatedAt });
  }

  for (const blog of blogs) {
    if (!blog.slug) continue;
    entries.push({ path: `/blog/${blog.slug}`, lastmod: blog.updatedAt || blog.publishDate });
  }

  for (const location of locations) {
    if (!ROUTED_LOCATION_SLUGS.has(location.slug)) continue;
    entries.push({ path: `/${location.slug}`, lastmod: location.updatedAt });
  }

  return entries;
}

/**
 * Builds the XML sitemap from the database. Results are cached in memory for 10 minutes and
 * concurrent requests share one build, so crawlers hitting /sitemap.xml never trigger a full
 * set of collection scans per request.
 */
export async function generateSitemap({
  force = false,
}: { force?: boolean } = {}): Promise<string> {
  if (!force && cachedXml && Date.now() - cachedAt < CACHE_TTL_MS) return cachedXml;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const xml = renderXml(await buildEntries());
      cachedXml = xml;
      cachedAt = Date.now();
      return xml;
    } catch (error: any) {
      logger.error(`[SITEMAP GENERATOR ERROR] ${error.message}`);
      if (cachedXml) return cachedXml; // serve the last good sitemap rather than an error
      throw error;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

let sitemapTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced cache refresh, called after product/category/event/policy changes so the next
 * sitemap request reflects them. (The sitemap is served dynamically via /sitemap.xml; it is no
 * longer written into frontend/public, where it went stale and was committed by accident.)
 */
export function triggerSitemapUpdate(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (sitemapTimeout) clearTimeout(sitemapTimeout);
  sitemapTimeout = setTimeout(async () => {
    try {
      await generateSitemap({ force: true });
    } catch (err: any) {
      logger.error(`[SITEMAP AUTO-UPDATE ERROR] ${err.message}`);
    }
  }, 5000);
}
