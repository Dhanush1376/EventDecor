/**
 * A clean builder pattern for constructing complex Mongoose search queries
 * safely and efficiently, avoiding raw inline aggregation/regex explosion.
 */
export class MongoQueryBuilder<_T> {
  private query: any = { isActive: true };

  /**
   * Initializes a new query builder with default active-only filter
   */
  public static create<T>(): MongoQueryBuilder<T> {
    return new MongoQueryBuilder<T>();
  }

  /**
   * Leverages MongoDB native text index for performant searching
   */
  public withTextSearch(terms: string[]): this {
    if (terms && terms.length > 0) {
      // Filter out overly short strings that bloat text search
      const validTerms = terms.filter((t) => t.length > 2);
      if (validTerms.length > 0) {
        this.query.$text = { $search: validTerms.join(' ') };
      }
    }
    return this;
  }

  /**
   * Adds category filtering (case-insensitive)
   */
  public withCategory(category?: string | null): this {
    if (category && category.toLowerCase() !== 'all') {
      this.query.category = new RegExp(this.escapeRegex(category), 'i') as any;
    }
    return this;
  }

  /**
   * Adds pricing range filters
   */
  public withPriceRange(minPrice?: number, maxPrice?: number, priceField: string = 'price'): this {
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: any = {};
      if (minPrice !== undefined) priceFilter.$gte = minPrice;
      if (maxPrice !== undefined) priceFilter.$lte = maxPrice;

      (this.query as any)[priceField] = priceFilter;
    }
    return this;
  }

  /**
   * Matches any of the provided tags/colors (case-insensitive)
   */
  public withTags(tags: string[], targetField: string = 'tags'): this {
    if (tags && tags.length > 0) {
      if (!this.query.$or) {
        this.query.$or = [];
      }
      this.query.$or.push({
        [targetField]: { $in: tags.map((t) => new RegExp(this.escapeRegex(t), 'i')) },
      } as any);
    }
    return this;
  }

  /**
   * Fallback for collections without text indexes. Avoid using on large collections.
   */
  public withRegexFallback(terms: string[], fields: string[]): this {
    if (terms && terms.length > 0 && fields && fields.length > 0) {
      const validTerms = terms.filter((t) => t.length >= 2).slice(0, 15); // Capped to prevent ReDoS
      if (validTerms.length === 0) return this;

      const regexPatterns = validTerms.map((term) => new RegExp(this.escapeRegex(term), 'i'));

      const orConditions = fields.map((field) => ({
        [field]: { $in: regexPatterns },
      }));

      if (!this.query.$or) {
        this.query.$or = [];
      }
      this.query.$or.push({ $or: orConditions } as any);
    }
    return this;
  }

  /**
   * Finalizes and returns the query object
   */
  public build(): any {
    // Clean up empty $or arrays
    if (this.query.$or && this.query.$or.length === 0) {
      delete this.query.$or;
    }
    return this.query;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
