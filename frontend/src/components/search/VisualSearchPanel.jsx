import { CloudUpload, Camera } from 'lucide-react';
import React from 'react';
import { m as motion } from 'framer-motion';

export function VisualSearchPanel({
  handleDragEnter,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  fileInputRef,
  startCamera,
  isMobile,
}) {
  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto bg-white px-5 py-6 flex flex-col gap-6 overscroll-contain">
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="vs-upload-zone"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary">
              <CloudUpload className="text-[32px]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-on-surface font-semibold text-[15px]">Upload an image</p>
              <p className="text-on-surface-variant/60 text-[12px] mt-1">
                Drag and drop or click to browse
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            startCamera();
          }}
          className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border border-stone-200 active:bg-stone-50 text-stone-700 font-bold text-[13px] uppercase tracking-wider bg-white cursor-pointer"
        >
          <Camera className="text-[18px]" strokeWidth={1.5} />
          Use Camera
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full px-6 lg:px-8.5 py-6 flex flex-col gap-5"
    >
      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="vs-upload-zone"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary">
            <CloudUpload className="text-[32px]" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-on-surface font-semibold text-[15px]">Upload an image</p>
            <p className="text-on-surface-variant/60 text-[12px] mt-1">
              Drag and drop or click to browse
            </p>
          </div>
        </div>
      </div>

      {/* Camera Action Row */}
      <div className="flex gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            startCamera();
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors text-on-surface-variant font-bold text-[13px] uppercase tracking-wider cursor-pointer bg-white"
        >
          <Camera className="text-[18px]" strokeWidth={1.5} />
          Use Camera
        </button>
      </div>
    </motion.div>
  );
}
