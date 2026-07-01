import { m as motion } from 'framer-motion';
import { handleImageError, getOptimizedUrl } from '../../utils/media/imageUtils';

export function PromoBanner({
  backgroundImage,
  badgeText,
  statusText,
  title,
  highlightText,
  _description,
  ctaText,
  onCtaClick,
  timer = null,
  className = '',
}) {
  return (
    <section
      className={`max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop mb-6 lg:mb-8 relative group ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-full overflow-hidden relative min-h-[54px] sm:min-h-[70px] flex flex-row items-center justify-between p-1.5 sm:p-2.5 px-3 sm:px-8 gap-2 sm:gap-6 border border-white/10 shadow-luxury bg-[#0f0f0f]/90 backdrop-blur-xl group-hover:shadow-luxury-hover transition-all duration-700"
      >
        {/* Cinematic Background Layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-full">
          {backgroundImage && (
            <motion.img
              initial={{ scale: 1.1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 10, ease: 'linear' }}
              onError={handleImageError}
              src={getOptimizedUrl(backgroundImage)}
              className="w-full h-full object-cover opacity-20 select-none mix-blend-luminosity"
              alt="Promo Backdrop"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
        </div>

        {/* Content Side */}
        <div className="relative z-10 flex-1 flex flex-row items-center gap-3 sm:gap-8 min-w-0">
          {/* Hide badge on mobile to save space, show only on tablet/desktop */}
          <div className="hidden lg:block flex-shrink-0">
            <span className="px-3.5 py-1.5 rounded-full bg-primary/20 backdrop-blur-xl text-gold font-label-sm text-[10px] uppercase tracking-[0.15em] font-bold border border-primary/20 shadow-lg">
              {badgeText}
            </span>
          </div>

          <div
            className="flex-1 overflow-hidden relative flex items-center min-w-0 py-1"
            style={{
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 25px, black calc(100% - 25px), transparent)',
            }}
          >
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
              className="flex flex-row items-center whitespace-nowrap w-max"
            >
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-row items-center gap-8 sm:gap-16 px-8 sm:px-16">
                  <h3 className="font-label-md text-[10px] sm:text-[13px] lg:text-[15px] uppercase tracking-[0.2em] text-white/90 font-medium leading-none flex items-center gap-3">
                    {title}{' '}
                    <span className="text-gold font-bold tracking-[0.25em]">{highlightText}</span>
                  </h3>
                  {statusText && (
                    <span className="hidden sm:inline-flex text-white/50 font-label-sm text-[9px] uppercase tracking-[0.3em] flex items-center gap-2 font-bold whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                      {statusText}
                    </span>
                  )}
                  {/* Elegant separator */}
                  <span className="w-1 h-1 rounded-full bg-white/20"></span>
                </div>
              ))}
            </motion.div>
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCtaClick}
            className="group/btn bg-gradient-to-r from-[#d4af37] to-[#f3e5ab] text-black font-label-sm text-[9px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.25em] font-extrabold px-6 py-2.5 sm:px-10 sm:py-3.5 rounded-full hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all cursor-pointer relative overflow-hidden whitespace-nowrap text-center"
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
