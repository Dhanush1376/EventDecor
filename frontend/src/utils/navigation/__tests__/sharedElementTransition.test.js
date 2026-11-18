import { describe, expect, it, vi } from 'vitest';
import {
  chooseKeyForPop,
  computeSharedDuration,
  getSharedPreviewSrc,
  keyEntityId,
  pathnameMatchesKey,
  productTransitionKey,
  runSharedElementTransition,
  sharedElementKey,
  sharedElementProps,
} from '../sharedElementTransition';

describe('shared element keys', () => {
  it('builds stable, CSS-safe keys from ids', () => {
    expect(productTransitionKey('665f1c2ab3')).toBe('product-665f1c2ab3');
    expect(sharedElementKey('product', 'brass diya/large')).toBe('product-brassdiyalarge');
    expect(productTransitionKey(42)).toBe('product-42');
  });

  it('returns no key (and no props) without an id', () => {
    expect(productTransitionKey(undefined)).toBeUndefined();
    expect(productTransitionKey('')).toBeUndefined();
    expect(productTransitionKey('///')).toBeUndefined();
    expect(sharedElementProps(undefined)).toEqual({});
    expect(sharedElementProps('product-1')).toEqual({ 'data-vt': 'product-1' });
  });

  it('extracts the entity id', () => {
    expect(keyEntityId('product-abc-def')).toBe('abc-def');
    expect(keyEntityId('nodash')).toBe('');
    expect(keyEntityId(undefined)).toBe('');
  });
});

describe('pathnameMatchesKey', () => {
  it('matches only a full path segment', () => {
    expect(pathnameMatchesKey('/product/abc', 'product-abc')).toBe(true);
    expect(pathnameMatchesKey('/product/abc/reviews', 'product-abc')).toBe(true);
    expect(pathnameMatchesKey('/product/abcd', 'product-abc')).toBe(false);
    expect(pathnameMatchesKey('/cart', 'product-abc')).toBe(false);
    expect(pathnameMatchesKey('', 'product-abc')).toBe(false);
  });
});

describe('computeSharedDuration', () => {
  const card = { left: 20, top: 600, width: 160, height: 200 };
  const hero = { left: 0, top: 68, width: 390, height: 390 };

  it('stays within the 340–560ms window', () => {
    const near = computeSharedDuration(card, { ...card, left: 30 });
    const far = computeSharedDuration(
      { left: 0, top: 4000, width: 10, height: 10 },
      { left: 0, top: 0, width: 2000, height: 2000 },
    );
    expect(near).toBeGreaterThanOrEqual(340);
    expect(far).toBeLessThanOrEqual(560);
  });

  it('takes longer for longer journeys and is a little quicker going back', () => {
    const short = computeSharedDuration(card, { ...card, top: 500 });
    const long = computeSharedDuration(card, hero);
    expect(long).toBeGreaterThan(short);
    expect(computeSharedDuration(card, hero, 'back')).toBeLessThan(long);
  });

  it('falls back to a default without geometry', () => {
    expect(computeSharedDuration(null, hero)).toBe(380);
    expect(computeSharedDuration(null, null, 'back')).toBe(340);
  });
});

describe('chooseKeyForPop', () => {
  const element = { id: 'el' };

  it('prefers the destination entry (Forward into a product page)', () => {
    const find = vi.fn((key) => (key === 'product-b' ? element : null));
    expect(chooseKeyForPop({ vt: { key: 'product-b' } }, { vt: { key: 'product-a' } }, find)).toEqual(
      { key: 'product-b', element },
    );
  });

  it('falls back to the entry being left (Back out of a product page)', () => {
    const find = (key) => (key === 'product-a' ? element : null);
    expect(chooseKeyForPop(null, { vt: { key: 'product-a' } }, find)).toEqual({
      key: 'product-a',
      element,
    });
  });

  it('returns null when nothing matching is on screen', () => {
    expect(chooseKeyForPop({ vt: { key: 'x-1' } }, { vt: { key: 'x-2' } }, () => null)).toBeNull();
    expect(chooseKeyForPop(undefined, undefined, () => element)).toBeNull();
  });
});

describe('getSharedPreviewSrc', () => {
  it('returns the preview only for the matching key', () => {
    const state = { vt: { key: 'product-a', src: 'https://res.cloudinary.com/x/a.jpg' } };
    expect(getSharedPreviewSrc(state, 'product-a')).toBe('https://res.cloudinary.com/x/a.jpg');
    expect(getSharedPreviewSrc(state, 'product-b')).toBeNull();
    expect(getSharedPreviewSrc({ vt: { key: 'product-a', src: null } }, 'product-a')).toBeNull();
    expect(getSharedPreviewSrc(null, 'product-a')).toBeNull();
  });
});

describe('runSharedElementTransition without the View Transitions API', () => {
  it('still performs the update synchronously and reports no transition', () => {
    const update = vi.fn();
    const started = runSharedElementTransition({
      key: 'product-a',
      fromElement: { isConnected: true },
      update,
    });
    expect(started).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('runs the update when the source element is missing', () => {
    const update = vi.fn();
    expect(runSharedElementTransition({ key: 'product-a', fromElement: null, update })).toBe(false);
    expect(update).toHaveBeenCalledTimes(1);
  });
});
