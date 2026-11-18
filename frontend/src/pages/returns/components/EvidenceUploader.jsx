import { CloudUpload, X, PlayCircle } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { m as motion } from 'framer-motion';

import api from '../../../services/api';
import toast from 'react-hot-toast';

const EvidenceUploader = ({
  images,
  videos,
  onImagesChange,
  onVideosChange,
  maxImages = 5,
  maxVideos = 2,
  onUploadingChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploadingState] = useState(false);
  const setIsUploading = (value) => {
    setIsUploadingState(value);
    onUploadingChange?.(value);
  };
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files) => {
    const formData = new FormData();
    let imageCount = images.length;
    let videoCount = videos.length;
    let hasFiles = false;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/') && imageCount < maxImages) {
        formData.append('images', file);
        imageCount++;
        hasFiles = true;
      } else if (file.type.startsWith('video/') && videoCount < maxVideos) {
        formData.append('images', file);
        videoCount++;
        hasFiles = true;
      }
    });

    if (!hasFiles) return;

    try {
      setIsUploading(true);
      const res = await api.post('/upload/inspirations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data.images) {
        const newImages = [];
        const newVideos = [];

        res.data.images.forEach((url) => {
          if (url.match(/\.(mp4|webm|mov|ogg)$/i)) {
            newVideos.push(url);
          } else {
            newImages.push(url);
          }
        });

        if (newImages.length > 0) onImagesChange([...images, ...newImages]);
        if (newVideos.length > 0) onVideosChange([...videos, ...newVideos]);
        toast.success('Files uploaded successfully');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to upload evidence files');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    const updated = [...images];
    updated.splice(index, 1);
    onImagesChange(updated);
  };

  const removeVideo = (index) => {
    const updated = [...videos];
    updated.splice(index, 1);
    onVideosChange(updated);
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant/40 hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload photos"
      >
        <CloudUpload className="text-4xl text-on-surface-variant mb-2" strokeWidth={1.5} />
        <h3 className="text-on-surface font-medium mb-1">
          {isUploading ? 'Uploading...' : 'Click or drag files to upload'}
        </h3>
        <p className="text-sm text-on-surface-variant">
          {maxVideos > 0
            ? `Images (max ${maxImages}), Videos (max ${maxVideos})`
            : `Images (max ${maxImages})`}
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
          accept={maxVideos > 0 ? 'image/*,video/*' : 'image/*'}
        />
      </div>

      {(images.length > 0 || videos.length > 0) && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-on-surface mb-3">Uploaded Evidence</h4>
          <div className="flex flex-wrap gap-4">
            {images.map((url, i) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={`img-${i}`}
                className="relative group w-24 h-24 rounded-lg overflow-hidden border border-outline-variant/20"
              >
                <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  aria-label={`Remove image ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(i);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <X className="text-[14px]" strokeWidth={1.5} />
                </button>
              </motion.div>
            ))}
            {videos.map((url, i) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={`vid-${i}`}
                className="relative group w-24 h-24 rounded-lg overflow-hidden border border-outline-variant/20 bg-surface-variant flex items-center justify-center"
              >
                <PlayCircle className="text-3xl text-on-surface-variant" strokeWidth={1.5} />
                <button
                  type="button"
                  aria-label={`Remove video ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeVideo(i);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <X className="text-[14px]" strokeWidth={1.5} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceUploader;
