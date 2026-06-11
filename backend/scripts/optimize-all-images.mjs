import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../../frontend/public');

async function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await processDirectory(fullPath);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        const webpPath = fullPath.replace(ext, '.webp');
        if (!fs.existsSync(webpPath)) {
          console.log(`Converting ${fullPath} to WebP...`);
          await sharp(fullPath).webp({ quality: 80 }).toFile(webpPath);
        }
      }
    }
  }
}

async function run() {
  console.log('Optimizing all images to WebP...');
  await processDirectory(publicDir);
  console.log('Done.');
}

run().catch(console.error);
