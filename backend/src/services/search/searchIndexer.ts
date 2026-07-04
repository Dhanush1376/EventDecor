import SearchIndex from '../../models/SearchIndex';
import Product from '../../models/Product';
import Event from '../../models/Event';
import Gallery from '../../models/Gallery';
import logger from '../../config/logger';
import { getTransliterationsAndSynonyms } from './queryParser';
import { getSingularForm } from './queryParser';

/**
 * Generates character n-grams from a string (min length 2, max length 6)
 */
export function buildNgrams(text: string): string[] {
  if (!text) return [];

  const words = text
    .toLowerCase()
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[^\w\s\u0c00-\u0c7f\u0900-\u097f]/g, '')
    .split(/\s+/);
  const ngrams = new Set<string>();

  for (const word of words) {
    if (word.length < 1) continue;
    // We add the word itself
    ngrams.add(word);

    // Create n-grams (e.g. coconut -> c, co, coc, coco, cocon, coconu, coconut)
    for (let i = 1; i <= Math.min(word.length, 6); i++) {
      ngrams.add(word.substring(0, i));
    }
  }

  return Array.from(ngrams);
}

/**
 * Tokenizes text into individual lowercase words, stripping punctuation
 */
export function tokenizeText(text?: string): string[] {
  if (!text) return [];
  return (
    text
      .toLowerCase()
      // eslint-disable-next-line no-misleading-character-class
      .replace(/[^\w\s\u0c00-\u0c7f\u0900-\u097f]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0)
  );
}

/**
 * Analyzes an entity and extracts all search tokens
 */
export function extractEntityTokens(entity: any, _type: 'Product' | 'Event' | 'Gallery') {
  const titleTokens = new Set<string>();
  const categoryTokens = new Set<string>();
  const tagTokens = new Set<string>();
  const materialTokens = new Set<string>();
  const descTokens = new Set<string>();
  const synonymTokens = new Set<string>();

  // Title processing
  tokenizeText(entity.title).forEach((t) => {
    titleTokens.add(t);
    titleTokens.add(getSingularForm(t));
  });

  if (entity.teluguTitle) {
    tokenizeText(entity.teluguTitle).forEach((t) => titleTokens.add(t));
  }

  // Category
  if (entity.primaryCategory) {
    // Note: Assuming primaryCategory string representation if populated, else wait for full resolve
    // Actually, in many cases primaryCategory is an ObjectId. We should ideally populate it.
    // For simplicity, we just safely stringify if it's already a string/name.
    tokenizeText(entity.primaryCategory.toString()).forEach((t) => categoryTokens.add(t));
  }

  // Tags/Features
  if (entity.tags) {
    entity.tags.forEach((tag: string) => tokenizeText(tag).forEach((t) => tagTokens.add(t)));
  }
  if (entity.features) {
    entity.features.forEach((feature: string) =>
      tokenizeText(feature).forEach((t) => tagTokens.add(t)),
    );
  }

  // Materials
  if (entity.material) {
    tokenizeText(entity.material).forEach((t) => materialTokens.add(t));
  }
  if (entity.materials) {
    entity.materials.forEach((m: string) => tokenizeText(m).forEach((t) => materialTokens.add(t)));
  }

  // Description
  if (entity.description) {
    tokenizeText(entity.description).forEach((t) => descTokens.add(t));
  }

  // Generate Synonyms for title + category + tags
  const combinedKeyTerms = [
    ...Array.from(titleTokens),
    ...Array.from(categoryTokens),
    ...Array.from(tagTokens),
  ];
  const combinedText = combinedKeyTerms.join(' ');
  const expanded = getTransliterationsAndSynonyms(combinedText);
  expanded.forEach((syn) => {
    tokenizeText(syn).forEach((t) => synonymTokens.add(t));
  });

  return {
    tokens: Array.from(titleTokens),
    categoryTokens: Array.from(categoryTokens),
    tagTokens: Array.from(tagTokens),
    materialTokens: Array.from(materialTokens),
    descriptionTokens: Array.from(descTokens),
    synonymTokens: Array.from(synonymTokens),
  };
}

/**
 * Indexes or updates a specific product in SearchIndex
 */
export async function indexProduct(product: any): Promise<void> {
  const ngrams = buildNgrams(product.title + ' ' + (product.teluguTitle || ''));
  const extracted = extractEntityTokens(product, 'Product');

  const popularity =
    (product.rating || 0) * 10 + (product.reviews || 0) + (product.views || 0) / 100;

  await SearchIndex.findOneAndUpdate(
    { entityId: product._id },
    {
      entityType: 'Product',
      title: product.title,
      slug: product.slug,
      image: product.imageSrc || (product.images && product.images[0]),
      price: product.price,
      rating: product.rating,
      reviews: product.reviews,

      ngrams,
      ...extracted,

      popularity,
      isActive: product.isActive !== false && !product.deletedAt,
    },
    { upsert: true, new: true },
  );
}

/**
 * Indexes or updates a specific event in SearchIndex
 */
export async function indexEvent(event: any): Promise<void> {
  const ngrams = buildNgrams(event.title);
  const extracted = extractEntityTokens(event, 'Event');

  await SearchIndex.findOneAndUpdate(
    { entityId: event._id },
    {
      entityType: 'Event',
      title: event.title,
      slug: event.slug,
      image: event.image || (event.images && event.images[0]),
      price: event.basePrice,

      ngrams,
      ...extracted,

      popularity: 0,
      isActive: event.isActive !== false && !event.deletedAt,
    },
    { upsert: true, new: true },
  );
}

/**
 * Indexes or updates a specific gallery item in SearchIndex
 */
export async function indexGallery(gallery: any): Promise<void> {
  const ngrams = buildNgrams(gallery.title + ' ' + (gallery.teluguTitle || ''));
  const extracted = extractEntityTokens(gallery, 'Gallery');

  const popularity = (gallery.views || 0) + (gallery.likes || 0) * 5;

  await SearchIndex.findOneAndUpdate(
    { entityId: gallery._id },
    {
      entityType: 'Gallery',
      title: gallery.title,
      slug: gallery.slug, // Gallery might not have slug, but safe
      image: gallery.image || (gallery.images && gallery.images[0]),

      ngrams,
      ...extracted,

      popularity,
      isActive: gallery.isActive !== false && !gallery.deletedAt,
    },
    { upsert: true, new: true },
  );
}

/**
 * Full database re-index
 */
export async function reindexAll(): Promise<void> {
  logger.info('[Search Indexer] Starting full reindex...');

  // Clear old index
  await SearchIndex.deleteMany({}, { bypassDestructionGuard: true } as any);

  // Reindex Products
  const products = await Product.find({ deletedAt: null }).lean();
  logger.info(`[Search Indexer] Indexing ${products.length} products...`);
  for (const p of products) {
    await indexProduct(p);
  }

  // Reindex Events
  const events = await Event.find({ deletedAt: null }).lean();
  logger.info(`[Search Indexer] Indexing ${events.length} events...`);
  for (const e of events) {
    await indexEvent(e);
  }

  // Reindex Galleries
  const galleries = await Gallery.find({ deletedAt: null }).lean();
  logger.info(`[Search Indexer] Indexing ${galleries.length} gallery items...`);
  for (const g of galleries) {
    await indexGallery(g);
  }

  logger.info('[Search Indexer] Reindex complete!');
}
