import { useState } from 'react';
import toast from 'react-hot-toast';
import { uploadService } from '../services/domainServices';

export function useCustomOrderUploads(wizardDraft, updateDraft) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleMoodUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Local checks
    const invalidFile = files.find((f) => !f.type.startsWith('image/'));
    if (invalidFile) {
      toast.error('Please upload valid images only');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    // Simulate compression/upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 150);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('images', file);
        const res = await uploadService.uploadImages(formData, 'products');
        if (res.success && res.images && res.images[0]) {
          uploadedUrls.push(res.images[0]);
        }
      }

      const nextUrls = [...(wizardDraft?.inspirationImages || []), ...uploadedUrls];
      updateDraft({ inspirationImages: nextUrls });
      toast.success(`${files.length} photos successfully uploaded!`);
    } catch (err) {
      toast.error('Failed to upload photos. Please try again.');
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    isUploading,
    uploadProgress,
    handleMoodUpload,
  };
}
