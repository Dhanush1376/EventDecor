export interface VisualSearchResult {
  id: string;
  title: string;
  slug: string;
  category: string;
  imageSrc: string;
  images: string[];
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  tags: string[];
  description: string;
  similarityScore: number;
  matchSource: string;
  badges: string[];
  itemType?: 'product' | 'event';
}

export interface VisualSearchResponse {
  bestMatch: VisualSearchResult | null;
  similarProducts: VisualSearchResult[];
  relatedProducts: VisualSearchResult[];
  aiAnalysis: {
    labels: string[];
    category: string;
    attributes: Record<string, string>;
    confidence: number;
  };
  totalResults: number;
  searchDurationMs: number;
}
