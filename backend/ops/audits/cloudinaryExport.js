const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const exportCloudinary = async () => {
  console.log('Connecting to Cloudinary to export all resources...');
  let allResources = [];
  let nextCursor = null;

  try {
    do {
      const result = await cloudinary.api.resources({
        max_results: 500,
        next_cursor: nextCursor,
        tags: true,
        context: true,
        metadata: true,
      });
      allResources = allResources.concat(result.resources);
      nextCursor = result.next_cursor;
      console.log(`Fetched ${result.resources.length} resources... Total: ${allResources.length}`);
    } while (nextCursor);

    const exportPath = path.resolve(__dirname, '../../cloudinary_inventory.json');
    fs.writeFileSync(exportPath, JSON.stringify(allResources, null, 2));
    console.log(
      `✅ Successfully exported ${allResources.length} Cloudinary resources to ${exportPath}`,
    );
  } catch (error) {
    console.error('Failed to export Cloudinary resources:', error);
  }
};

exportCloudinary();
