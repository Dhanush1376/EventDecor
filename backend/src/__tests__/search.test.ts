import {
  analyzeQueryLocally,
  getTransliterationsAndSynonyms,
  generateFuzzyVariants,
  computeSearchScore,
} from '../services/searchService';

describe('Search Engine - Multilingual & Typo-tolerance Helpers', () => {
  describe('analyzeQueryLocally (Query Normalization & Intent Detection)', () => {
    it('should detect category and occasion matching keywords', () => {
      const result = analyzeQueryLocally('pelli decoration');
      expect(result.category).toBe('Wedding');
      expect(result.detectedLanguage).toBe('english');
    });

    it('should parse priceMax limits from budget queries', () => {
      const under50k = analyzeQueryLocally('wedding decor under 50k');
      expect(under50k.priceMax).toBe(50000);

      const below30000 = analyzeQueryLocally('birthday backdrop below 30000');
      expect(below30000.priceMax).toBe(30000);

      const under1Lakh = analyzeQueryLocally('luxury setup under 1 lakh');
      expect(under1Lakh.priceMax).toBe(100000);
    });

    it('should extract color specifications from search query', () => {
      const result = analyzeQueryLocally('yellow flowers wedding stage');
      expect(result.colors).toContain('yellow');
      expect(result.category).toBe('Wedding');
    });

    it('should identify specific styles in user query', () => {
      const traditional = analyzeQueryLocally('traditional pooja background');
      expect(traditional.style).toBe('traditional');

      const luxury = analyzeQueryLocally('luxury engagement setup');
      expect(luxury.style).toBe('luxury');
    });

    it('should detect Telugu script and mark language as telugu', () => {
      const result = analyzeQueryLocally('పెళ్లి డెకరేషన్');
      expect(result.detectedLanguage).toBe('telugu');
    });
  });

  describe('getTransliterationsAndSynonyms (Multilingual Translation Mapping)', () => {
    it('should translate Latin-script Telugu words to English synonyms', () => {
      const terms = getTransliterationsAndSynonyms('pelli setup');
      expect(terms).toContain('wedding');
      expect(terms).toContain('marriage');
    });

    it('should translate Telugu script words to English and Latin Telugu equivalents', () => {
      const terms = getTransliterationsAndSynonyms('పెళ్లి');
      expect(terms).toContain('wedding');
      expect(terms).toContain('marriage');
      expect(terms).toContain('pelli');
    });

    it('should handle pasupu/haldi translation', () => {
      const terms = getTransliterationsAndSynonyms('pasupu decor');
      expect(terms).toContain('haldi');
      expect(terms).toContain('yellow');
    });
  });

  describe('generateFuzzyVariants (Typo Tolerance)', () => {
    it('should create swap variants for common transposition mistakes', () => {
      const variants = generateFuzzyVariants('wedidng');
      expect(variants).toContain('wedding');
    });
  });

  describe('computeSearchScore (Compound Relevance Scoring)', () => {
    it('should prioritize exact title matches over tag/category matches', () => {
      const exactScore = computeSearchScore(
        'Wedding Mandapam Decor',
        'Wedding',
        ['mandap'],
        'wedding mandapam decor',
      );
      const tagScore = computeSearchScore('Lotus Garland Tray', 'Wedding', ['mandap'], 'mandap');
      expect(exactScore).toBeGreaterThan(tagScore);
    });

    it('should boost scores when matching the Telugu title', () => {
      const scoreWithTelugu = computeSearchScore(
        'Bridal Coconut Decor',
        'Wedding',
        ['coconut'],
        'కొబ్బరి',
        'కొబ్బరి డెకర్',
      );
      const scoreWithoutTelugu = computeSearchScore(
        'Bridal Coconut Decor',
        'Wedding',
        ['coconut'],
        'కొబ్బరి',
      );
      expect(scoreWithTelugu).toBeGreaterThan(scoreWithoutTelugu);
    });
  });
});
