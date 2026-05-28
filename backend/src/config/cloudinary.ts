import logger from "./logger";

let cloudinaryInstance: any = null;
let configured = false;

export const getCloudinary = (): any => {
  if (cloudinaryInstance && configured) {
    return cloudinaryInstance;
  }

  const { v2: cloudinary } = require("cloudinary");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    logger.error("[CLOUDINARY CONFIG ERROR] Cloudinary credentials are missing or undefined! Uploads will fail.");
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  } else if (!configured) {
    logger.info(`[CLOUDINARY INITIALIZATION] Cloudinary SDK configured. cloud_name=${cloudName}`);
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    configured = true;
  }

  cloudinaryInstance = cloudinary;
  return cloudinaryInstance!;
};

export default getCloudinary;

