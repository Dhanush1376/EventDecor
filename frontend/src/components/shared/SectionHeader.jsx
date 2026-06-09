import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Reusable section header with kicker, title, and optional "See All" link.
 */
export function SectionHeader({ kicker, title, seeAllLink, className = '' }) {
  return (
    <div className={`relative mb-10 md:mb-14 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
        <div className="flex flex-col relative z-10">
          {kicker && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-2"
            >
              <div className="w-6 h-[1px] bg-primary/60"></div>
              <span className="font-label text-[10px] uppercase tracking-[0.25em] text-primary font-bold">
                {kicker}
              </span>
            </motion.div>
          )}

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-3xl md:text-5xl text-on-surface font-semibold tracking-tight relative inline-block"
          >
            {title}
            {/* Subtle premium underline accent */}
            <div className="absolute -bottom-2 left-0 w-1/3 h-[2px] bg-gradient-to-r from-primary/50 to-transparent rounded-full"></div>
          </motion.h2>
        </div>

        {/* Decorative expanding line to fill the boring empty space */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="hidden md:block flex-1 h-[1px] bg-gradient-to-r from-primary/30 via-outline-variant/30 to-transparent mx-6 mb-3 origin-left"
        />

        {seeAllLink && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link
              to={seeAllLink}
              className="group inline-flex items-center gap-2 font-label text-[11px] uppercase tracking-widest font-bold text-on-surface-variant hover:text-primary transition-all pb-1 border-b border-outline-variant/30 hover:border-primary/50"
            >
              See All
              <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
