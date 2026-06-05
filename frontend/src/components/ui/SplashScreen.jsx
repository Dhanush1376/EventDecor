import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MandalaElement } from './MandalaElement';
import { SiriLogo } from './SiriLogo';

export function SplashScreen({ onComplete }) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = prefersReducedMotion ? 400 : 900;
    const timer = setTimeout(() => {
      onComplete();
    }, duration);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      role="presentation"
      aria-hidden="true"
      onClick={onComplete}
      onKeyDown={(e) => e.key === 'Escape' && onComplete()}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(6px)', scale: 1.02 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[99999] bg-surface flex flex-col items-center justify-center overflow-hidden cursor-pointer"
    >
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-marble opacity-[0.03] pointer-events-none mix-blend-multiply" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-secondary-container/20 rounded-full blur-[100px] pointer-events-none mix-blend-overlay" />

      {/* Floating Mandalas */}
      <MandalaElement size={600} duration={160} className="absolute -top-32 -right-32 opacity-10" />
      <MandalaElement
        size={800}
        duration={240}
        variant={2}
        className="absolute -bottom-40 -left-40 opacity-[0.07]"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Central Logo Animation (Luxury 'S' Monogram) */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center w-32 h-32 md:w-40 md:h-40 mb-10"
        >
          {/* Animated Glowing Rings */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 border border-primary/30 rounded-full"
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 0 }}
            transition={{
              duration: 3,
              delay: 0.8,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className="absolute inset-0 border border-primary/20 rounded-full"
          />

          {/* Rotating Thin Floral Ring */}
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 border border-primary/40 rounded-full border-t-transparent border-b-transparent opacity-60"
          />

          {/* S Monogram Centerpiece */}
          <motion.div
            initial={{ y: 15, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-surface/80 backdrop-blur-xl border border-primary/20 w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.15)]"
          >
            <span className="font-display text-4xl md:text-5xl text-primary font-light tracking-widest bg-gradient-to-br from-primary via-primary-dark to-primary bg-clip-text text-transparent transform translate-x-1">
              S
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <div className="mb-4">
            <SiriLogo size="48px" showSubtitle={false} />
          </div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '60px' }}
            transition={{ duration: 1.2, delay: 1.6, ease: [0.16, 1, 0.3, 1] }}
            className="h-px bg-primary/40 mb-4"
          />
          <motion.p
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, delay: 2, ease: 'easeOut' }}
            className="font-label-sm text-[9px] md:text-[10px] tracking-[0.4em] uppercase text-on-surface-variant/70 italic"
          >
            Crafting Traditions with Elegance
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}
