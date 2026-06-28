import logger from '../config/logger';

const FORBIDDEN_HOST_PATTERNS = [
  /unsplash\.com/i,
  /pexels\.com/i,
  /pixabay\.com/i,
  /picsum\.photos/i,
];

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const isCloudinaryUrl = (value: string): boolean => /res\.cloudinary\.com/i.test(value);

/**
 * Ensures seed scripts only use Cloudinary-hosted images (never hotlinked external CDNs).
 * Set SEED_IMAGES_SOURCE=cloudinary in .env before running npm run seed.
 */
export const assertSeedImagesCloudinaryOnly = (payload: unknown): void => {
  if (process.env.SEED_IMAGES_SOURCE !== 'cloudinary') {
    logger.error(
      '❌ SEED_IMAGES_SOURCE must be set to "cloudinary". Add SEED_IMAGES_SOURCE=cloudinary to .env before seeding.',
    );
    process.exit(1);
  }

  const serialized = JSON.stringify(payload);

  for (const pattern of FORBIDDEN_HOST_PATTERNS) {
    if (pattern.test(serialized)) {
      logger.error(
        `Seed data contains forbidden external image host (${pattern}). Use Cloudinary URLs only.`,
      );
      process.exit(1);
    }
  }

  const urlMatches = serialized.match(/https?:\/\/[^"\\\s]+/gi) || [];
  for (const url of urlMatches) {
    if (!isHttpUrl(url)) continue;
    if (isCloudinaryUrl(url)) continue;
    logger.error(`Seed data contains non-Cloudinary URL: ${url}`);
    process.exit(1);
  }
};
