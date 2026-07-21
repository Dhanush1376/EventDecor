/* eslint-disable no-console */
import './config/loadEnv';
import { getCloudinary } from './config/cloudinary';
async function test() {
  const cloudinary = getCloudinary();
  try {
    const res = await cloudinary.uploader.destroy(
      'siri-arts-crafts/products/audit-test-1-gif-6ae0',
    );
    console.log('Destroy result:', res);
    const r2 = await cloudinary.api.resource('siri-arts-crafts/products/audit-test-1-gif-6ae0');
    console.log('STILL EXISTS:', r2.public_id);
  } catch (e: any) {
    console.log('ERROR:', e.error || e.message || e);
  }
  process.exit(0);
}
test();
