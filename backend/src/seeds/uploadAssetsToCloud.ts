import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import logger from '../config/logger';

dotenv.config({ path: path.join(__dirname, '../../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FRONTEND_DIR = path.join(__dirname, '../../../frontend');
const SRC_ASSETS_DIR = path.join(FRONTEND_DIR, 'src/assets');
const PUBLIC_ASSETS_DIR = path.join(FRONTEND_DIR, 'public/assets');
const PUBLIC_DIR = path.join(FRONTEND_DIR, 'public');

const uploadMappings: Record<string, string> = {};

const isImageFile = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext);
};

const getFilesRecursive = (dir: string, filesList: string[] = []): string[] => {
  if (!fs.existsSync(dir)) return filesList;
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFilesRecursive(filePath, filesList);
    } else {
      filesList.push(filePath);
    }
  }
  return filesList;
};

const uploadAssets = async () => {
  logger.info('Starting local image upload to Cloudinary...');

  const srcAssetsFiles = fs.existsSync(SRC_ASSETS_DIR)
    ? fs.readdirSync(SRC_ASSETS_DIR).map((f) => path.join(SRC_ASSETS_DIR, f))
    : [];
  const publicAssetsFiles = getFilesRecursive(PUBLIC_ASSETS_DIR);
  const publicFiles = fs.existsSync(PUBLIC_DIR)
    ? fs
        .readdirSync(PUBLIC_DIR)
        .map((f) => path.join(PUBLIC_DIR, f))
        .filter((f) => !fs.statSync(f).isDirectory())
    : [];

  const allFiles = [...srcAssetsFiles, ...publicAssetsFiles, ...publicFiles].filter((f) =>
    isImageFile(f)
  );

  logger.info(`Found ${allFiles.length} image files to upload.`);

  for (const file of allFiles) {
    const filename = path.basename(file);
    if (['favicon.png', 'og-image.jpg'].includes(filename)) {
      logger.info(`Skipping system file: ${filename}`);
      continue;
    }

    let localPathReference = '';
    if (file.includes('src/assets')) {
      localPathReference = `/src/assets/${filename}`;
    } else if (file.includes('public/assets')) {
      const subpath = path.relative(PUBLIC_ASSETS_DIR, file).replace(/\\/g, '/');
      localPathReference = `/assets/${subpath}`;
    } else if (file.includes('public') && !file.includes('public/assets')) {
      localPathReference = `/${filename}`;
    }

    logger.info(`Uploading ${filename} (${localPathReference})...`);

    try {
      const publicId = `event_decor_${path.basename(file, path.extname(file))}`;
      const result = await cloudinary.uploader.upload(file, {
        public_id: publicId,
        folder: 'event_decor_ecommerce/assets',
        overwrite: true,
        invalidate: true,
      });

      logger.info(`Uploaded: ${result.secure_url}`);
      uploadMappings[localPathReference] = result.secure_url;
    } catch (err) {
      logger.error(`Failed to upload ${filename}:`, err);
    }
  }

  const mappingsPath = path.join(FRONTEND_DIR, 'src/assets/cloud_image_mappings.json');
  fs.writeFileSync(mappingsPath, JSON.stringify(uploadMappings, null, 2), 'utf-8');
  logger.info(`Saved mappings to: ${mappingsPath}`);

  let deletedCount = 0;
  let skippedCount = 0;

  for (const file of allFiles) {
    const filename = path.basename(file);
    if (['favicon.png', 'og-image.jpg'].includes(filename)) continue;

    if (filename.startsWith('mandala_')) {
      skippedCount++;
      continue;
    }

    try {
      fs.unlinkSync(file);
      deletedCount++;
    } catch (err) {
      logger.error(`Failed to delete ${filename}:`, err);
    }
  }

  logger.info(`Cleanup finished. Deleted ${deletedCount} files, kept ${skippedCount} mandala files.`);
};

uploadAssets().catch((err) => {
  logger.error('Fatal upload error:', err);
  process.exit(1);
});
