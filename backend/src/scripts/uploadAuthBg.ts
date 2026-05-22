import 'dotenv/config';
import { uploadOnCloudinary } from '../utils/cloudinary';

const imagePath = 'C:/Users/Dhanush/.gemini/antigravity-ide/brain/5abbde2a-7895-4162-89e9-d34325cee0bb/auth_background_decor_1779470598428.png';

async function run() {
  console.log('Starting manual upload of auth background image to Cloudinary...');
  try {
    const result = await uploadOnCloudinary(imagePath);
    if (result) {
      console.log('UPLOAD SUCCESSFUL!');
      console.log('CLOUDINARY_URL:', result.secure_url || result.url);
    } else {
      console.error('Upload returned null result.');
    }
  } catch (error) {
    console.error('Upload failed with error:', error);
  }
}

run();
