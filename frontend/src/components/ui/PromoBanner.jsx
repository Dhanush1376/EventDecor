import React from "react";
import { motion } from "framer-motion";
import { handleImageError } from "../../utils/imageUtils";

export function PromoBanner({
  backgroundImage,
  badgeText,
  statusText,
  title,
  highlightText,
  description,
  ctaText,
  onCtaClick,
  timer = null,
  className = "",
}) {
  return (
    <section
      className={`max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop mb-8 md:mb-12 relative group ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-full overflow-hidden relative min-h-[54px] sm:min-h-[90px] flex flex-row items-center justify-between p-2 sm:p-4 px-3 sm:px-10 gap-2 sm:gap-6 border border-white/10 shadow-luxury bg-[#0a0a0a] group-hover:shadow-luxury-hover transition-all duration-700"
      >
        {/* Cinematic Background Layer */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.img
            initial={{ scale: 1.1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 10, ease: "linear" }}
            onError={handleImageError}
            src={backgroundImage}
            className="w-full h-full object-cover opacity-45 select-none pointer-events-none"
            alt="Promo Backdrop"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent" />
        </div>

        {/* Content Side */}
        <div className="relative z-10 flex-1 flex flex-row items-center gap-3 sm:gap-8 min-w-0">
          {/* Hide badge on mobile to save space, show only on tablet/desktop */}
          <div className="hidden md:block flex-shrink-0">
            <span className="px-3.5 py-1.5 rounded-full bg-primary/20 backdrop-blur-xl text-gold font-label-sm text-[10px] uppercase tracking-[0.15em] font-bold border border-primary/20 shadow-lg">
              {badgeText}
            </span>
          </div>

          <div className="flex flex-row items-center gap-2 sm:gap-4 min-w-0">
            <h3 className="font-display text-[9.5px] xs:text-[11px] sm:text-[16px] md:text-[18px] lg:text-[22px] text-white font-medium leading-none truncate">
              {title}{" "}
              <span className="text-gold italic ml-0.5 sm:ml-1 whitespace-nowrap">{highlightText}</span>
            </h3>
            {statusText && (
              <span className="hidden sm:inline-flex text-white/40 font-label-sm text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5 font-bold whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {statusText}
              </span>
            )}
          </div>
        </div>

        {/* Action Side */}
        <div className="relative z-10 flex flex-row items-center gap-4 sm:gap-10 shrink-0">
          {timer && (
            <div className="hidden lg:flex gap-6 border-l border-white/10 pl-10">
              {timer.map((t) => (
                <div key={t.l} className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl text-white font-bold leading-none">
                    {t.v}
                  </span>
                  <span className="font-label-sm text-[9px] uppercase tracking-widest text-gold font-bold opacity-60">
                    {t.l}
                  </span>
                </div>
              ))}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCtaClick}
            className="group/btn bg-primary text-surface font-label-sm text-[8px] sm:text-[11px] uppercase tracking-[0.1em] sm:tracking-[0.2em] font-bold px-3.5 py-2 sm:px-10 sm:py-3.5 rounded-full hover:bg-gold transition-all cursor-pointer shadow-luxury relative overflow-hidden whitespace-nowrap text-center"
          >
            <span className="relative z-10">{ctaText}</span>
          </motion.button>
        </div>

        {/* Decorative Light Streak */}
        <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] group-hover:left-[150%] transition-all duration-[1500ms] pointer-events-none" />
      </motion.div>
    </section>
  );
}
