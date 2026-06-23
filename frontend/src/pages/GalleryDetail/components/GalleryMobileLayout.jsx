import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ShareButton } from '../../../components/ui/ShareButton';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';
import { MandalaArtDecor } from '../../../components/ui/MandalaArtDecor';

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
      <div className="md:hidden flex flex-col bg-white overflow-hidden border-b border-black/5 pb-8 mb-8">
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
              <div className="flex items-center gap-2">
                <span className="font-label text-[9px] uppercase tracking-[0.3em] text-primary font-bold">
                  {item.category}
                </span>
              </div>
              <h2 className="font-display text-[20px] text-black leading-tight font-bold tracking-tight">
                {item.title}.
              </h2>
            </div>

            {/* Connecting Line */}
            <div className="flex-1 h-px bg-primary/20 mx-1 md:mx-2 min-w-[20px]" />

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
                    <span className="material-symbols-outlined text-[14px]">chat</span>
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mobile Floating Bottom Bar ─── */}
      <AnimatePresence>
        {!isScrollingDown && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#F5F5F7]/85 backdrop-blur-[32px] saturate-[180%] border-[0.5px] border-black/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] rounded-full h-[72px] px-2 flex items-center justify-between gap-2 select-none w-[calc(100%-2rem)] max-w-[340px]"
          >
            <button
              onClick={handleWishlistLook}
              className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                isLiked
                  ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] border-[0.5px] border-black/[0.04]'
                  : 'bg-transparent text-[#8E8E93] hover:text-black/60'
              }`}
            >
              <motion.span
                animate={{
                  scale: isLiked ? [1, 1.3, 1] : 1,
                  color: isLiked ? '#ff2d55' : '#8E8E93',
                }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </motion.span>
            </button>
            <button
              onClick={handleShopLook}
              className="flex-1 bg-black text-white h-[60px] rounded-full font-label-sm text-[10px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_4px_12px_rgba(0,0,0,0.15)] mr-1"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              Shop Look
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
