import React from 'react';
import toast from 'react-hot-toast';
import { PLACEHOLDER_IMAGES } from '../../../constants/placeholderImages';

export function MediaLibraryEditor() {
  const mediaFiles = [
    {
      id: 1,
      name: 'temple_style_mandap.png',
      size: '1.4 MB',
      url: PLACEHOLDER_IMAGES.collectionWedding,
    },
    {
      id: 2,
      name: 'luxury_royal_wedding.png',
      size: '2.1 MB',
      url: PLACEHOLDER_IMAGES.mandalaHero,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="p-6 md:p-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-md shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6">
          <span className="material-symbols-outlined text-[150px]">image</span>
        </div>
        <div className="relative z-10 space-y-6">
          <span className="text-[14px] sm:text-[15px] font-semibold text-[var(--admin-text-primary)] tracking-tight block border-b border-[var(--admin-border-subtle)] pb-3 mb-6">
            1. Stored Media Files
          </span>

          <div className="grid grid-cols-1 gap-4">
            {mediaFiles.map((f) => (
              <div
                key={f.id}
                className="p-4 bg-[var(--admin-surface-muted)]/70 hover:bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border-subtle)] flex items-center justify-between gap-4 shadow-2xs hover:border-[var(--admin-border)] transition-all duration-300"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-12 h-12 rounded-md bg-cover bg-center shrink-0 border border-[var(--admin-border-subtle)] shadow-inner"
                    style={{ backgroundImage: `url(${f.url})` }}
                  />
                  <div className="min-w-0">
                    <span className="text-[13px] font-bold text-[var(--admin-text-primary)] block truncate leading-tight">
                      {f.name}
                    </span>
                    <span className="text-[11px] text-[var(--admin-text-tertiary)] uppercase tracking-wider font-semibold mt-1 block">
                      optimized png • {f.size}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + f.url);
                    toast.success('Copied Link to Clipboard!');
                  }}
                  className="h-9 px-3 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[var(--admin-accent)] hover:border-[var(--admin-accent)] flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all shrink-0 text-[12px] font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  <span className="hidden sm:inline">Copy Link</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
