import React from 'react';
import { uploadService } from '../../../services/domainServices';
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
        <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-widest">
            Paste Image URLs
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="directUrlInput"
              placeholder="Image URL"
              className="flex-1 min-w-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[11px] outline-none focus:border-[var(--admin-accent)]/40"
            />
            <button
              type="button"
              onClick={async () => {
                const input = document.getElementById('directUrlInput');
                if (input.value) {
                  setIsCompressing(true);
                  try {
                    const uploadData = new FormData();
                    uploadData.append('urls', input.value);
                    const res = await uploadService.uploadImages(uploadData, 'products');
                    if (res.success && res.images) {
                      setFormData((prev) => {
                        const combined = [...prev.images, ...res.images];
                        if (combined.length > 4) {
                          toast.error('Maximum 4 images allowed. Only the first 4 were kept.');
                        }
                        const limitedImages = combined.slice(0, 4);
                        return {
                          ...prev,
                          images: limitedImages,
                          imageSrc: limitedImages[0] || '',
                        };
                      });
                      toast.success('Image fetched & optimized!');
                      input.value = '';
                    }
                  } catch (_err) {
                    toast.error('Failed to upload from URL');
                  } finally {
                    setIsCompressing(false);
                  }
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

                const res = await uploadService.uploadImages(uploadData, 'products', onProgress);
                if (res.success && res.images) {
                  setFormData((prev) => {
                    const combined = [...prev.images, ...res.images];
                    if (combined.length > 4) {
                      toast.error('Maximum 4 images allowed. Only the first 4 were kept.');
                    }
                    const limitedImages = combined.slice(0, 4);
                    return {
                      ...prev,
                      images: limitedImages,
                      imageSrc: limitedImages[0] || '',
                    };
                  });
                  toast.success(`Photos uploaded successfully!`);
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

        {/* Gallery Grid */}
        {formData.images.length > 0 && (
          <div className="pt-2">
            <h4 className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)] uppercase tracking-widest mb-3">
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
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing ${idx === 0 ? 'border-[var(--admin-accent)]' : 'border-[var(--admin-border)]'} group`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="Gallery" />
                  {idx === 0 && (
                    <div className="absolute top-1 left-1 bg-[var(--admin-accent)] text-white text-[11px] sm:text-[11px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none">
                      Primary
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
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
                        className="!w-10 !h-10 !p-0 !min-w-0 !min-h-0 shrink-0 aspect-square bg-[var(--admin-surface)] text-[var(--admin-accent)] rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                        title="Make Primary"
                      >
                        <span className="material-symbols-outlined text-[18px]">star</span>
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
