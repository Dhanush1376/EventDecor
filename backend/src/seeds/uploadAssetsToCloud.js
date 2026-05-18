const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'drxgnnzeb',
  api_key: process.env.CLOUDINARY_API_KEY || '363867711767331',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'qe4LqfdGZZGGykUpgNj5GXKareI'
});

const FRONTEND_DIR = path.join(__dirname, '../../../frontend');
const SRC_ASSETS_DIR = path.join(FRONTEND_DIR, 'src/assets');
const PUBLIC_ASSETS_DIR = path.join(FRONTEND_DIR, 'public/assets');
const PUBLIC_DIR = path.join(FRONTEND_DIR, 'public');

const uploadMappings = {};

// Helper to check if file is an image
const isImageFile = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext);
};

// Helper to get recursive files
const getFilesRecursive = (dir, filesList = []) => {
  if (!fs.existsSync(dir)) return filesList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFilesRecursive(filePath, filesList);
    } else {
      filesList.push(filePath);
    }
  }
  return filesList;
};

// Main function
const uploadAssets = async () => {
  console.log('🚀 Starting local image upload to Cloudinary...');

  // 1. Gather all files to upload
  const srcAssetsFiles = fs.existsSync(SRC_ASSETS_DIR) ? fs.readdirSync(SRC_ASSETS_DIR).map(f => path.join(SRC_ASSETS_DIR, f)) : [];
  const publicAssetsFiles = getFilesRecursive(PUBLIC_ASSETS_DIR);
  
  // Non-recursive public files (only files in public directly, excluding subdirs like assets)
  const publicFiles = fs.existsSync(PUBLIC_DIR) 
    ? fs.readdirSync(PUBLIC_DIR)
        .map(f => path.join(PUBLIC_DIR, f))
        .filter(f => !fs.statSync(f).isDirectory())
    : [];

  const allFiles = [...srcAssetsFiles, ...publicAssetsFiles, ...publicFiles]
    .filter(f => isImageFile(f));

  console.log(`\n📦 Found ${allFiles.length} image files to upload.`);

  for (const file of allFiles) {
    const filename = path.basename(file);
    
    // Skip favicon and meta images to keep standard app settings local
    if (['favicon.png', 'og-image.jpg'].includes(filename)) {
      console.log(`⏩ Skipping system file: ${filename}`);
      continue;
    }

    // Determine the original path category for logging and referencing
    let localPathReference = '';
    if (file.includes('src\\assets') || file.includes('src/assets')) {
      localPathReference = `/src/assets/${filename}`;
    } else if (file.includes('public\\assets') || file.includes('public/assets')) {
      // Find subfolders under public/assets
      const subpath = path.relative(PUBLIC_ASSETS_DIR, file).replace(/\\/g, '/');
      localPathReference = `/assets/${subpath}`;
    } else if (file.includes('public') && !file.includes('public/assets')) {
      localPathReference = `/${filename}`;
    }

    console.log(`\n📤 Uploading ${filename} (${localPathReference})...`);
    
    try {
      const publicId = `event_decor_${path.basename(file, path.extname(file))}`;
      const result = await cloudinary.uploader.upload(file, {
        public_id: publicId,
        folder: 'event_decor_ecommerce/assets',
        overwrite: true,
        invalidate: true
      });

      console.log(`✅ Uploaded successfully! URL: ${result.secure_url}`);
      uploadMappings[localPathReference] = result.secure_url;
    } catch (err) {
      console.error(`❌ Failed to upload ${filename}:`, err);
    }
  }

  // Save mappings to a JSON file
  const mappingsPath = path.join(FRONTEND_DIR, 'src/assets/cloud_image_mappings.json');
  fs.writeFileSync(mappingsPath, JSON.stringify(uploadMappings, null, 2), 'utf-8');
  console.log(`\n💾 Saved mappings to: ${mappingsPath}`);

  // 2. Perform deletions
  console.log('\n🧹 Performing local cleanup...');
  let deletedCount = 0;
  let skippedCount = 0;

  for (const file of allFiles) {
    const filename = path.basename(file);

    // Skip favicon and og-image
    if (['favicon.png', 'og-image.jpg'].includes(filename)) {
      continue;
    }

    // Check if it's a mandala file
    const isMandala = filename.startsWith('mandala_');

    if (isMandala) {
      console.log(`📌 Mandala kept locally (in local and cloud): ${filename}`);
      skippedCount++;
    } else {
      try {
        fs.unlinkSync(file);
        console.log(`🗑️ Deleted local file: ${filename}`);
        deletedCount++;
      } catch (err) {
        console.error(`❌ Failed to delete ${filename}:`, err);
      }
    }
  }

  console.log(`\n🎉 Cleanup finished! Deleted ${deletedCount} local files, kept ${skippedCount} mandala files locally.`);
};

uploadAssets().catch(err => {
  console.error('Fatal Upload Error:', err);
});
