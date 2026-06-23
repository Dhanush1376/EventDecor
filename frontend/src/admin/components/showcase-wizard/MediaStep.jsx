import React from 'react';
import toast from 'react-hot-toast';
import { compressImage, formatBytes } from '../../../utils/media/imageCompressor';
import { uploadService } from '../../../services/domainServices';

export function MediaStep({
  formData,
  setFormData,
  setIsCompressing,
  setCompressionProgress,
  setCompressionStats,
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">Product Media</h2>
        <p className="text-[11px] text-[var(--admin-text-secondary)]">
          Upload images or paste URLs. The first image acts as the primary cover.
        </p>
      </div>

      <div className="space-y-4">
        {/* URL Paste Box */}
        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-widest">
            Paste Image URLs
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Image URL"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="flex-1 min-w-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[11px] outline-none focus:border-[var(--admin-accent)]/40"
            />
            <button
              type="button"
              onClick={() => {
                if (formData.image) {
                  toast.success('URL added successfully!');
                }
              }}
              className="shrink-0 bg-[var(--admin-accent)] text-white hover:brightness-110 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
            >
              Add URL
            </button>
          </div>
        </div>

        {/* Multi Upload Box */}
        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-widest flex justify-between items-center">
            <span>Upload Files</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const rawFiles = Array.from(e.target.files);
              if (rawFiles.length === 0) return;
              setIsCompressing(true);
              setCompressionProgress(0);
              setCompressionStats([]);
              try {
                const uploadData = new FormData();
                const newStats = [];

                for (let i = 0; i < rawFiles.length; i++) {
                  const file = rawFiles[i];
                  const optimizedFile = await compressImage(file);
                  uploadData.append('images', optimizedFile);

                  newStats.push({
                    name: file.name,
                    originalSize: formatBytes(file.size),
                    optimizedSize: formatBytes(optimizedFile.size),
                    reduction:
                      file.size > 0 ? ((1 - optimizedFile.size / file.size) * 100).toFixed(1) : 0,
                  });
                }
                setCompressionStats(newStats);

                const onProgress = (filename, percent) => {
                  setCompressionProgress(percent);
                };

                const res = await uploadService.uploadImages(uploadData, 'events', onProgress);
                if (res.success && res.images && res.images.length > 0) {
                  setFormData((prev) => ({ ...prev, image: res.images[0] }));
                  toast.success(`Showcase image uploaded successfully!`);
                }
              } catch (err) {
                let msg =
                  err?.response?.status === 401
                    ? 'Upload failed: Please log in again or refresh the page'
                    : err?.response?.data?.message ||
                      err?.message ||
                      'Upload failed. Please try again.';

                if (err?.message === 'Network Error') {
                  msg = `Network Error! URL: ${err?.config?.url || 'unknown'}. Check if CORS or AdBlocker is blocking it.`;
                }
                toast.error(msg);
              } finally {
                setTimeout(() => {
                  setIsCompressing(false);
                  setCompressionProgress(0);
                  setCompressionStats([]);
                }, 1500);
              }
            }}
            className="w-full text-[11px] text-[var(--admin-text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:bg-[var(--admin-accent)] file:text-white hover:file:bg-[var(--admin-accent-hover)] cursor-pointer shadow-sm border border-[var(--admin-border)] rounded-xl p-2 bg-[var(--admin-surface)] focus:border-[var(--admin-accent)] focus:outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );
}
