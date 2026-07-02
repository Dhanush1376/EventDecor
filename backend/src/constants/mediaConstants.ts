export const MEDIA_FOLDERS = {
  products: 'siri-arts-crafts/products',
  products_gallery: 'siri-arts-crafts/products/gallery',
  categories: 'siri-arts-crafts/categories',
  showcases: 'siri-arts-crafts/showcases',
  gallery: 'siri-arts-crafts/gallery',
  events: 'siri-arts-crafts/events',
  blogs: 'siri-arts-crafts/blogs',
  users_profile: 'siri-arts-crafts/users/profile',
  users_gallery: 'siri-arts-crafts/users/gallery',
  banners: 'siri-arts-crafts/banners',
  logos: 'siri-arts-crafts/logos',
  videos: 'siri-arts-crafts/videos',
  videos_showcases: 'siri-arts-crafts/videos/showcases',
  videos_promotions: 'siri-arts-crafts/videos/promotions',
  temp: 'siri-arts-crafts/temp',
  cms: 'siri-arts-crafts/cms',
  reviews: 'siri-arts-crafts/reviews',
};

export const buildFolder = (module: string, subPath?: string): string => {
  const baseFolder = MEDIA_FOLDERS[module as keyof typeof MEDIA_FOLDERS] || MEDIA_FOLDERS.temp;
  return subPath ? `${baseFolder}/${subPath}` : baseFolder;
};

export const UPLOAD_LIMITS = {
  products: 5 * 1024 * 1024, // 5MB
  gallery: 10 * 1024 * 1024, // 10MB
  avatars: 2 * 1024 * 1024, // 2MB
  cms: 5 * 1024 * 1024, // 5MB
  videos: 100 * 1024 * 1024, // 100MB
  default: 10 * 1024 * 1024, // 10MB
};

export const THUMBNAIL_SIZES = [
  { name: 'thumb', width: 150, height: 150 },
  { name: 'small', width: 400 },
  { name: 'medium', width: 800 },
  { name: 'large', width: 1200 },
];

export const IMAGE_QUALITY = 'auto:good';
export const MAX_DIMENSION = 1920;

export const SUPPORTED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/svg+xml',
  'image/gif',
]);

export const SUPPORTED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export const SOFT_DELETE_RETENTION_DAYS = 30;
export const MAX_VERSION_HISTORY = 5;

export const DEFAULT_BULK_CONCURRENCY = 20;
export const MAX_BULK_CONCURRENCY = 50;

export const PERF_TARGETS = {
  singleUploadMs: 2000,
  duplicateDetectionMs: 50,
  mediaLookupMs: 100,
  searchMs: 300,
};
