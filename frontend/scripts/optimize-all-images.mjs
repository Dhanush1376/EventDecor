import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

async function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(await getFilesRecursively(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

async function optimizeImages() {
  const allFiles = await getFilesRecursively(publicDir);
  const imageFiles = allFiles.filter(f => /\.(png|jpe?g|webp)$/i.test(f));

  console.log(`Found ${imageFiles.length} images to optimize in public directory...`);

  for (const inputPath of imageFiles) {
    const fileDir = path.dirname(inputPath);
    const parsed = path.parse(inputPath);
    const isWebp = parsed.ext.toLowerCase() === '.webp';
    const webpPath = path.join(fileDir, `${parsed.name}.webp`);

    try {
      const metadata = await sharp(inputPath).metadata();
      
      // Let's create WebP version if it's not already webp
      if (!isWebp) {
        await sharp(inputPath)
          .webp({ quality: 80, effort: 6 })
          .toFile(webpPath);
        console.log(`✅ Converted ${parsed.base} -> ${parsed.name}.webp`);
      }
      
      // Additionally, if the image is extremely large (e.g. over 1200px wide and not an OG image), 
      // let's create a smaller WebP variant for mobile
      if (!parsed.name.includes('og-image') && !parsed.name.includes('apple-touch') && !parsed.name.includes('favicon') && !parsed.name.includes('-mobile')) {
        const mobileWidth = Math.min(metadata.width, 600);
        if (metadata.width > mobileWidth + 100) { // Only if significantly larger
           const mobileWebpPath = path.join(fileDir, `${parsed.name}-mobile.webp`);
           if (!fs.existsSync(mobileWebpPath)) {
             await sharp(inputPath)
              .resize(mobileWidth)
              .webp({ quality: 80, effort: 6 })
              .toFile(mobileWebpPath);
             console.log(`✅ Created mobile variant ${parsed.name}-mobile.webp`);
           }
        }
      }
    } catch (err) {
      console.error(`❌ Failed to process ${parsed.base}:`, err.message);
    }
  }

  console.log('Finished optimizing public images.');
}

optimizeImages();
