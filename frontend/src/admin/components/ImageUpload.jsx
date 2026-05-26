import React, { useState, useRef } from 'react';
import { uploadService } from '../../services/domainServices';
import toast from 'react-hot-toast';

import logger from '../../utils/logger';
export function ImageUpload({ value, onChange, folder = 'products', label ="Upload Image" }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Client-side validation
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif', '.gif', '.bmp', '.tiff', '.tif', '.ico', '.svg'];
    const maxSizeBytes = folder === 'gallery' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;

    for (const file of files) {
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isHEIC = fileExt === '.heic' || fileExt === '.heif';
      
      // Extension and MIME Validation
      if (!allowedExts.includes(fileExt) || (!file.type.startsWith('image/') && !isHEIC)) {
        toast.error(`Invalid image format: ${file.name}. Only JPG, JPEG, PNG, WEBP, AVIF, HEIC, HEIF, GIF, BMP, TIFF, ICO, and SVG are permitted.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Payload Size Restrictions
      if (file.size > maxSizeBytes) {
        const sizeLimitMsg = folder === 'gallery' ? '10MB' : '5MB';
        toast.error(`Image size too large: ${file.name}. Maximum limit is ${sizeLimitMsg}.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setIsUploading(true);
    const toastId = toast.loading(`Uploading secure ${folder} asset...`);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));
      
      if (folder === 'cms') {
        const formDataSingle = new FormData();
        formDataSingle.append('image', files[0]);
        const res = await uploadService.uploadCMS(formDataSingle);
        onChange(res.url);
      } else {
        const res = await uploadService.uploadImages(formData, folder);
        onChange(res.images[0]); 
      }
      toast.success('Asset uploaded successfully!', { id: toastId });
    } catch (err) {
      logger.error('Upload failed:', err);
      toast.error(err.response?.data?.message || 'Failed to upload image. Please verify file signature and try again.', { id: toastId });
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
          <span className="material-symbols-outlined text-[12px] block">upload_file</span>
          <span>{isUploading ? 'Uploading...' : (value ? 'Change Image' : 'Upload Image')}</span>
        </button>
      </div>
      
      <input 
        ref={fileInputRef}
        type="file" 
        className="hidden" 
        accept="image/*,.heic,.heif"
        onChange={handleUpload}
      />

      {isUploading ? (
        <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
          <span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : value ? (
        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-neutral-200/60 shrink-0 group">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <button 
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            title="Delete Image"
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
