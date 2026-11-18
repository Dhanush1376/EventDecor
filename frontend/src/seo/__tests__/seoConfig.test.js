import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  STATIC_PAGES,
  POLICY_PAGES,
  absoluteUrl,
  canonicalNavLabel,
  categoryPath,
  formatTitle,
  isNoindexPath,
  productSchema,
  renderHeadTags,
  toMetaDescription,
  ROBOTS_NOINDEX,
} from '../seoConfig';

describe('indexing rules', () => {
  it.each([
    '/cart',
    '/checkout',
    '/wishlist',
    '/dashboard',
    '/dashboard/orders/123',
    '/track/ABC123',
    '/order-success',
    '/accept-invite',
    '/admin',
    '/admin/products',
    '/events/book',
    '/events/dashboard',
    '/booking-success/42',
    '/product/abc/reviews',
    '/product/abc/reviews/images',
    '/cart/',
  ])('%s is noindex', (p) => expect(isNoindexPath(p)).toBe(true));

  it.each([
    '/',
    '/collections',
    '/events',
    '/events/6a6e7095d93db4f864cb5e56',
    '/product/6a0c74fa9b8633afb920de7b',
    '/about',
    '/contact',
    '/policy/privacy-policy',
    '/policy/return-policy',
    '/blog',
    '/blog/best-wedding-decoration-ideas',
    '/event-decorators-ongole',
  ])('%s stays indexable', (p) => expect(isNoindexPath(p)).toBe(false));
});

describe('static page metadata', () => {
  const pages = Object.values(STATIC_PAGES);

  it('has unique titles and descriptions', () => {
    expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length);
    expect(new Set(pages.map((p) => p.description)).size).toBe(pages.length);
  });

  it('keeps titles and descriptions within search-result lengths', () => {
    for (const p of pages) {
      expect(p.title.length).toBeLessThanOrEqual(65);
      expect(p.description.length).toBeGreaterThan(70);
      expect(p.description.length).toBeLessThanOrEqual(185);
    }
  });

  it('uses the requested primary titles', () => {
    expect(STATIC_PAGES['/'].title).toBe('Siri Arts & Crafts | Handcrafted Wedding & Event Decor');
    expect(STATIC_PAGES['/collections'].title).toBe(
      'Shop Handcrafted Wedding & Event Decor | Siri Arts & Crafts',
    );
    expect(STATIC_PAGES['/events'].title).toBe('Events & Event Decor | Siri Arts & Crafts');
    expect(STATIC_PAGES['/contact'].title).toBe('Contact Siri Arts & Crafts | Get in Touch');
    expect(STATIC_PAGES['/about'].title).toBe('Our Story | Siri Arts & Crafts');
  });

  it('has a prerender rewrite in vercel.json for every static page', () => {
    const vercel = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../vercel.json'), 'utf8'),
    );
    const rewrites = new Map(vercel.rewrites.map((r) => [r.source, r.destination]));
    for (const [p, page] of Object.entries(STATIC_PAGES)) {
      if (p === '/') continue;
      expect(rewrites.get(p)).toBe(`/_seo/${page.key}.html`);
    }
    for (const policy of POLICY_PAGES) {
      expect(STATIC_PAGES[`/policy/${policy.slug}`]).toBeTruthy();
    }
  });
});

describe('helpers', () => {
  it('normalises navigation labels to the canonical section names', () => {
    expect(canonicalNavLabel('/collections', 'Heritage Collection')).toBe('Shop');
    expect(canonicalNavLabel('/collections', 'Collections')).toBe('Shop');
    expect(canonicalNavLabel('/contact', 'Contact')).toBe('Contact Us');
    expect(canonicalNavLabel('/events/', 'Event Decorations')).toBe('Events');
    expect(canonicalNavLabel('/collections?category=Trays', 'Trays')).toBe('Trays');
    expect(canonicalNavLabel('/blog', 'Journal')).toBe('Journal');
  });

  it('brands titles exactly once', () => {
    expect(formatTitle('Shop')).toBe('Shop | Siri Arts & Crafts');
    expect(formatTitle('Floral Tray | Siri Arts & Crafts')).toBe(
      'Floral Tray | Siri Arts & Crafts',
    );
    expect(formatTitle('Siri Arts and Crafts')).toBe(STATIC_PAGES['/'].title);
  });

  it('builds absolute canonical URLs without trailing slashes', () => {
    expect(absoluteUrl('/')).toBe('https://siriartsandcrafts.com/');
    expect(absoluteUrl('/about/')).toBe('https://siriartsandcrafts.com/about');
    expect(absoluteUrl(categoryPath('Jewellery Trays'))).toBe(
      'https://siriartsandcrafts.com/collections?category=Jewellery%20Trays',
    );
  });

  it('turns HTML into a bounded plain-text description', () => {
    const d = toMetaDescription(`<p>${'Handcrafted tray. '.repeat(20)}</p>`);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d).not.toMatch(/<|>/);
    expect(d.endsWith('…')).toBe(true);
  });
});

describe('structured data honesty', () => {
  const base = {
    _id: 'p1',
    title: 'Floral Jewellery Tray',
    description: 'A tray.',
    imageSrc: 'https://img/p1.jpg',
    price: 1500,
    stock: 49,
  };

  it('omits AggregateRating when there are no genuine reviews', () => {
    expect(productSchema({ ...base, rating: 0, reviews: 0 }).aggregateRating).toBeUndefined();
    expect(productSchema({ ...base, rating: 4.5 }).aggregateRating).toBeUndefined();
    expect(productSchema({ ...base, rating: 4.5, numReviews: 3 }).aggregateRating).toMatchObject({
      ratingValue: 4.5,
      reviewCount: 3,
    });
  });

  it('derives availability from real stock and omits the offer without a price', () => {
    expect(productSchema(base).offers.availability).toBe('https://schema.org/InStock');
    expect(productSchema({ ...base, stock: 0 }).offers.availability).toBe(
      'https://schema.org/OutOfStock',
    );
    expect(productSchema({ ...base, stock: undefined }).offers.availability).toBeUndefined();
    expect(productSchema({ ...base, price: 0 }).offers).toBeUndefined();
  });

  it('escapes head values and omits canonical on noindex pages', () => {
    const html = renderHeadTags({
      title: 'A "quoted" <title>',
      description: 'x & y',
      path: '/cart',
      robots: ROBOTS_NOINDEX,
      schemas: [{ name: '</script><script>alert(1)</script>' }],
    });
    expect(html).toContain('<title>A &quot;quoted&quot; &lt;title&gt;</title>');
    expect(html).toContain('content="x &amp; y"');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('</script><script>');
  });
});
