import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ShareButton } from '../../../components/ui/ShareButton';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';
import { MandalaArtDecor } from '../../../components/ui/MandalaArtDecor';
import { ProductNoteCard } from '../../../components/ui/ProductNoteCard';
import { WhatsAppIcon } from '../../../components/ui/WhatsAppIcon';

export function GalleryMobileLayout({
  item,
  pageUrl,
  isLiked,
  isScrollingDown,
  handleShopLook,
  handleWishlistLook,
  navigate,
}) {
  return (
    <>
      <div className="md:hidden lg:hidden flex flex-col bg-white overflow-hidden border-b border-black/5 pb-8 mb-8">
        {/* Image/Video Section */}
        <div className="w-full relative bg-[#f9f8f6]">
          {item.video ? (
            <video
              src={item.video}
              controls
              muted
              playsInline
              preload="none"
              className="w-full h-auto object-cover max-h-[85vh] mx-auto block"
              poster={item.image}
            />
          ) : (
            <CloudinaryImage
              src={item.image}
              alt={item.title}
              className="w-full h-auto object-contain max-h-[85vh] mx-auto block"
              containerClassName="w-full h-auto max-h-[85vh] mx-auto block"
              aspectRatio="auto"
              loading="eager"
              eager={true}
              width={1200}
              height={800}
              sizes="100vw"
            />
          )}

          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-10 w-9 h-9 min-h-0 p-0 aspect-square shrink-0 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-95 text-black cursor-pointer"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-[18px] font-bold">arrow_back</span>
          </button>

          {/* Actions */}
          <div className="flex items-center justify-center absolute top-4 right-4 z-10 gap-2">
            <button
              onClick={handleWishlistLook}
              className="w-9 h-9 min-h-0 p-0 aspect-square shrink-0 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-[0.96]"
            >
              <motion.span
                animate={{
                  scale: isLiked ? [1, 1.3, 1] : 1,
                  color: isLiked ? '#ff2d55' : '#1a1817',
                }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </motion.span>
            </button>
            <ShareButton
              url={pageUrl}
              title={item.title}
              description={item.description}
              variant="custom"
              size="custom"
              iconOnly={true}
              className="w-9 h-9 min-h-0 p-0 aspect-square shrink-0 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg text-black"
            />
          </div>
        </div>

        {/* Info Section */}
        <div className="w-full p-6 bg-gradient-to-b from-primary/10 via-[#fdfbf7] to-white relative overflow-hidden">
          {/* Aesthetic Mobile Mandala */}
          <MandalaArtDecor
            variant={1}
            size={350}
            className="-top-16 -left-16 absolute pointer-events-none"
            opacity={0.15}
            spinDuration={200}
          />
          <div className="flex items-center justify-between gap-2 mb-8 relative z-10">
            <div className="space-y-1 flex-shrink max-w-[50%]">
              <div className="flex items-center gap-2">{/* Category hidden per request */}</div>
              <h2 className="font-display text-[20px] text-black leading-tight font-bold tracking-tight">
                {item.title}.
              </h2>
              {item.teluguTitle && (
                <p className="font-body text-[13px] text-black/40 font-medium">
                  {item.teluguTitle}
                </p>
              )}
              <div className="mt-3">
                <ProductNoteCard
                  customerNote={item.customerNote}
                  complimentaryGift={item.complimentaryGift}
                />
              </div>
            </div>

            {/* Connecting Line */}
            <div className="flex-1 h-px bg-primary/20 mx-1 lg:mx-2 min-w-[20px]" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleShopLook}
                className="bg-primary text-white h-11 px-5 rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                <span className="hidden sm:inline">Shop look</span>
                <span className="sm:hidden text-[9px]">Shop</span>
              </button>
            </div>
          </div>

          <div className="space-y-6 pt-8 mt-6 border-t border-black/5">
            <div className="relative p-6 bg-[#fcfbf9] rounded-[28px] border border-black/5">
              <span className="material-symbols-outlined absolute -top-3 -left-3 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-md border-4 border-white text-[12px]">
                format_quote
              </span>
              <p className="font-body text-[15px] text-black/80 font-medium leading-relaxed mb-4">
                {item.description}
              </p>
              <p className="font-body text-black/40 leading-relaxed text-[12px] font-medium">
                {item.story}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#2A2825] text-white relative overflow-hidden shadow-lg border border-white/5">
              <div className="relative z-10 flex flex-col items-center text-center gap-5">
                <div>
                  <h4 className="font-headline-sm mb-1 text-[#C4A87C] font-normal tracking-wide">
                    Need a Custom Theme?
                  </h4>
                  <p className="font-body-sm text-white/90 font-medium">
                    Personalize this setup to perfectly match your vision.
                  </p>
                </div>
                <div className="flex flex-row gap-2 w-full">
                  <button
                    onClick={() => navigate(`/custom-orders?gallery=${item._id || item.id}`)}
                    className="bg-white text-black flex-1 px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-stone-200 transition-all whitespace-nowrap font-bold shadow-sm flex items-center justify-center"
                  >
                    Customize
                  </button>
                  <button
                    onClick={() => {
                      if (!item) return;
                      const num = '919866006648';
                      const link = `${window.location.origin}/gallery/${item._id || item.id}`;
                      const msg = encodeURIComponent(
                        `Hello, I'm interested in this gallery setup and would like to chat about it.\n\nLink: ${link}`,
                      );
                      window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
                    }}
                    className="bg-transparent border border-white/30 flex-1 text-white px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-white/10 transition-all whitespace-nowrap font-bold flex items-center justify-center gap-1.5"
                  >
                    <WhatsAppIcon className="w-[14px] h-[14px]" />
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mobile Full-Width Sticky Bottom Bar ─── */}
      <AnimatePresence>
        {!isScrollingDown && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="md:hidden lg:hidden fixed bottom-0 left-0 w-full h-[calc(72px+env(safe-area-inset-bottom,0px))] lg:h-[80px] z-[100] bg-white/95 backdrop-blur-xl border-t border-outline-variant/15 px-6 pb-[env(safe-area-inset-bottom,0px)] flex items-center justify-between gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] select-none"
          >
            <div className="flex flex-col truncate max-w-[50%]">
              <span className="font-label text-[8px] uppercase tracking-[0.25em] text-stone-500 font-bold leading-none">
                Gallery Showcase
              </span>
              <p className="font-display text-[18px] text-black font-medium leading-none mt-1.5 truncate">
                {item.title}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleWishlistLook}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-[0.96] shrink-0 border-none cursor-pointer ${
                  isLiked
                    ? 'bg-red-50 text-red-500'
                    : 'bg-stone-50 text-stone-500 border border-black/5'
                }`}
                aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <motion.span
                  animate={{
                    scale: isLiked ? [1, 1.3, 1] : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
                >
                  favorite
                </motion.span>
              </button>

              <button
                type="button"
                onClick={handleShopLook}
                className="bg-black text-white h-10 px-5 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-lg active:scale-[0.96] transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">shopping_bag</span>
                <span>Shop Look</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
