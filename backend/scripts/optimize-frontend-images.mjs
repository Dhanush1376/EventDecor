import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../frontend/public');

async function optimizeImages() {
  const files = fs.readdirSync(publicDir);
  const imageFiles = files.filter(f => /\.(png|jpe?g)$/i.test(f));

  console.log('Optimizing images in public directory...');

  for (const file of imageFiles) {
    const inputPath = path.join(publicDir, file);
    const parsed = path.parse(file);
    const webpPath = path.join(publicDir, `${parsed.name}.webp`);

    try {
      const metadata = await sharp(inputPath).metadata();
      
      await sharp(inputPath)
        .webp({ quality: 80, effort: 6 })
        .toFile(webpPath);
      
      console.log(`✅ Converted ${file} -> ${parsed.name}.webp`);

      if (!file.includes('og-image') && !file.includes('apple-touch') && !file.includes('favicon')) {
        const mobileWidth = Math.min(metadata.width, 600);
        if (metadata.width > mobileWidth) {
           const mobileWebpPath = path.join(publicDir, `${parsed.name}-mobile.webp`);
           await sharp(inputPath)
            .resize(mobileWidth)
            .webp({ quality: 80, effort: 6 })
            .toFile(mobileWebpPath);
           console.log(`✅ Created mobile variant ${parsed.name}-mobile.webp`);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to process ${file}:`, err.message);
    }
  }

  console.log('Finished optimizing public images.');
}

optimizeImages();
