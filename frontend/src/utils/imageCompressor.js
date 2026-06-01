export const compressImage = async (file, maxDimension = 1600) => {
  // If file is already very small (< 500KB) and is an image, don't aggressively recompress to avoid quality loss on small icons/logos.
  const initialSize = file.size;
  if (initialSize < 500 * 1024) {
    return file;
  }

  // Determine quality dynamically based on file size
  let quality = 0.8; // Default
  if (initialSize > 5 * 1024 * 1024) {
    quality = 0.6; // Aggressive compression for > 5MB
  } else if (initialSize > 2 * 1024 * 1024) {
    quality = 0.7; // Moderate compression for > 2MB
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        let { width, height } = img;

        // Calculate aspect ratio scaling
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to WebP
        const mimeType = 'image/webp';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file); // fallback
            }

            // If compressed blob is somehow larger than the original, return original
            if (blob.size >= initialSize) {
              resolve(file);
            } else {
              const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
              const newFile = new File([blob], `${originalName}.webp`, {
                type: mimeType,
                lastModified: Date.now(),
              });
              resolve(newFile);
            }
          },
          mimeType,
          quality,
        );
      };

      img.onerror = (err) => {
        // Use console.error instead of throwing to prevent crashing the upload flow
        resolve(file); // Safe fallback
      };
    };

    reader.onerror = (err) => {
      resolve(file); // Safe fallback
    };
  });
};

export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
