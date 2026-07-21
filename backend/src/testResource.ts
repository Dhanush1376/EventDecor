/* eslint-disable no-console */
import './config/loadEnv';
import { getCloudinary } from './config/cloudinary';
async function test() {
  const cloudinary = getCloudinary();
  try {
    const r2 = await cloudinary.api.resource('siri-arts-crafts/products/audit-test-1-gif-6ae0');
    console.log('STILL EXISTS:', JSON.stringify(r2, null, 2));
  } catch (e: any) {
    console.log('ERROR:', e.error || e.message || e);
  }
  process.exit(0);
}
test();
