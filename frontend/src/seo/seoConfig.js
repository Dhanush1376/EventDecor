/**
 * Central, route-aware SEO configuration.
 *
 * This module is intentionally framework-free (no React, no `import.meta.env`) so the same
 * source of truth is used by:
 *   - the <SEO /> component at runtime (src/components/seo/SEO.jsx)
 *   - the build-time head prerenderer (scripts/prerender-seo.mjs)
 *   - the Vercel crawler-metadata and sitemap functions (api/*.js)
 *
 * Google decides sitelinks on its own. What we control is the signal: one canonical URL per
 * page, a unique title/description, consistent navigation labels, and noindex on private pages.
 */

/** Production origin. Canonical URLs must always point here, never at preview deployments. */
export const SITE_URL = 'https://siriartsandcrafts.com';
export const SITE_NAME = 'Siri Arts & Crafts';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.webp`;
export const LOGO_URL = `${SITE_URL}/MainLogo.png`;
export const TITLE_SEPARATOR = ' | ';

export const ROBOTS_INDEX =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
export const ROBOTS_NOINDEX = 'noindex, follow';

/**
 * Canonical labels for the primary sections. Every navigation surface (desktop header,
 * mobile menu, bottom nav, footer, breadcrumbs) maps these hrefs to these labels so search
 * engines see one consistent name per section.
 */
export const PRIMARY_NAV = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/collections' },
  { label: 'Events', href: '/events' },
  { label: 'Our Story', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
];

const CANONICAL_NAV_LABELS = {
  '/': 'Home',
  '/collections': 'Shop',
  '/shop': 'Shop',
  '/events': 'Events',
  '/showcases': 'Events',
  '/about': 'Our Story',
  '/contact': 'Contact Us',
};

/** Returns the canonical label for a known primary-section href, otherwise the given label. */
export function canonicalNavLabel(href, fallbackLabel) {
  if (!href || typeof href !== 'string') return fallbackLabel;
  const path = href.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  // Only plain section links are renamed; filtered links (e.g. ?category=) keep their label.
  if (href.includes('?')) return fallbackLabel;
  return CANONICAL_NAV_LABELS[path] || fallbackLabel;
}

/** Public policy pages that exist in the CMS. Titles mirror the visible H1 of each page. */
export const POLICY_PAGES = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    description:
      'How Siri Arts & Crafts collects, uses and protects your personal data, our use of cookies, and your rights over the information you share with us.',
  },
  {
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions',
    description:
      'The terms that apply when you shop with Siri Arts & Crafts, covering orders, payments, shipping, returns, cancellations and use of this website.',
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    description:
      'Delivery timelines, shipping charges, express delivery and cash-on-delivery details for orders from Siri Arts & Crafts.',
  },
  {
    slug: 'return-policy',
    title: 'Return Policy',
    description:
      'Which Siri Arts & Crafts products can be returned, the return window, how to start a return and when your refund is processed.',
  },
  {
    slug: 'exchange-policy',
    title: 'Exchange Policy',
    description:
      'When a Siri Arts & Crafts order is eligible for exchange, how to request one and the exchange window for damaged, defective or incorrect items.',
  },
  {
    slug: 'refund-policy',
    title: 'Refund Policy',
    description:
      'How refunds are processed at Siri Arts & Crafts, including timelines, partial refunds and refunds for cash-on-delivery and wallet payments.',
  },
];

export const POLICY_BY_SLUG = Object.fromEntries(POLICY_PAGES.map((p) => [p.slug, p]));

/**
 * Static, indexable pages. `title` is the full document title (already branded) so it can be
 * written verbatim into prerendered HTML.
 */
export const STATIC_PAGES = {
  '/': {
    key: 'home',
    title: 'Siri Arts & Crafts | Handcrafted Wedding & Event Decor',
    description:
      'Handcrafted wedding trays, pooja and festival decor, return gifts and event decoration from Siri Arts & Crafts in Ongole, Andhra Pradesh. Shop online or plan your event with us.',
    breadcrumbs: null,
    pageType: 'WebPage',
  },
  '/collections': {
    key: 'shop',
    title: 'Shop Handcrafted Wedding & Event Decor | Siri Arts & Crafts',
    description:
      'Shop handcrafted wedding trays, jewellery trays, pooja essentials, decor pieces and return gifts from Siri Arts & Crafts. Browse by category and order online.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Shop', url: '/collections' },
    ],
    pageType: 'CollectionPage',
  },
  '/events': {
    key: 'events',
    title: 'Events & Event Decor | Siri Arts & Crafts',
    description:
      'Explore event decor by Siri Arts & Crafts: wedding, engagement, pooja and celebration setups. View our showcases and book decoration for your occasion.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Events', url: '/events' },
    ],
    pageType: 'CollectionPage',
  },
  '/about': {
    key: 'about',
    title: 'Our Story | Siri Arts & Crafts',
    description:
      'Meet Siri Arts & Crafts, a handcrafted decor studio from Ongole, Andhra Pradesh, creating traditional wedding, pooja and celebration decor for modern occasions.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Our Story', url: '/about' },
    ],
    pageType: 'AboutPage',
  },
  '/contact': {
    key: 'contact',
    title: 'Contact Siri Arts & Crafts | Get in Touch',
    description:
      'Contact Siri Arts & Crafts by phone, WhatsApp or email for product questions, orders and event decoration enquiries. Based in Ongole, Andhra Pradesh.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Contact Us', url: '/contact' },
    ],
    pageType: 'ContactPage',
  },
  '/blog': {
    key: 'blog',
    title: 'Event Decoration Ideas & Inspiration | Siri Arts & Crafts',
    description:
      'Ideas and inspiration for wedding, pooja and celebration decor from the Siri Arts & Crafts studio.',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
    ],
    pageType: 'CollectionPage',
  },
  ...Object.fromEntries(
    POLICY_PAGES.map((p) => [
      `/policy/${p.slug}`,
      {
        key: `policy-${p.slug}`,
        title: `${p.title} | Siri Arts & Crafts`,
        description: p.description,
        breadcrumbs: [
          { name: 'Home', url: '/' },
          { name: p.title, url: `/policy/${p.slug}` },
        ],
        pageType: 'WebPage',
      },
    ]),
  ),
};

/**
 * Private, transactional and internal routes. These stay crawlable (so crawlers can see the
 * noindex directive) but must never be indexed. Access control is enforced separately by
 * ProtectedRoute and the API — this list is only about search indexing.
 */
const NOINDEX_EXACT = new Set([
  '/cart',
  '/checkout',
  '/wishlist',
  '/order-success',
  '/accept-invite',
  '/coupons',
  '/invoice-preview',
  '/events/book',
  '/events/dashboard',
]);

const NOINDEX_PREFIXES = [
  '/admin',
  '/dashboard',
  '/track',
  '/booking-success',
  '/returns',
  '/login',
  '/register',
  '/signup',
  '/reset-password',
  '/forgot-password',
  '/verify',
];

/** Paths whose own content is thin/duplicative of the canonical product page. */
const NOINDEX_PATTERNS = [/^\/product\/[^/]+\/reviews(\/images)?$/];

export function normalizePath(pathname = '/') {
  const p = String(pathname || '/')
    .split('?')[0]
    .split('#')[0];
  if (p === '/' || p === '') return '/';
  return p.replace(/\/+$/, '') || '/';
}

export function isNoindexPath(pathname) {
  const p = normalizePath(pathname).toLowerCase();
  if (NOINDEX_EXACT.has(p)) return true;
  if (NOINDEX_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))) return true;
  return NOINDEX_PATTERNS.some((re) => re.test(p));
}

/** Absolute canonical URL for a path (query strings are dropped unless passed in explicitly). */
export function absoluteUrl(pathOrUrl = '/') {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const [rawPath, query] = String(pathOrUrl).split('?');
  const path = normalizePath(rawPath);
  const base = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
  return query ? `${base}?${query}` : base;
}

/** Shop category pages are /collections?category=<name>. One encoding, everywhere. */
export function categoryPath(categoryName) {
  return `/collections?category=${encodeURIComponent(categoryName)}`;
}

/** Appends the brand to a page title exactly once. */
export function formatTitle(title) {
  const clean = String(title || '')
    .replace(/\s*[|—–-]\s*Siri Arts (&|and) Crafts\s*$/i, '')
    .trim();
  if (!clean || /^siri arts (&|and) crafts$/i.test(clean)) return STATIC_PAGES['/'].title;
  return `${clean}${TITLE_SEPARATOR}${SITE_NAME}`;
}

/** Plain-text, whitespace-collapsed description of at most `max` characters. */
export function toMetaDescription(text, max = 160) {
  if (!text) return '';
  const plain = String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}

export function breadcrumbSchema(items) {
  if (!items || items.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: absoluteUrl(item.url) } : {}),
    })),
  };
}

/**
 * Organization schema built only from facts the business publishes on the site
 * (store settings → contact). Unknown fields are omitted rather than guessed.
 */
export function organizationSchema({ name = SITE_NAME, phone, email, address, sameAs = [] } = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name,
    url: `${SITE_URL}/`,
    logo: LOGO_URL,
    ...(email ? { email } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(address ? { address } : {}),
    ...(phone || email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            ...(phone ? { telephone: phone } : {}),
            ...(email ? { email } : {}),
            areaServed: 'IN',
          },
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteSchema(name = SITE_NAME) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name,
    alternateName: 'Siri Arts and Crafts',
    url: `${SITE_URL}/`,
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export function webPageSchema({ type = 'WebPage', path, title, description }) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name: title,
    ...(description ? { description } : {}),
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };
}

/**
 * Product schema from real product data only. Offer is emitted only with a real price;
 * AggregateRating only when there is at least one genuine review.
 */
export function productSchema(product, { path } = {}) {
  if (!product?.title) return null;
  const images = Array.from(
    new Set(
      [product.imageSrc, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean),
    ),
  );
  const price = Number(product.price);
  const stock = Number(product.stock);
  const hasStockInfo = Number.isFinite(stock);
  const rating = Number(product.rating);
  const reviewCount = Number(product.numReviews ?? product.reviewCount ?? product.reviews);
  const url = absoluteUrl(path || `/product/${product._id || product.id}`);
  const category = product.primaryCategory?.name || product.category?.name;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    ...(images.length ? { image: images } : {}),
    ...(product.description ? { description: toMetaDescription(product.description, 5000) } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(category && typeof category === 'string' ? { category } : {}),
    ...(product.material ? { material: product.material } : {}),
    brand: { '@type': 'Brand', name: SITE_NAME },
    url,
    ...(Number.isFinite(price) && price > 0
      ? {
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: 'INR',
            price: price.toFixed(2),
            itemCondition: 'https://schema.org/NewCondition',
            ...(hasStockInfo
              ? {
                  availability:
                    stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                }
              : {}),
            seller: { '@id': `${SITE_URL}/#organization` },
          },
        }
      : {}),
    ...(Number.isFinite(rating) && rating > 0 && Number.isFinite(reviewCount) && reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(rating.toFixed(1)),
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

/** Escapes a string for use inside an HTML attribute or text node. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** JSON-LD safe for embedding in a <script> tag. */
export function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

/**
 * Renders the SEO <head> block as an HTML string. Used for prerendered static pages and the
 * crawler metadata function so the server HTML matches what <SEO /> renders client-side.
 * Every tag carries data-rh="true" so react-helmet-async takes ownership on hydration instead
 * of leaving duplicates behind.
 */
export function renderHeadTags({
  title,
  description,
  path,
  canonical,
  robots = ROBOTS_INDEX,
  ogType = 'website',
  image = DEFAULT_OG_IMAGE,
  schemas = [],
}) {
  const canonicalUrl = canonical || (path ? absoluteUrl(path) : null);
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(image);
  const noindex = robots.startsWith('noindex');
  const lines = [
    `<title>${t}</title>`,
    `<meta data-rh="true" name="description" content="${d}" />`,
    `<meta data-rh="true" name="robots" content="${escapeHtml(robots)}" />`,
  ];
  if (canonicalUrl && !noindex) {
    lines.push(`<link data-rh="true" rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
  }
  lines.push(
    `<meta data-rh="true" property="og:type" content="${escapeHtml(ogType)}" />`,
    `<meta data-rh="true" property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta data-rh="true" property="og:locale" content="en_IN" />`,
    `<meta data-rh="true" property="og:title" content="${t}" />`,
    `<meta data-rh="true" property="og:description" content="${d}" />`,
  );
  if (canonicalUrl)
    lines.push(`<meta data-rh="true" property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
  if (image) lines.push(`<meta data-rh="true" property="og:image" content="${img}" />`);
  lines.push(
    `<meta data-rh="true" name="twitter:card" content="summary_large_image" />`,
    `<meta data-rh="true" name="twitter:title" content="${t}" />`,
    `<meta data-rh="true" name="twitter:description" content="${d}" />`,
  );
  if (image) lines.push(`<meta data-rh="true" name="twitter:image" content="${img}" />`);
  for (const schema of schemas.filter(Boolean)) {
    lines.push(`<script data-rh="true" type="application/ld+json">${jsonLd(schema)}</script>`);
  }
  return lines.join('\n    ');
}

/** Head metadata (title, description, canonical, schemas) for a static page path. */
export function staticPageHead(path, { organization } = {}) {
  const page = STATIC_PAGES[path];
  if (!page) return null;
  const schemas = [
    webPageSchema({ type: page.pageType, path, title: page.title, description: page.description }),
    breadcrumbSchema(page.breadcrumbs),
  ];
  if (path === '/') {
    schemas.unshift(organizationSchema(organization), websiteSchema());
  }
  return {
    title: page.title,
    description: page.description,
    path,
    robots: ROBOTS_INDEX,
    schemas,
  };
}
