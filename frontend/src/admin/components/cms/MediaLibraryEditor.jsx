import React from 'react';
import { SectionHeader } from '../AdminUIKit';
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
    <div className="admin-card p-6 space-y-6">
      <SectionHeader
        icon="image"
        title="Media Lossless Vault"
        description="Audit dynamic image asset file size weights and retrieve clean Cloudinary reference links"
      />
      <div className="grid grid-cols-1 gap-4.5">
        {mediaFiles.map((f) => (
          <div
            key={f.id}
            className="p-3 bg-[var(--admin-surface)] rounded-2xl border border-[var(--admin-border)] flex items-center justify-between gap-4 shadow-[var(--admin-shadow-xs)] hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-sm)] transition-all duration-300"
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-xl bg-cover bg-center shrink-0 border border-[var(--admin-border-subtle)] shadow-inner"
                style={{ backgroundImage: `url(${f.url})` }}
              />
              <div>
                <span className="text-[11px] sm:text-[11px] font-semibold text-[var(--admin-text-primary)] block truncate max-w-[155px] leading-tight">
                  {f.name}
                </span>
                <span className="text-[11px] text-[var(--admin-text-tertiary)] uppercase tracking-widest font-semibold mt-1 block">
                  optimized png • {f.size}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + f.url);
                toast.success('Copied Link to Clipboard!');
              }}
              className="p-2.5 rounded-full bg-[var(--admin-surface-muted)]/60 border border-[var(--admin-accent)]/20 text-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/15 flex items-center justify-center cursor-pointer shadow-[var(--admin-shadow-xs)] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[13px] block font-bold">link</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
