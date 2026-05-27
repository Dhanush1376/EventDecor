const fs = require('fs');
const path = require('path');

const domainServicesPath = path.join(__dirname, 'src', 'services', 'domainServices.js');
const apiDirPath = path.join(__dirname, 'src', 'services', 'api');

if (!fs.existsSync(apiDirPath)) {
  fs.mkdirSync(apiDirPath, { recursive: true });
}

const content = fs.readFileSync(domainServicesPath, 'utf8');

const regex = /^export const (\w+Service) = \{([\s\S]*?)^};/gm;
let match;
const services = [];

while ((match = regex.exec(content)) !== null) {
  services.push({
    name: match[1],
    code: match[0],
  });
}

const looseCode = `
import api from '../api';
import logger from '../../utils/logger';

export const uploadWithRetry = async (uploadFn, formData, retries = 3, delayMs = 1500) => {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadFn(formData);
    } catch (error) {
      lastError = error;
      logger.warn(\`[UPLOAD RETRY] Frontend upload attempt \${attempt}/\${retries} failed. Retrying...\`, error);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError || new Error(\`Upload failed after \${retries} attempts\`);
};

export const uploadDirectToCloudinary = async (formData, isSingle = false) => {
  const sigRes = await api.get('/upload/signed-url');
  const { signature, timestamp, cloudName, apiKey, folder } = sigRes.data;

  const files = [];
  for (let value of formData.values()) {
    if (value instanceof File || value instanceof Blob) {
      files.push(value);
    }
  }

  const uploadPromises = files.map(async (file) => {
    const cloudinaryData = new FormData();
    cloudinaryData.append('file', file);
    cloudinaryData.append('api_key', apiKey);
    cloudinaryData.append('timestamp', timestamp);
    cloudinaryData.append('signature', signature);
    cloudinaryData.append('folder', folder);

    const res = await fetch(\`https://api.cloudinary.com/v1_1/\${cloudName}/auto/upload\`, {
      method: 'POST',
      body: cloudinaryData,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(\`Cloudinary direct upload failed: \${errorText}\`);
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
`;

fs.writeFileSync(path.join(apiDirPath, '_shared.js'), looseCode);

services.forEach(service => {
  let imports = `import api, { refreshAccessToken } from '../api';\nimport { hasSessionMarker } from '../../utils/authStorage';\nimport logger from '../../utils/logger';\n\nconst checkAuthLocal = () => hasSessionMarker();\n\n`;
  
  let serviceCode = service.code;
  
  if (serviceCode.includes('uploadWithRetry')) {
    imports += `import { uploadWithRetry } from './_shared';\n`;
  }
  if (serviceCode.includes('uploadDirectToCloudinary')) {
    imports += `import { uploadDirectToCloudinary } from './_shared';\n`;
  }
  
  fs.writeFileSync(path.join(apiDirPath, `${service.name}.js`), imports + serviceCode + '\n');
});

let newDomainServices = '';
services.forEach(service => {
  newDomainServices += `export { ${service.name} } from './api/${service.name}';\n`;
});

fs.writeFileSync(domainServicesPath, newDomainServices);

console.log('Split complete. Generated files:', services.map(s => s.name).join(', '));
