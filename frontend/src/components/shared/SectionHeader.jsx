import { ArrowRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
/**
 * Reusable section header with kicker, title, and optional "See All" link.
 */
export function SectionHeader({
  kicker,
  title,
  seeAllLink,
  className = '',
  hideUnderline = false,
}) {
  return (
    <div className={`relative mt-8 lg:mt-12 mb-10 lg:mb-14 ${className}`}>
      <div className="flex flex-col relative z-10">
        {/* Top Row: Title and See All */}
        <div className="flex items-center justify-between gap-4 w-full">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-3xl lg:text-5xl text-on-surface font-normal tracking-tight relative inline-block mb-1"
          >
            {title}
          </motion.h2>

          {seeAllLink && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="shrink-0"
            >
              <Link
                to={seeAllLink}
                className="group inline-flex items-center gap-2 font-label text-[11px] uppercase tracking-widest font-bold text-on-surface-variant hover:text-primary transition-all pb-1 border-b border-outline-variant/30 hover:border-primary/50 whitespace-nowrap"
              >
                See All
                <ArrowRight
                  className="text-[14px] group-hover:translate-x-1 transition-transform"
                  strokeWidth={1.5}
                />
              </Link>
            </motion.div>
          )}
        </div>

        {/* Bottom Row: Kicker (Subtitle) */}
        {kicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mt-3"
          >
            <div className="w-8 h-[1.5px] bg-primary/50"></div>
            <span className="font-label text-[11px] uppercase tracking-[0.25em] text-primary font-bold flex items-center gap-1.5">
              <Heart className="text-[13px]" strokeWidth={1.5} />
              {kicker}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
