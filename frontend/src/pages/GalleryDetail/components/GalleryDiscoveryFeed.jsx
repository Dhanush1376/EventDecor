import React from 'react';
import { Link } from 'react-router-dom';
import { GalleryCard } from '../../../components/gallery/GalleryCard';
import { MandalaArtDecor } from '../../../components/ui/MandalaArtDecor';

export function GalleryDiscoveryFeed({ moreLikeThis }) {
  if (!moreLikeThis || moreLikeThis.length === 0) return null;

  return (
    <section className="mt-6 lg:mt-12 pt-6 lg:pt-12 relative px-5 lg:px-0">
      {/* Minimal Floral Line Divider */}
      <div className="w-full flex justify-center mb-10 lg:mb-14">
        <div className="w-full max-w-[180px] flex items-center justify-center gap-3 opacity-60">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#C4A87C] to-[#C4A87C]" />
          <span
            className="material-symbols-outlined text-[16px] text-[#C4A87C]"
            style={{ fontVariationSettings: "'wght' 300" }}
          >
            local_florist
          </span>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#C4A87C] to-[#C4A87C]" />
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-8 lg:mb-10">
        <div>
          <span className="font-label text-[9px] uppercase tracking-[0.35em] text-primary font-bold block mb-2">
            Keep Exploring
          </span>
          <h2 className="font-display text-[22px] lg:text-[28px] text-black font-bold tracking-tight">
            More Like This
          </h2>
        </div>
        <Link
          to="/gallery"
          className="hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/10 text-black/50 hover:border-primary hover:text-primary transition-all text-[10px] uppercase tracking-[0.2em] font-bold"
        >
          View All
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>

      {/* Masonry Grid — reuse the polished GalleryCard component */}
      <div className="columns-2 md:columns-3 xl:columns-4 gap-3 lg:gap-4 [column-fill:_balance]">
        {moreLikeThis.map((sim) => (
          <GalleryCard key={sim._id || sim.id} item={sim} />
        ))}
      </div>

      {/* Mobile "View All" */}
      <div className="lg:hidden flex justify-center mt-8">
        <Link
          to="/gallery"
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg active:scale-95 transition-transform"
        >
          Explore Full Gallery
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>

      {/* Bottom Mandala */}
      <MandalaArtDecor
        variant={1}
        size={400}
        className="-bottom-32 -left-32 hidden lg:block z-0"
        opacity={0.06}
        spinDuration={250}
      />
    </section>
  );
}
