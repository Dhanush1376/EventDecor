import { describe, it, expect } from 'vitest';
import { verifyImageSignature } from '../fileSignature';

/** Build a buffer starting with the given bytes, padded to a plausible size. */
const withMagic = (bytes: number[], padTo = 32): Buffer => {
  const buf = Buffer.alloc(padTo);
  Buffer.from(bytes).copy(buf);
  return buf;
};

/** Build an ISO-BMFF (ftyp) header with the given brand. */
const ftyp = (brand: string): Buffer => {
  const buf = Buffer.alloc(32);
  buf.writeUInt32BE(24, 0); // box size
  buf.write('ftyp', 4, 'ascii');
  buf.write(brand, 8, 'ascii');
  return buf;
};

describe('verifyImageSignature', () => {
  it('detects PNG', () => {
    expect(verifyImageSignature(withMagic([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png');
  });

  it('detects JPEG', () => {
    expect(verifyImageSignature(withMagic([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });

  it('detects GIF', () => {
    expect(verifyImageSignature(withMagic([0x47, 0x49, 0x46, 0x38]))).toBe('image/gif');
  });

  it('detects WebP (RIFF container)', () => {
    const buf = Buffer.alloc(32);
    buf.write('RIFF', 0, 'ascii');
    buf.write('WEBP', 8, 'ascii');
    expect(verifyImageSignature(buf)).toBe('image/webp');
  });

  it('detects WebM (EBML container)', () => {
    expect(verifyImageSignature(withMagic([0x1a, 0x45, 0xdf, 0xa3]))).toBe('video/webm');
  });

  it('detects MP4 across common brands', () => {
    expect(verifyImageSignature(ftyp('isom'))).toBe('video/mp4');
    expect(verifyImageSignature(ftyp('mp42'))).toBe('video/mp4');
    expect(verifyImageSignature(ftyp('avc1'))).toBe('video/mp4');
  });

  it('detects QuickTime', () => {
    expect(verifyImageSignature(ftyp('qt  '))).toBe('video/quicktime');
  });

  it('detects HEIC/HEIF brands', () => {
    expect(verifyImageSignature(ftyp('heic'))).toBe('image/heic');
    expect(verifyImageSignature(ftyp('mif1'))).toBe('image/heic');
  });

  it('detects AVIF', () => {
    expect(verifyImageSignature(ftyp('avif'))).toBe('image/avif');
  });

  it('rejects executables and scripts regardless of declared MIME', () => {
    // Windows PE header
    expect(verifyImageSignature(withMagic([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
    // ELF header
    expect(verifyImageSignature(withMagic([0x7f, 0x45, 0x4c, 0x46]))).toBeNull();
    // Shell script
    expect(verifyImageSignature(Buffer.from('#!/bin/sh\nrm -rf /\n'))).toBeNull();
    // HTML (stored-XSS vector if ever served inline)
    expect(verifyImageSignature(Buffer.from('<html><script>alert(1)</script>'))).toBeNull();
  });

  it('rejects PDFs (not in the allowlist)', () => {
    expect(verifyImageSignature(Buffer.from('%PDF-1.7\n'))).toBeNull();
  });

  it('rejects buffers that are too small to identify', () => {
    expect(verifyImageSignature(Buffer.alloc(0))).toBeNull();
    expect(verifyImageSignature(Buffer.from([0x89, 0x50]))).toBeNull();
  });
});
