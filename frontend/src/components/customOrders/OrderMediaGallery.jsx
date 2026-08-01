import { Link } from 'lucide-react';
import React from 'react';
import { OptimizedImage } from '../ui/OptimizedImage';

export function OrderMediaGallery({ selectedOrder, isDirectImageUrl }) {
  if (!selectedOrder?.inspirationImages?.length) return null;

  return (
    <div className="bg-[var(--color-surface-ivory)] p-4 rounded-2xl border border-black/5 space-y-3">
      <span className="text-[9px] font-bold uppercase tracking-wider text-[#685C57] block">
        My Inspirations ({selectedOrder.inspirationImages.length}):
      </span>

      {/* Direct photos previews */}
      {selectedOrder.inspirationImages.filter(isDirectImageUrl).length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {selectedOrder.inspirationImages.filter(isDirectImageUrl).map((img, i) => (
            <a
              key={img}
              href={img}
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square rounded-lg overflow-hidden border border-black/5"
            >
              <OptimizedImage src={img} alt="Thumb" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}

      {/* External reference pasted links */}
      {selectedOrder.inspirationImages.filter((url) => !isDirectImageUrl(url)).length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-black/5">
          {selectedOrder.inspirationImages
            .filter((url) => !isDirectImageUrl(url))
            .map((link, i) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10.5px] font-bold text-[var(--color-gold)] hover:underline flex items-center gap-1 min-w-0"
              >
                <Link className="text-[13px] shrink-0" strokeWidth={1.5} />
                <span className="truncate">{link}</span>
              </a>
            ))}
        </div>
      )}
    </div>
  );
}
