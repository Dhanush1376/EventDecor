
import api from '../api';
import logger from '../../utils/logger';

export const uploadWithRetry = async (uploadFn, formData, retries = 3, delayMs = 1500) => {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadFn(formData);
    } catch (error) {
      lastError = error;
      logger.warn(`[UPLOAD RETRY] Frontend upload attempt ${attempt}/${retries} failed. Retrying...`, error);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError || new Error(`Upload failed after ${retries} attempts`);
};

export const uploadDirectToCloudinary = async (formData, isSingle = false) => {
  const sigRes = await api.get('/upload/signed-url');
  console.log("SIGNED URL RESPONSE:", sigRes);
  const { signature, timestamp, cloudName, apiKey, folder, uploadUrl } = sigRes.data?.data || sigRes.data || {};

  const files = [];
  for (let value of formData.values()) {
    if (value instanceof File || value instanceof Blob) {
      files.push(value);
    } else if (typeof value === 'string' && value.startsWith('http')) {
      // Handle direct URLs (Cloudinary supports uploading from remote URLs)
      const urls = value.split(',').map(s => s.trim()).filter(s => s.startsWith('http'));
      files.push(...urls);
    }
  }

  if (files.length === 0) {
    throw new Error("No valid files or URLs provided for upload.");
  }

  const uploadPromises = files.map(async (file) => {
    const cloudinaryData = new FormData();
    cloudinaryData.append('file', file);
    cloudinaryData.append('api_key', apiKey);
    cloudinaryData.append('timestamp', timestamp);
    cloudinaryData.append('signature', signature);
    cloudinaryData.append('folder', folder);

    const res = await fetch(uploadUrl || `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: cloudinaryData,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Cloudinary direct upload failed: ${errorText}`);
    }
    return res.json();
  });

  const results = await Promise.all(uploadPromises);
  const urls = results.map(r => r.secure_url || r.url);

  if (isSingle) {
    return { success: true, url: urls[0] };
  } else {
    return { success: true, images: urls };
  }
};
