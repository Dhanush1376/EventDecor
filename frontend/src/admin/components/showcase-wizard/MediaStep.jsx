import React from 'react';
import toast from 'react-hot-toast';
import { compressImage, formatBytes } from '../../../utils/media/imageCompressor';

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
              id="showcaseDirectUrlInput"
              placeholder="Image URL"
              className="flex-1 min-w-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[11px] outline-none focus:border-[var(--admin-accent)]/40"
            />
            <button
              type="button"
              onClick={async () => {
                const input = document.getElementById('showcaseDirectUrlInput');
                if (input.value) {
                  const inputUrl = input.value.trim();

                  setFormData((prev) => {
                    const updates = { ...prev };

                    // Add to pendingUploads as a remote URL string
                    const pendingUrlObj = {
                      localUrl: inputUrl,
                      file: inputUrl,
                    };
                    updates.pendingUploads = [...(prev.pendingUploads || []), pendingUrlObj];

                    // Set preview logic
                    if (!updates.image) {
                      updates.image = inputUrl;
                    } else {
                      const newGallery = [...(updates.galleryImages || ['', ''])];
                      const emptySlot = newGallery.findIndex((url) => !url);
                      if (emptySlot !== -1) {
                        newGallery[emptySlot] = inputUrl;
                      } else {
                        newGallery.push(inputUrl);
                      }
                      updates.galleryImages = newGallery;
                    }

                    return updates;
                  });

                  toast.success('Image URL added! Will upload on publish.');
                  input.value = '';
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
            multiple
            accept="image/*"
            onChange={async (e) => {
              const rawFiles = Array.from(e.target.files);
              if (rawFiles.length === 0) return;
              setIsCompressing(true);
              setCompressionProgress(0);
              setCompressionStats([]);
              try {
                const newStats = [];
                const localImages = [];
                const newPending = [];

                for (let i = 0; i < rawFiles.length; i++) {
                  const file = rawFiles[i];
                  const optimizedFile = await compressImage(file);

                  newStats.push({
                    name: file.name,
                    originalSize: formatBytes(file.size),
                    optimizedSize: formatBytes(optimizedFile.size),
                    reduction:
                      file.size > 0 ? ((1 - optimizedFile.size / file.size) * 100).toFixed(1) : 0,
                  });

                  // Create local preview URL
                  const localUrl = URL.createObjectURL(optimizedFile);
                  localImages.push(localUrl);
                  newPending.push({ file: optimizedFile, localUrl });
                }

                setCompressionStats(newStats);

                setFormData((prev) => {
                  const updates = { ...prev };
                  updates.pendingUploads = [...(prev.pendingUploads || []), ...newPending];

                  let imgIdx = 0;
                  if (!updates.image) {
                    updates.image = localImages[imgIdx++];
                  }
                  const newGallery = [...(updates.galleryImages || ['', ''])];
                  while (imgIdx < localImages.length) {
                    const emptySlot = newGallery.findIndex((url) => !url);
                    if (emptySlot !== -1) {
                      newGallery[emptySlot] = localImages[imgIdx];
                    } else {
                      newGallery.push(localImages[imgIdx]); // append if full
                    }
                    imgIdx++;
                  }
                  updates.galleryImages = newGallery;
                  return updates;
                });
                toast.success(`Media preview added locally. Will upload on publish.`);
              } catch (err) {
                toast.error('Failed to process image locally.');
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
        {(formData.image || (formData.galleryImages && formData.galleryImages.some(Boolean))) && (
          <div className="pt-2">
            <h4 className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)] uppercase tracking-widest mb-3">
              Media Gallery
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* Primary Image */}
              {formData.image && (
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-[var(--admin-accent)] group">
                  <img
                    src={formData.image}
                    className="w-full h-full object-cover"
                    alt="Primary Gallery"
                  />
                  <div className="absolute top-1 left-1 bg-[var(--admin-accent)] text-white text-[11px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none">
                    Primary
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                      className="w-8 h-8 rounded-full bg-[var(--admin-error)] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                      title="Delete Primary Image"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              )}
              {/* Gallery Images */}
              {formData.galleryImages &&
                formData.galleryImages.map((img, idx) =>
                  img ? (
                    <div
                      key={`gallery-${idx}`}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-[var(--admin-border)] group"
                    >
                      <img src={img} className="w-full h-full object-cover" alt="Gallery" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => {
                              const newImage = img;
                              const oldImage = prev.image;
                              const newGallery = [...prev.galleryImages];
                              newGallery[idx] = oldImage || ''; // swap or just push down
                              return { ...prev, image: newImage, galleryImages: newGallery };
                            });
                          }}
                          className="w-8 h-8 rounded-full bg-[var(--admin-surface)] text-[var(--admin-accent)] flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                          title="Make Primary"
                        >
                          <span className="material-symbols-outlined text-[16px]">star</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => {
                              const newGallery = [...prev.galleryImages];
                              newGallery[idx] = ''; // clear it
                              return { ...prev, galleryImages: newGallery };
                            });
                          }}
                          className="w-8 h-8 rounded-full bg-[var(--admin-error)] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                          title="Delete Image"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ) : null,
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
