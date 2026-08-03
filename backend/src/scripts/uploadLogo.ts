import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

import { uploadOnCloudinary } from '../utils/cloudinary';

const run = async () => {
  const logoPath = path.resolve(__dirname, '../../public/logo.png');
  console.log(`Uploading ${logoPath}...`);
  const result = await uploadOnCloudinary(logoPath);
  console.log('Result:', result?.secure_url);
  process.exit(0);
};

run();
