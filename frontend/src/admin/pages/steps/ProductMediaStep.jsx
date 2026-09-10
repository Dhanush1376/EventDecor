import React from 'react';
import { compressImage, formatBytes } from '../../../utils/media/imageCompressor';
import toast from 'react-hot-toast';

export function ProductMediaStep({
  formData,
  setFormData,
  isCompressing,
  setIsCompressing,
  compressionProgress,
  setCompressionProgress,
  compressionStats,
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
        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] space-y-3">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-widest">
            Paste Image URLs
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="directUrlInput"
              placeholder="Image URL"
              className="flex-1 min-w-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] px-3 h-9 text-[12.5px] outline-none focus:border-[var(--admin-accent)]"
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('directUrlInput');
                if (input.value) {
                  const inputUrl = input.value.trim();

                  setFormData((prev) => {
                    const combinedImages = [...(prev.images || []), inputUrl];
                    const limitedImages = combinedImages.slice(0, 4);

                    if (combinedImages.length > 4) {
                      toast.error('Maximum 4 images allowed. Only the first 4 were kept.');
                    }

                    const pendingUrlObj = {
                      localUrl: inputUrl,
                      file: inputUrl, // String, distinguished from File object
                    };

                    const previousPending = prev.pendingUploads || [];

                    return {
                      ...prev,
                      images: limitedImages,
                      imageSrc: limitedImages[0] || '',
                      pendingUploads: [...previousPending, pendingUrlObj],
                    };
                  });
                  toast.success('Image URL added locally! Will upload on publish.');
                  input.value = '';
                }
              }}
              className="shrink-0 bg-[var(--admin-accent)] text-white hover:opacity-95 px-4 h-9 rounded-[4px] text-[12px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer whitespace-nowrap shadow-xs"
            >
              Add URL
            </button>
          </div>
        </div>

        {/* Multi Upload Box */}
        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[4px] space-y-3">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-widest flex justify-between items-center">
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
                const pendingUploads = [];

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
                  pendingUploads.push({
                    localUrl,
                    file: optimizedFile,
                  });
                }

                setCompressionStats(newStats);
                setCompressionProgress(100);

                // Update form data with the local previews and pending files
                setFormData((prev) => {
                  const combinedImages = [...(prev.images || []), ...localImages];
                  const limitedImages = combinedImages.slice(0, 4);

                  if (combinedImages.length > 4) {
                    toast.error('Maximum 4 images allowed. Only the first 4 were kept.');
                  }

                  // Keep track of which pending uploads are actually in the limited images
                  const validPendingUploads = pendingUploads.filter((p) =>
                    limitedImages.includes(p.localUrl),
                  );
                  const previousPending = prev.pendingUploads || [];

                  return {
                    ...prev,
                    images: limitedImages,
                    imageSrc: limitedImages[0] || '',
                    pendingUploads: [...previousPending, ...validPendingUploads],
                  };
                });
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
            className="w-full text-[11px] text-[var(--admin-text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-[3px] file:border-0 file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:bg-[var(--admin-accent)] file:text-white hover:file:opacity-95 cursor-pointer shadow-xs border border-[var(--admin-border)] rounded-[4px] p-2 bg-[var(--admin-surface)] focus:border-[var(--admin-accent)] focus:outline-none transition-all"
          />
        </div>

        {/* Gallery Grid */}
        {formData.images.length > 0 && (
          <div className="pt-2">
            <h4 className="text-[11px] font-bold text-[var(--admin-text-primary)] uppercase tracking-widest mb-3">
              Media Gallery ({formData.images.length}/4)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {formData.images.map((img, idx) => (
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
                    setFormData((prev) => {
                      const newImages = [...prev.images];
                      const [movedItem] = newImages.splice(fromIdx, 1);
                      newImages.splice(toIdx, 0, movedItem);
                      return {
                        ...prev,
                        images: newImages,
                        imageSrc: newImages[0] || '',
                      };
                    });
                    toast.success('Images reordered');
                  }}
                  className={`relative aspect-square rounded-[4px] overflow-hidden border-2 cursor-grab active:cursor-grabbing ${idx === 0 ? 'border-[var(--admin-accent)]' : 'border-[var(--admin-border)]'} group shadow-xs`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="Gallery" />
                  {idx === 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-[var(--admin-accent)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] shadow-xs z-10 pointer-events-none uppercase tracking-wider">
                      Primary
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => {
                            const newImages = [...prev.images];
                            const [movedItem] = newImages.splice(idx, 1);
                            newImages.unshift(movedItem);
                            return {
                              ...prev,
                              images: newImages,
                              imageSrc: newImages[0],
                            };
                          });
                          toast.success('Updated primary listing image');
                        }}
                        className="!w-8 !h-8 !p-0 !min-w-0 !min-h-0 shrink-0 aspect-square bg-[var(--admin-surface)] text-[var(--admin-accent)] rounded-[4px] flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer"
                        title="Make Primary"
                      >
                        <span className="material-symbols-outlined text-[16px]">star</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => {
                          const newImages = prev.images.filter((_, i) => i !== idx);
                          return {
                            ...prev,
                            images: newImages,
                            imageSrc: newImages[0] || '',
                          };
                        });
                      }}
                      className="!w-8 !h-8 !p-0 !min-w-0 !min-h-0 shrink-0 aspect-square bg-[var(--admin-error)] text-white rounded-[4px] flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
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
