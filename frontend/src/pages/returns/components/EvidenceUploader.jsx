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
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
      const res = await api.post('/api/v1/upload/inspirations', formData, {
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
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant/40 hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
          cloud_upload
        </span>
        <h3 className="text-on-surface font-medium mb-1">
          {isUploading ? 'Uploading...' : 'Click or drag files to upload'}
        </h3>
        <p className="text-sm text-on-surface-variant">
          Images (max {maxImages}), Videos (max {maxVideos})
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
          accept="image/*,video/*"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(i);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
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
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                  play_circle
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeVideo(i);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
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
