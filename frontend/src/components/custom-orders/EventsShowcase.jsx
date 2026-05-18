import React from "react";
import { motion } from "framer-motion";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";

export function EventsShowcase({
  setActiveVideoModal,
  handleImageError,
  setActiveTab,
  triggerToast,
}) {
  const { digitalStudio, testimonials: globalTestimonials } = useWebsiteContent();
  const videos = digitalStudio?.videos || [];
  const completedEvents = digitalStudio?.completedEvents || [];
  const testimonials = globalTestimonials?.items?.filter(t => t.isVisible) || [];

  const windowVariants = {
    initial: { opacity: 0, x: 30 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      x: -30,
      transition: { duration: 0.25, ease: "easeIn" },
    },
  };

  return (
    <motion.div
      key="window-showcase"
      variants={windowVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-16 relative z-10"
    >
      <div className="text-center max-w-3xl mx-auto">
        <span className="font-label-sm text-[10px] text-primary uppercase tracking-[0.4em] block font-bold mb-1">
          WINDOW 03: ARCHIVES & PROOF
        </span>
        <h2 className="font-headline-md text-black mb-2 font-normal">
          Testimonials & Real Events Showcase
        </h2>
        <p className="font-body-md text-black/60 font-light leading-relaxed">
          We stand by transparent physical assembly. Witness authentic recent
          event setups and cinematic walkthrough video archives.
        </p>
      </div>

      {/* REAL EVENT VIDEO SHOWCASE BLOCK */}
      <div className="space-y-6">
        <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-black/40 font-bold block text-center md:text-left">
          ✦ Real Event Cinematic Walkthroughs
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((vid, vidx) => (
            <div
              key={vidx}
              onClick={() => setActiveVideoModal(vid)}
              className="rounded-[24px] overflow-hidden border border-black/5 bg-white group cursor-pointer shadow-sm hover:shadow-lg transition-all duration-500 relative"
            >
              <div className="aspect-video w-full overflow-hidden relative bg-[#fcfbf9]">
                <img
                  onError={handleImageError}
                  src={vid.thumb}
                  alt={vid.title}
                  className="w-full h-full object-cover filter brightness-[0.8] group-hover:scale-105 transition-transform duration-700"
                />

                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-primary shadow-lg group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[24px] pl-0.5">
                      play_arrow
                    </span>
                  </div>
                </div>

                <span className="absolute bottom-2 right-2 bg-black/80 text-white font-mono text-[9px] px-2 py-0.5 rounded font-bold">
                  {vid.duration}
                </span>
              </div>

              <div className="p-4">
                <span className="font-label-sm text-[8px] uppercase tracking-[0.2em] text-primary block font-bold mb-1">
                  Cinematic Clip
                </span>
                <h5 className="font-display text-[15px] text-black font-normal line-clamp-1">
                  {vid.title}
                </h5>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real Completed Events Photography Grid */}
      <div className="space-y-6">
        <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-black/40 font-bold block text-center md:text-left">
          ✦ Verified Physical Setups
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {completedEvents.map((rc) => (
            <div
              key={rc.id}
              className="rounded-[24px] overflow-hidden border border-black/5 bg-white shadow-sm group"
            >
              <div className="aspect-[4/5] w-full overflow-hidden bg-[#fcfbf9] relative">
                <img
                  onError={handleImageError}
                  src={rc.img}
                  alt={rc.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full font-label-sm text-[8px] uppercase tracking-widest font-bold text-black">
                  {rc.date}
                </div>
              </div>
              <div className="p-4 bg-white">
                <h5 className="font-display text-[15px] font-normal text-black truncate">
                  {rc.title}
                </h5>
                <p className="font-label-sm text-[9px] text-black/40 tracking-widest block mt-0.5 uppercase font-bold">
                  {rc.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clean Customer Testimonials List */}
      <div className="space-y-6 pt-2">
        <span className="font-label-sm text-[11px] uppercase tracking-[0.2em] text-black/40 font-bold block text-center md:text-left">
          ✦ Families We've Served
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((tst, ti) => (
            <div
              key={ti}
              className="w-full bg-[#FCFBF8] backdrop-blur-2xl p-8 rounded-[28px] border border-[#E8E2D5] shadow-[0_8px_32px_rgba(0,0,0,0.03)] flex flex-col hover:border-[#D4AF37]/40 hover:shadow-[0_16px_48px_rgba(212,175,55,0.12)] transition-all duration-500 group relative overflow-hidden"
            >
              <div className="flex items-center gap-1.5 mb-5 text-[#8C7000] opacity-90 group-hover:opacity-100 transition-opacity font-serif text-base">
                {Array.from({ length: tst.rating || 5 }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
              <p className="font-serif text-[#3D3A36] text-[13px] sm:text-[14px] font-light italic mb-6 flex-1 leading-relaxed">
                "{tst.text || tst.comment}"
              </p>
              <div className="flex items-center gap-3.5 mt-auto pt-2">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-[#E2DACB] shadow-sm bg-[#EDE7DC] flex items-center justify-center shrink-0">
                  <span className="font-serif text-[#735C00] text-base font-bold">
                    {(tst.name || "C")[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-display font-bold uppercase tracking-[0.18em] text-[#2D2B29] text-[10px] mb-0.5">
                    {tst.name}
                  </h4>
                  <p className="font-label-sm text-[#9A7B38] uppercase tracking-[0.25em] text-[8px] font-bold">
                    {tst.role ? tst.role.split(',')[0].toUpperCase() : "CLIENT"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </motion.div>
  );
}
