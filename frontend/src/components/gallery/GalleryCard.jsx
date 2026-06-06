import React from 'react';
import { Link } from 'react-router-dom';
import { CloudinaryImage } from '../ui/CloudinaryImage';

const CardContent = React.memo(function CardContent({
  item,
  displayImage,
  itemId,
  linkTo,
  navigate,
  minH,
  eager,
}) {
  return (
    <div
      style={{
        minHeight: minH,
        isolation: 'isolate',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        aspectRatio: item.aspectRatio
          ? typeof item.aspectRatio === 'number'
            ? item.aspectRatio
            : item.aspectRatio.replace(':', '/')
          : 'auto',
      }}
      className="break-inside-avoid mb-2 relative group cursor-pointer rounded-2xl overflow-hidden bg-surface-container-low shadow-sm transition-all duration-700 w-full"
    >
      {/* Background Video — plays on hover via CSS opacity */}
      {item.video && (
        <video
          src={item.video}
          muted
          loop
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10 pointer-events-none rounded-[inherit]"
        />
      )}

      {/* Background Image — natural height, no forced aspect ratio */}
      <CloudinaryImage
        src={displayImage}
        alt={item.altText || item.title}
        className={`w-full h-auto block transition-transform duration-[1.5s] ease-out group-hover:scale-105 ${item.video ? 'group-hover:opacity-0 transition-opacity duration-700' : ''}`}
        containerClassName="w-full"
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        width={item.imageWidth || 600}
        height={item.imageHeight || 800}
        aspectRatio="auto"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        skipObserver={true}
      />

      {/* Heritage Floating Circle Badges - Hidden on Mobile to declutter */}
      <div className="absolute top-3 left-3 right-3 hidden md:flex justify-between items-start z-10">
        <div className="flex flex-col gap-2">
          {/* Shop Circle */}
          {item.linkedProducts?.length > 0 && (
            <div className="relative group/shop flex items-center">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-primary/95 backdrop-blur-md text-white rounded-full shadow-lg border border-white/10 flex items-center justify-center transform transition-all duration-500 hover:scale-110 cursor-pointer">
                <span className="material-symbols-outlined text-[14px] md:text-[16px]">
                  shopping_bag
                </span>
              </div>
              <span className="ml-2 md:ml-3 md:absolute md:left-full md:top-1/2 md:-translate-y-1/2 px-2 md:px-3 py-1 md:py-1.5 bg-primary/90 md:bg-primary text-white text-[8px] md:text-[9px] uppercase tracking-[0.15em] md:tracking-[0.2em] rounded-full opacity-100 md:opacity-0 md:group-hover/shop:opacity-100 transition-all duration-300 whitespace-nowrap font-bold shadow-xl backdrop-blur-md border border-white/10">
                Shop look
              </span>
            </div>
          )}
        </div>

        {/* Type Badge / Video Badge */}
        <div className="flex flex-col items-end gap-1.5">
          <div
            className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[8px] uppercase tracking-widest font-extrabold shadow-lg ${
              item.type === 'real-event'
                ? 'bg-[#C4A87C] text-white border-[#C4A87C]/30'
                : 'bg-stone-900/90 text-white border-white/20'
            }`}
          >
            {item.type === 'real-event' ? 'Real Event' : 'Inspiration'}
          </div>
          {item.video && (
            <div className="px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 bg-amber-600/90 text-white text-[8px] uppercase tracking-widest font-extrabold shadow-lg flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]">play_circle</span>
              Video
            </div>
          )}
        </div>
      </div>

      {/* Luxury Immersive Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 flex flex-col justify-end p-5 @[400px]:p-10">
        <div className="transform translate-y-6 group-hover:translate-y-0 transition-transform duration-700 ease-out">
          {/* Bilingual Title Stack */}
          <div className="mb-3">
            {item.teluguTitle && (
              <span className="block font-label text-[11px] text-white/60 mb-0.5 tracking-wider uppercase font-bold animate-fade-in-up">
                {item.teluguTitle}
              </span>
            )}
            <h3 className="font-display text-[20px] @[400px]:text-[32px] text-white leading-tight font-bold">
              {item.title}
            </h3>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-white/80 font-label text-[10px] uppercase tracking-[0.2em] font-bold">
              {item.style}
            </span>
            <div className="w-1 h-1 rounded-full bg-primary" />
            <span className="text-white/40 font-label text-[9px] uppercase tracking-widest font-bold">
              {item.event}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-white/70 font-body text-[11px] font-light leading-relaxed line-clamp-2 max-w-[240px]">
              {item.description}
            </p>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (itemId && navigate) navigate(linkTo);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (itemId && navigate) navigate(linkTo);
                }
              }}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:bg-primary hover:text-white focus:outline-none focus:ring-0 transition-all duration-300 flex-shrink-0"
              aria-label={`View ${item.title}`}
            >
              <span className="material-symbols-outlined text-[18px] font-bold">arrow_outward</span>
            </span>
          </div>

          <div className="h-[1px] w-0 bg-primary/40 mt-6 transition-all duration-1000 group-hover:w-full" />
        </div>
      </div>

      {/* Subtle Marble Texture Overlay on Hover */}
      <div className="absolute inset-0 bg-marble opacity-0 group-hover:opacity-[0.05] transition-opacity pointer-events-none mix-blend-overlay" />
    </div>
  );
});

export const GalleryCard = React.memo(
  function GalleryCard({ item, onImageClick, minH, eager, navigate }) {
    const itemId = item._id || item.id;
    const linkTo = `/gallery/${itemId}`;
    const displayImage = item.image || item.imageSrc;

    if (!itemId) {
      return (
        <div className="block">
          <CardContent
            item={item}
            displayImage={displayImage}
            itemId={itemId}
            linkTo={linkTo}
            navigate={navigate}
            minH={minH}
            eager={eager}
          />
        </div>
      );
    }

    if (onImageClick) {
      return (
        <div onClick={onImageClick} className="block">
          <CardContent
            item={item}
            displayImage={displayImage}
            itemId={itemId}
            linkTo={linkTo}
            navigate={navigate}
            minH={minH}
            eager={eager}
          />
        </div>
      );
    }

    return (
      <Link to={linkTo} className="block">
        <CardContent
          item={item}
          displayImage={displayImage}
          itemId={itemId}
          linkTo={linkTo}
          navigate={navigate}
          minH={minH}
          eager={eager}
        />
      </Link>
    );
  },
  (prevProps, nextProps) => {
    return (
      (prevProps.item._id || prevProps.item.id) === (nextProps.item._id || nextProps.item.id) &&
      (prevProps.item.image || prevProps.item.imageSrc) ===
        (nextProps.item.image || nextProps.item.imageSrc) &&
      prevProps.minH === nextProps.minH &&
      prevProps.eager === nextProps.eager &&
      prevProps.onImageClick === nextProps.onImageClick
    );
  },
);
