import zlib from 'zlib';
import path from 'path';

export type CompressionStrategy = 'none' | 'fast' | 'balanced' | 'maximum';

export class CompressionService {
  /**
   * Analyzes file type/content to determine optimal compression strategy
   */
  public static selectStrategy(filename: string | null, contentType?: string): CompressionStrategy {
    if (!filename) return 'balanced';

    const ext = path.extname(filename).toLowerCase();

    // Highly compressible structured data
    if (
      ['.json', '.csv', '.txt', '.xml', '.bson', '.sql'].includes(ext) ||
      contentType === 'application/json'
    ) {
      return 'maximum'; // GZIP level 9
    }

    // Already compressed media - skip compression to save CPU
    if (
      ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mp3', '.zip', '.gz', '.tgz'].includes(
        ext,
      )
    ) {
      return 'none';
    }

    // Slightly compressible formats
    if (['.pdf', '.docx', '.xlsx'].includes(ext)) {
      return 'fast'; // GZIP level 3
    }

    // Safe default
    return 'balanced'; // GZIP level 6
  }

  /**
   * Returns a GZIP stream configured based on the strategy
   */
  public static createCompressStream(strategy: CompressionStrategy): zlib.Gzip | null {
    if (strategy === 'none') {
      return null; // Signals the caller to bypass compression in the pipeline
    }

    let level = zlib.constants.Z_DEFAULT_COMPRESSION;

    switch (strategy) {
      case 'maximum':
        level = zlib.constants.Z_BEST_COMPRESSION; // 9
        break;
      case 'fast':
        level = 3;
        break;
      case 'balanced':
        level = 6;
        break;
    }

    return zlib.createGzip({ level });
  }

  /**
   * Returns a Gunzip stream for decompression
   */
  public static createDecompressStream(): zlib.Gunzip {
    return zlib.createGunzip();
  }

  /**
   * Calculates compression ratio
   * @returns Percentage (0-100) of space saved. E.g. 100MB to 20MB is 80%.
   */
  public static calculateRatio(rawBytes: number, compressedBytes: number): number {
    if (rawBytes === 0) return 0;
    const ratio = (1 - compressedBytes / rawBytes) * 100;
    return Math.max(0, Math.min(100, Math.round(ratio * 100) / 100)); // Round to 2 decimal places
  }
}
