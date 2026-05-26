import React, { useState, useRef } from 'react';
import { uploadService } from '../../services/domainServices';
import toast from 'react-hot-toast';

import logger from '../../utils/logger';
export function VideoUpload({ value, onChange, folder = 'gallery', label ="Upload Showcase Video" }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Client-side validation for video formats
    const allowedExts = ['.mp4', '.webm', '.mov', '.ogg'];
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB video limit

    for (const file of files) {
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      // Extension and MIME Validation
      if (!allowedExts.includes(fileExt) || !file.type.startsWith('video/')) {
        toast.error(`Invalid video format: ${file.name}. Only MP4, WEBM, MOV, and OGG are permitted.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Payload Size Restrictions
      if (file.size > maxSizeBytes) {
        toast.error(`Video size too large: ${file.name}. Maximum limit is 50MB.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setIsUploading(true);
    const toastId = toast.loading(`Uploading secure ${folder} video asset...`);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file)); // API expects field name 'images'
      
      const res = await uploadService.uploadImages(formData, folder);
      onChange(res.images[0]); 
      
      toast.success('Video uploaded successfully!', { id: toastId });
    } catch (err) {
      logger.error('Video upload failed:', err);
      toast.error(err.response?.data?.message || 'Failed to upload video. Please verify file signature and try again.', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-2 bg-neutral-50 rounded-lg border border-neutral-200/50">
      <div className="flex-1 space-y-0.5">
        {label && <span className="text-[11px] sm:text-[11px] sm:text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">{label}</span>}
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-[#C4A87C] hover:text-amber-800 transition-colors font-bold text-[11px] cursor-pointer flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[12px] block">movie</span>
          <span>{isUploading ? 'Uploading...' : (value ? 'Change Video' : 'Upload Video')}</span>
        </button>
      </div>
      
      <input 
        ref={fileInputRef}
        type="file" 
        className="hidden" 
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        onChange={handleUpload}
      />

      {isUploading ? (
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
          <span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : value ? (
        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-neutral-200/60 shrink-0 group bg-black">
          <video src={value} className="w-full h-full object-cover" muted />
          <button 
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            title="Delete Video"
          >
            <span className="material-symbols-outlined text-[12px]">delete</span>
          </button>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded-lg border border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 shrink-0 cursor-pointer hover:bg-neutral-100/50 transition-all"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
        </div>
      )}
    </div>
  );
}
