import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../frontend/public');

async function optimizeImages() {
  console.log('Starting image optimization...');

  // 1. Optimize favicon.png (reduce to 128x128 max)
  const faviconPng = path.join(publicDir, 'favicon.png');
  if (fs.existsSync(faviconPng)) {
    const buffer = fs.readFileSync(faviconPng);
    await sharp(buffer)
      .resize(128, 128)
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(faviconPng);
    console.log('Optimized favicon.png');
  }

  // 2. Optimize apple-touch-icon.png (180x180)
  const appleIcon = path.join(publicDir, 'apple-touch-icon.png');
  if (fs.existsSync(appleIcon)) {
    const buffer = fs.readFileSync(appleIcon);
    await sharp(buffer)
      .resize(180, 180)
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(appleIcon);
    console.log('Optimized apple-touch-icon.png');
  }

  // 3. Optimize favicon-32x32.png
  const favicon32 = path.join(publicDir, 'favicon-32x32.png');
  if (fs.existsSync(favicon32)) {
    const buffer = fs.readFileSync(favicon32);
    await sharp(buffer).resize(32, 32).png({ quality: 90, compressionLevel: 9 }).toFile(favicon32);
    console.log('Optimized favicon-32x32.png');
  }

  // 4. Optimize og-image.png and og-image.jpg
  const ogImagePng = path.join(publicDir, 'og-image.png');
  if (fs.existsSync(ogImagePng)) {
    const buffer = fs.readFileSync(ogImagePng);
    await sharp(buffer)
      .resize(1200, 630, { fit: 'inside' })
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(ogImagePng);
    console.log('Optimized og-image.png');
  }

  const ogImageJpg = path.join(publicDir, 'og-image.jpg');
  if (fs.existsSync(ogImageJpg)) {
    const buffer = fs.readFileSync(ogImageJpg);
    await sharp(buffer)
      .resize(1200, 630, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toFile(ogImageJpg);
    console.log('Optimized og-image.jpg');
  }

  // 5. Convert legacy_artistry_decor.png to webp
  const legacyImage = path.join(publicDir, 'assets', 'legacy_artistry_decor.png');
  const legacyWebp = path.join(publicDir, 'assets', 'legacy_artistry_decor.webp');
  if (fs.existsSync(legacyImage)) {
    const buffer = fs.readFileSync(legacyImage);
    await sharp(buffer).webp({ quality: 80 }).toFile(legacyWebp);
    // Delete original png
    fs.unlinkSync(legacyImage);
    console.log('Converted legacy_artistry_decor.png to WebP');
  }

  console.log('Image optimization complete.');
}

optimizeImages().catch(console.error);
