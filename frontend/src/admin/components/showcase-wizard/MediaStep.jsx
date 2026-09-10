import React from 'react';
import { compressImage, formatBytes } from '../../../utils/media/imageCompressor';
import toast from 'react-hot-toast';

export function MediaStep({
  formData,
  setFormData,
  isCompressing,
  setIsCompressing,
  compressionProgress,
  setCompressionProgress,
  compressionStats,
  setCompressionStats,
}) {
  const images = [formData.image, ...(formData.galleryImages || [])].filter(Boolean);

  const updateImagesState = (newImages, pendingUploads = null) => {
    setFormData((prev) => {
      const updates = {
        ...prev,
        image: newImages[0] || '',
        galleryImages: newImages.slice(1),
      };
      if (pendingUploads !== null) {
        updates.pendingUploads = pendingUploads;
      }
      return updates;
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">Showcase Media</h2>
        <p className="text-[11px] text-[var(--admin-text-secondary)]">
          Upload images or paste URLs. The first image acts as the primary cover.
        </p>
      </div>

      <div className="space-y-4">
        {/* URL Paste Box */}
        <div className="p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-xs space-y-3">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
            Paste Image URLs
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="directUrlInput"
              placeholder="Image URL"
              className="flex-1 min-w-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-3 h-9 text-[12px] outline-none focus:border-[var(--admin-accent)] transition-all"
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('directUrlInput');
                if (input.value) {
                  const inputUrl = input.value.trim();

                  const combinedImages = [...images, inputUrl];
                  const limitedImages = combinedImages.slice(0, 4);

                  if (combinedImages.length > 4) {
                    toast.error('Maximum 4 images allowed. Only the first 4 were kept.');
                  }

                  const pendingUrlObj = {
                    localUrl: inputUrl,
                    file: inputUrl, // String, distinguished from File object
                  };

                  const previousPending = formData.pendingUploads || [];
                  updateImagesState(limitedImages, [...previousPending, pendingUrlObj]);

                  toast.success('Image URL added locally! Will upload on publish.');
                  input.value = '';
                }
              }}
              className="shrink-0 bg-[var(--admin-accent)] text-white hover:opacity-95 px-4 h-9 rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center shadow-xs"
            >
              Add URL
            </button>
          </div>
        </div>

        {/* Multi Upload Box */}
        <div className="p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-xs space-y-3">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider flex justify-between items-center">
            <span>Upload Files</span>
            {isCompressing && (
              <span className="text-[var(--admin-accent)] text-[11px] animate-pulse">
                Uploading...
              </span>
            )}
          </label>
          <input
            type="file"
            multiple
            accept="image/*,.heic,.heif"
            onChange={async (e) => {
              const rawFiles = Array.from(e.target.files);
              if (rawFiles.length === 0) return;
              setIsCompressing(true);
              setCompressionProgress(0);
              setCompressionStats([]);
              try {
                const newStats = [];
                const localImages = [];
                const newPendingUploads = [];

                for (let i = 0; i < rawFiles.length; i++) {
                  const file = rawFiles[i];
                  // Compress image first to get the optimized File object
                  const optimizedFile = await compressImage(file);

                  newStats.push({
                    name: file.name,
                    originalSize: formatBytes(file.size),
                    optimizedSize: formatBytes(optimizedFile.size),
                    reduction:
                      file.size > 0 ? ((1 - optimizedFile.size / file.size) * 100).toFixed(1) : 0,
                  });

                  // Generate a local blob URL for preview instead of uploading immediately
                  const localUrl = URL.createObjectURL(optimizedFile);
                  localImages.push(localUrl);

                  // Store the file to be uploaded later
                  newPendingUploads.push({
                    localUrl,
                    file: optimizedFile,
                  });
                }

                setCompressionStats(newStats);
                setCompressionProgress(100);

                const combinedImages = [...images, ...localImages];
                const limitedImages = combinedImages.slice(0, 4);

                if (combinedImages.length > 4) {
                  toast.error('Maximum 4 images allowed. Only the first 4 were kept.');
                }

                // Keep track of which pending uploads are actually in the limited images
                const validPendingUploads = newPendingUploads.filter((p) =>
                  limitedImages.includes(p.localUrl),
                );
                const previousPending = formData.pendingUploads || [];
                updateImagesState(limitedImages, [...previousPending, ...validPendingUploads]);
                toast.success(`Photos selected and ready to upload!`);
              } catch (err) {
                toast.error('Failed to process images: ' + err.message);
              } finally {
                setTimeout(() => {
                  setIsCompressing(false);
                  setCompressionProgress(0);
                  setCompressionStats([]);
                }, 1000);
              }
            }}
            className="w-full text-[11px] text-[var(--admin-text-secondary)] file:mr-4 file:py-1.5 file:px-3 file:rounded-[3px] file:border-0 file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:bg-[var(--admin-accent)] file:text-white hover:file:bg-[var(--admin-accent-hover)] cursor-pointer shadow-xs border border-[var(--admin-border)] rounded-[4px] p-2 bg-[var(--admin-surface)] focus:border-[var(--admin-accent)] focus:outline-none transition-all"
          />
        </div>

        {/* Gallery Grid */}
        {images.length > 0 && (
          <div className="pt-2">
            <h4 className="text-[11px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider mb-3">
              Media Gallery ({images.length}/4)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', idx.toString());
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    const toIdx = idx;
                    if (fromIdx === toIdx || isNaN(fromIdx)) return;

                    const newImages = [...images];
                    const [movedItem] = newImages.splice(fromIdx, 1);
                    newImages.splice(toIdx, 0, movedItem);
                    updateImagesState(newImages);
                    toast.success('Images reordered');
                  }}
                  className={`relative aspect-square rounded-[4px] overflow-hidden border cursor-grab active:cursor-grabbing ${idx === 0 ? 'border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/30' : 'border-[var(--admin-border)]'} group shadow-xs`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="Gallery" />
                  {idx === 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-[var(--admin-accent)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] shadow-xs z-10 pointer-events-none uppercase tracking-wider">
                      Primary
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = [...images];
                          const [movedItem] = newImages.splice(idx, 1);
                          newImages.unshift(movedItem);
                          updateImagesState(newImages);
                          toast.success('Updated primary cover image');
                        }}
                        className="!w-10 !h-10 !p-0 !min-w-0 !min-h-0 shrink-0 aspect-square bg-[var(--admin-surface)] text-[var(--admin-accent)] rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                        title="Make Primary"
                      >
                        <span className="material-symbols-outlined text-[18px]">star</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = images.filter((_, i) => i !== idx);
                        updateImagesState(newImages);
                      }}
                      className="!w-10 !h-10 !p-0 !min-w-0 !min-h-0 shrink-0 aspect-square bg-[var(--admin-error)] text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
