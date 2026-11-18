import { describe, it, expect } from 'vitest';
import { getOptimizedUrl, getSrcSet } from '../media/imageUtils';

const RAW = 'https://res.cloudinary.com/drxgnnzeb/image/upload/v1785059447/products/gngzps4gx.jpg';

describe('getOptimizedUrl', () => {
  it("resizes and auto-formats 'original' quality instead of serving the raw upload", () => {
    const url = getOptimizedUrl(RAW, 800, 1000, 'original');
    expect(url).not.toBe(RAW);
    expect(url).toContain('/upload/w_800,c_limit,');
    expect(url).toContain('q_auto:best');
    expect(url).toContain('f_auto');
    expect(url).not.toContain('e_upscale');
    expect(url.endsWith('/v1785059447/products/gngzps4gx.jpg')).toBe(true);
  });

  it("builds a resized srcset for 'original' quality", () => {
    const entries = getSrcSet(RAW, 800, 'original').split(', ');
    expect(entries.length).toBeGreaterThan(1);
    for (const entry of entries) {
      expect(entry).toMatch(/\/upload\/w_\d+,c_limit,.*q_auto:best.*f_auto/);
    }
  });

  it("keeps the HD upscale transform for explicit 'auto:best'", () => {
    expect(getOptimizedUrl(RAW, 800, null, 'auto:best')).toContain('w_1600,c_scale,q_auto:best');
  });
});
