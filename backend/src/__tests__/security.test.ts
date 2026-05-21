import { isOriginAllowed } from '../app';

describe('isOriginAllowed (S-06)', () => {
  it('allows configured production origins', () => {
    expect(isOriginAllowed('https://siriartsandcrafts.com')).toBe(true);
    expect(isOriginAllowed('https://siriarts-n-crafts.vercel.app')).toBe(true);
  });

  it('rejects lookalike vercel hostnames without hyphen after siriarts', () => {
    expect(isOriginAllowed('https://siriartsfake.vercel.app')).toBe(false);
  });

  it('rejects arbitrary origins', () => {
    expect(isOriginAllowed('https://evil.example.com')).toBe(false);
  });
});
