import { verifyImageSignature } from '../middleware/upload';

describe('Upload Security - verifyImageSignature', () => {
  it('detects valid PNG', () => {
    const png = Buffer.from('89504E470D0A1A0A', 'hex');
    expect(verifyImageSignature(png)).toBe('image/png');
  });

  it('detects valid JPEG', () => {
    const jpeg = Buffer.from('FFD8FFE000104A4649460001', 'hex');
    expect(verifyImageSignature(jpeg)).toBe('image/jpeg');
  });

  it('detects valid WEBP', () => {
    const webp = Buffer.from('524946460000000057454250', 'hex');
    expect(verifyImageSignature(webp)).toBe('image/webp');
  });

  it('detects valid OGG', () => {
    const ogg = Buffer.from('4F6767530002000000000000', 'hex');
    expect(verifyImageSignature(ogg)).toBe('video/ogg');
  });

  it('rejects malicious payload disguised as image', () => {
    // A php script starting with <?php
    const php = Buffer.from('3C3F706870206563686F20', 'hex');
    expect(verifyImageSignature(php)).toBeNull();
  });

  it('rejects empty or very small files', () => {
    const empty = Buffer.alloc(0);
    expect(verifyImageSignature(empty)).toBeNull();
    const small = Buffer.from('FFD8', 'hex');
    expect(verifyImageSignature(small)).toBeNull();
  });
});
