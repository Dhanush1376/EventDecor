/**
 * Cloudinary-hosted placeholder images (no third-party image hosts in production).
 */
import { EXTERNAL_URLS } from '../config/constants';

const CDN = `${EXTERNAL_URLS.CLOUDINARY_CDN_BASE}/drxgnnzeb/image/upload`;

const img = (path, width = 800) =>
  `${CDN}/q_auto:eco,f_auto,w_${width},c_limit,fl_strip_profile/${path}`;

export const PLACEHOLDER_IMAGES = {
  heroBackground: img(
    'v1779181764/event_decor_ecommerce/assets/event_decor_mobile%20hero%20background.png',
  ),
  mandalaHero: img(
    'v1779129367/event_decor_ecommerce/assets/event_decor_mandala_hero_art.png',
    400,
  ),
  collectionWedding: img(
    'v1779129318/event_decor_ecommerce/assets/event_decor_collection_wedding.png',
    600,
  ),
  mandalaArt2: img('v1779129358/event_decor_ecommerce/assets/event_decor_mandala_art_2.png', 600),
  mandalaArt3: img('v1779129360/event_decor_ecommerce/assets/event_decor_mandala_art_3.png', 600),
  mandalaArt4: img('v1779129361/event_decor_ecommerce/assets/event_decor_mandala_art_4.png', 600),
  emptyCart: img(
    'v1779129342/event_decor_ecommerce/assets/event_decor_empty_cart_illustration.jpg',
    600,
  ),
};
