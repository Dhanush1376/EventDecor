import dotenv from 'dotenv';

// Load env
dotenv.config();

import getCloudinary from '../config/cloudinary';

async function run() {
  try {
    const cloudinary = getCloudinary();
    console.log('Searching Cloudinary for siri-arts-crafts/products/eb3bf4c2113a34ac...');

    const result = await cloudinary.api.resource('siri-arts-crafts/products/eb3bf4c2113a34ac');
    console.log('Found working image:', JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.log('Error:', error.message || error);
  }
}

run();
