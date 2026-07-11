/**
 * Detect the true media type of an uploaded buffer from its magic bytes.
 *
 * This is the authoritative upload validation: the client-declared MIME type
 * is attacker-controlled and only used as a cheap early filter. Returns the
 * detected MIME type, or null when the buffer matches no allowed format.
 * Kept free of app-level imports so it can be unit-tested in isolation.
 */
export const verifyImageSignature = (buffer: Buffer): string | null => {
  if (buffer.length < 4) return null;
  const hex = buffer.toString('hex', 0, 4).toUpperCase();

  if (hex === '89504E47') return 'image/png';
  if (hex === '4F676753') return 'video/ogg';
  if (hex.startsWith('FFD8FF')) return 'image/jpeg';
  if (hex === '47494638') return 'image/gif';
  if (hex.startsWith('424D')) return 'image/bmp';
  if (hex === '49492A00' || hex === '4D4D002A') return 'image/tiff';
  if (hex === '00000100') return 'image/x-icon';
  if (hex === '1A45DFA3') return 'video/webm'; // EBML container (WebM/Matroska)
  if (hex === '52494646') {
    const webpHex = buffer.toString('hex', 8, 12).toUpperCase();
    if (webpHex === '57454250') return 'image/webp';
  }

  const ftyp = buffer.toString('hex', 4, 8).toUpperCase();
  if (ftyp === '66747970' && buffer.length >= 12) {
    const brand = buffer.toString('ascii', 8, 12).toLowerCase();
    if (brand.startsWith('mp4') || brand === 'isom' || brand === 'avc1' || brand === 'iso2')
      return 'video/mp4';
    if (brand.startsWith('qt')) return 'video/quicktime';
    if (brand === 'avif') return 'image/avif';
    if (brand === 'heic' || brand === 'heix' || brand === 'mif1' || brand === 'msf1')
      return 'image/heic';
  }

  return null;
};
