import React, { useState } from 'react';
import { formatCurrency } from '../AdminUIKit';

export function GalleryItemLivePreview({ item = {}, products = [] }) {
  const [previewMode, setPreviewMode] = useState('card'); // 'card' or 'detail'
  const [isCardHovered, setIsCardHovered] = useState(false);

  const linkedProductDocs = (item.linkedProducts || [])
    .map((lpId) => products.find((p) => (p._id || p.id) === lpId))
    .filter(Boolean);

  const tagsList =
    typeof item.tags === 'string'
      ? item.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : Array.isArray(item.tags)
        ? item.tags
        : [];

  return (
    <div className="space-y-3 bg-[var(--admin-surface)] p-3.5 sm:p-4 rounded-[10px] border border-[var(--admin-border)] shadow-xs">
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--admin-border)] pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="material-symbols-outlined text-[16px] text-[var(--admin-accent)] shrink-0">
            visibility
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)] truncate">
            Live Preview
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[var(--admin-surface-muted)] p-0.5 rounded-[5px] border border-[var(--admin-border)] shrink-0">
          <button
            type="button"
            onClick={() => setPreviewMode('card')}
            className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              previewMode === 'card'
                ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-2xs border border-[var(--admin-border)]'
                : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            Card
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('detail')}
            className={`px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              previewMode === 'detail'
                ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-2xs border border-[var(--admin-border)]'
                : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
            }`}
          >
            Detail
          </button>
        </div>
      </div>

      {/* ─── 1. GRID CARD PREVIEW ─── */}
      {previewMode === 'card' && (
        <div className="flex flex-col items-center justify-center py-2">
          <p className="text-[10px] text-[var(--admin-text-tertiary)] italic mb-2.5 text-center">
            Hover over card to preview video walkthrough reel auto-play
          </p>

          <div
            onMouseEnter={() => setIsCardHovered(true)}
            onMouseLeave={() => setIsCardHovered(false)}
            className="w-full max-w-[260px] sm:max-w-[280px] bg-[var(--admin-surface)] rounded-xl overflow-hidden shadow-md border border-[var(--admin-border)] transition-all transform hover:-translate-y-1"
          >
            {/* Media Area */}
            <div className="relative aspect-[3/4] bg-stone-100 dark:bg-stone-900 overflow-hidden flex items-center justify-center">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title || 'Preview'}
                  className={`w-full h-full object-cover transition-opacity duration-500 ${
                    item.video && isCardHovered ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 dark:text-stone-600 p-4 text-center bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-950">
                  <span className="material-symbols-outlined text-[32px] mb-1.5 opacity-60">
                    photo_camera
                  </span>
                  <span className="text-[11px] font-medium">Upload photo to preview card</span>
                </div>
              )}

              {/* Video Element (Plays when hovered) */}
              {item.video && (
                <video
                  src={item.video}
                  autoPlay={isCardHovered}
                  muted
                  loop
                  playsInline
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none ${
                    isCardHovered ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}

              {/* Video Reel Badge */}
              {item.video && (
                <div className="absolute top-2.5 right-2.5 z-10">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-black/75 backdrop-blur-md text-white border border-white/20 flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[11px] text-amber-400">
                      play_circle
                    </span>
                    REEL
                  </span>
                </div>
              )}

              {/* Category & Event Badges */}
              <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/90 dark:bg-stone-900/90 backdrop-blur-md text-stone-800 dark:text-stone-200 shadow-xs border border-black/5">
                  {item.category || 'General'}
                </span>
                {item.event && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[var(--admin-accent)] text-white shadow-xs">
                    {item.event}
                  </span>
                )}
              </div>
            </div>

            {/* Card Content Body */}
            <div className="p-3 space-y-1 text-left">
              <h4 className="font-bold text-[13px] text-[var(--admin-text-primary)] truncate">
                {item.title || 'Untitled Showcase'}
              </h4>
              {item.teluguTitle && (
                <p className="text-[11px] text-[var(--admin-accent)] font-medium truncate">
                  {item.teluguTitle}
                </p>
              )}
              {item.style && (
                <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                  Style:{' '}
                  <span className="font-semibold text-[var(--admin-text-secondary)]">
                    {item.style}
                  </span>
                </p>
              )}

              {linkedProductDocs.length > 0 && (
                <div className="pt-2 mt-1 border-t border-[var(--admin-border-subtle)] flex items-center gap-1 text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-[13px]">shopping_bag</span>
                  <span>{linkedProductDocs.length} Shoppable Items</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. DETAIL VIEW PREVIEW ─── */}
      {previewMode === 'detail' && (
        <div className="p-3 bg-[var(--admin-surface)] rounded-lg border border-[var(--admin-border)] space-y-3 text-left">
          {/* Media Header */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
            {item.video ? (
              <video src={item.video} controls muted className="w-full h-full object-contain" />
            ) : item.image ? (
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <p className="text-[11px] text-stone-400">Upload media to preview detail view</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border)]">
                {item.category || 'Category'}
              </span>
              {item.event && (
                <span className="px-2 py-0.5 rounded text-[9.5px] font-bold uppercase bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] border border-[var(--admin-accent)]/20">
                  {item.event}
                </span>
              )}
              {item.complimentaryGift?.enabled && (
                <span className="px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[11px]">
                    featured_seasonal_and_gifts
                  </span>
                  {item.complimentaryGift.displayBadge || 'FREE GIFT'}
                </span>
              )}
            </div>

            <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
              {item.title || 'Untitled Showcase'}
            </h3>
            {item.teluguTitle && (
              <p className="text-[11.5px] font-bold text-[var(--admin-accent)] mt-0.5">
                {item.teluguTitle}
              </p>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-[11.5px] text-[var(--admin-text-secondary)] leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Designer Note */}
          {item.customerNote && (
            <div className="p-2.5 rounded bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-accent)] block mb-0.5">
                Designer's Note
              </span>
              <p className="text-[11px] text-[var(--admin-text-secondary)]">{item.customerNote}</p>
            </div>
          )}

          {/* Shoppable Products */}
          {linkedProductDocs.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-[var(--admin-border-subtle)]">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)] block">
                Tagged Products ({linkedProductDocs.length})
              </span>
              <div className="grid grid-cols-2 gap-2">
                {linkedProductDocs.slice(0, 4).map((p) => {
                  const thumb =
                    p.imageSrc ||
                    p.image ||
                    p.images?.[0]?.url ||
                    (typeof p.images?.[0] === 'string' ? p.images[0] : null);
                  return (
                    <div
                      key={p._id || p.id}
                      className="p-1.5 rounded border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] flex items-center gap-1.5"
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="w-7 h-7 rounded object-cover shrink-0 border border-[var(--admin-border-subtle)]"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] flex items-center justify-center text-[var(--admin-text-tertiary)] shrink-0">
                          <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold truncate text-[var(--admin-text-primary)]">
                          {p.title}
                        </p>
                        <p className="text-[9.5px] text-emerald-600 font-bold">
                          {formatCurrency(p.price)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {tagsList.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap pt-2">
              {tagsList.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] border border-[var(--admin-border-subtle)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
