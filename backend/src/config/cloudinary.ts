import { v2 as cloudinary } from "cloudinary";
import logger from "./logger";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  logger.error("[CLOUDINARY CONFIG ERROR] Cloudinary credentials are missing or undefined! Uploads will fail.");
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
} else {
  logger.info(`[CLOUDINARY INITIALIZATION] Cloudinary SDK configured. cloud_name=${cloudName}`);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export default cloudinary;
