import sharp from 'sharp';

export class FeatureExtractor {
  static STOP_WORDS = new Set([
    'decoration',
    'decor',
    'decorative',
    'item',
    'set',
    'piece',
    'beautiful',
    'handmade',
    'indian',
    'traditional',
    'design',
    'new',
    'best',
    'premium',
    'quality',
    'special',
    'unique',
    'elegant',
    'stunning',
    'gorgeous',
    'lovely',
    'perfect',
    'amazing',
    'wonderful',
    'exclusive',
    'royal',
    'grand',
    'fancy',
    'artistic',
    'creative',
    'modern',
    'classic',
    'vintage',
    'antique',
    'ethnic',
    'cultural',
    'festive',
    'auspicious',
    'sacred',
    'divine',
    'the',
    'and',
    'for',
    'with',
    'from',
    'this',
    'that',
    'are',
    'was',
    'have',
    'has',
    'had',
    'been',
    'will',
    'would',
    'could',
    'should',
    'can',
    'may',
    'might',
    'shall',
    'its',
    'our',
    'your',
    'their',
    'also',
    'just',
    'very',
    'more',
    'most',
    'much',
    'many',
    'some',
    'any',
    'each',
    'every',
    'all',
    'both',
    'few',
    'several',
    'own',
    'such',
    'only',
    'other',
    'than',
    'then',
    'when',
    'where',
    'how',
    'what',
    'which',
    'who',
    'whom',
    'why',
    'into',
    'over',
    'after',
    'before',
    'between',
    'under',
    'above',
    'below',
    'along',
    'about',
  ]);

  static HEX_COLOR_MAP: Record<string, string> = {
    '#ffd700': 'gold',
    '#ffc0cb': 'pink',
    '#8b0000': 'red',
    '#ff0000': 'red',
    '#228b22': 'green',
    '#008000': 'green',
    '#ffffff': 'white',
    '#000000': 'black',
    '#808080': 'gray',
    '#0000ff': 'blue',
    '#ffff00': 'yellow',
    '#ffa500': 'orange',
    '#800080': 'purple',
    '#a52a2a': 'brown',
    '#800000': 'maroon',
    '#c0c0c0': 'silver',
  };

  static cleanWord(w: string): string {
    return w.toLowerCase().trim().replace(/s$/, '');
  }

  static isStopWord(word: string): boolean {
    return this.STOP_WORDS.has(this.cleanWord(word));
  }

  static resolveColor(colorStr: string): string {
    const clean = colorStr.toLowerCase().trim();
    if (clean.startsWith('#')) {
      return this.HEX_COLOR_MAP[clean] || clean;
    }
    return clean;
  }

  static generateBigrams(words: string[]): string[] {
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }
    return bigrams;
  }

  static async computeImageHash(imageBuffer: Buffer): Promise<string> {
    try {
      const pixels = await sharp(imageBuffer)
        .resize(9, 8, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer();

      let hash = '';
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const left = pixels[row * 9 + col];
          const right = pixels[row * 9 + col + 1];
          hash += left < right ? '1' : '0';
        }
      }

      let hex = '';
      for (let i = 0; i < 64; i += 4) {
        hex += parseInt(hash.substring(i, i + 4), 2).toString(16);
      }
      return hex;
    } catch {
      return '';
    }
  }

  static hammingDistance(hash1: string, hash2: string): number {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
      distance += ((xor >> 0) & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
    }
    return distance;
  }
}
