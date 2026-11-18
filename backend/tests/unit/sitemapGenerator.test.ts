import { describe, it, expect, vi, beforeAll } from 'vitest';
import mongoose from 'mongoose';

const updated = new Date('2026-07-07T06:23:17.559Z');
const catId = new mongoose.Types.ObjectId();

const fixtures: Record<string, any[]> = {
  Product: [
    {
      _id: 'p1',
      title: 'Floral Jewellery Tray & Stand',
      imageSrc: 'https://res.cloudinary.com/x/p1.jpg',
      updatedAt: updated,
      primaryCategory: catId,
    },
  ],
  Category: [{ _id: catId, name: 'Jewellery Trays', updatedAt: updated }],
  ShowcaseCollection: [{ _id: 's1', title: 'Wedding Showcase', image: '', updatedAt: updated }],
  Event: [],
  Policy: [{ slug: 'return-policy', updatedAt: updated }],
  Blog: [{ slug: 'best-wedding-decoration-ideas', updatedAt: updated }],
  Location: [
    { slug: 'event-decorators-ongole', updatedAt: updated },
    { slug: 'not-a-routed-page', updatedAt: updated },
  ],
};

const fakeModel = (name: string) => ({
  find: () => ({
    select: () => ({ lean: async () => fixtures[name] || [] }),
  }),
});

let xml = '';

beforeAll(async () => {
  vi.spyOn(mongoose, 'modelNames').mockReturnValue(Object.keys(fixtures));
  vi.spyOn(mongoose, 'model').mockImplementation(((name: string) => fakeModel(name)) as any);
  const { generateSitemap } = await import('../../src/utils/sitemapGenerator');
  xml = await generateSitemap({ force: true });
});

describe('sitemapGenerator', () => {
  const locs = () => Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);

  it('lists only canonical public URLs on the production origin', () => {
    expect(locs()).toEqual(
      expect.arrayContaining([
        'https://siriartsandcrafts.com/',
        'https://siriartsandcrafts.com/collections',
        'https://siriartsandcrafts.com/events',
        'https://siriartsandcrafts.com/about',
        'https://siriartsandcrafts.com/contact',
        'https://siriartsandcrafts.com/collections?category=Jewellery%20Trays',
        'https://siriartsandcrafts.com/product/p1',
        'https://siriartsandcrafts.com/events/s1',
        'https://siriartsandcrafts.com/policy/return-policy',
        'https://siriartsandcrafts.com/blog/best-wedding-decoration-ideas',
        'https://siriartsandcrafts.com/event-decorators-ongole',
      ]),
    );
  });

  it('excludes private, redirecting and unrouted URLs', () => {
    const all = locs().join('\n');
    for (const bad of [
      '/cart',
      '/checkout',
      '/wishlist',
      '/dashboard',
      '/gallery',
      '/showcases',
      '/custom-orders',
      'not-a-routed-page',
      'cancellation-policy',
    ]) {
      expect(all).not.toContain(bad);
    }
    expect(new Set(locs()).size).toBe(locs().length);
  });

  it('never invents lastmod dates', () => {
    // Pages without a real modification date (e.g. /about) carry no <lastmod>.
    expect(xml).toMatch(/<loc>https:\/\/siriartsandcrafts\.com\/about<\/loc>\n {2}<\/url>/);
    const today = new Date().toISOString().split('T')[0];
    expect(xml).not.toContain(`<lastmod>${today}</lastmod>`);
    expect(xml).toContain('<lastmod>2026-07-07</lastmod>');
  });

  it('produces well-formed, escaped XML', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<image:title>Floral Jewellery Tray &amp; Stand</image:title>');
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
    expect(xml.trim().endsWith('</urlset>')).toBe(true);
  });
});
