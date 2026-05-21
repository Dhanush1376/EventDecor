import cloudImageMappings from '../assets/cloud_image_mappings.json';
import { getOptimizedUrl } from '../utils/imageUtils';

const mandalaPath = (filename) => `/${filename}`;

/** Cloudinary-backed mandala URLs (q_auto, f_webp) — no local PNGs in the bundle. */
export const MANDALA_VARIANT_URLS = {
  1: getOptimizedUrl(cloudImageMappings[mandalaPath('mandala_hero_art.png')], 800),
  2: getOptimizedUrl(cloudImageMappings[mandalaPath('mandala_art_2.png')], 800),
  3: getOptimizedUrl(cloudImageMappings[mandalaPath('mandala_art_3.png')], 800),
  4: getOptimizedUrl(cloudImageMappings[mandalaPath('mandala_art_4.png')], 800),
};
