import { m as motion } from 'framer-motion';
import { StackedSectionWrapper } from '../../components/layout/StackedSectionWrapper';
import { CloudinaryImage } from '../../components/ui/CloudinaryImage';
import { initialWebsiteContent } from '../../admin/data/websiteContentData';

export function AboutHero({ heroY, heroOpacity, cmsContent, firstWord, restWords }) {
  return (
    <StackedSectionWrapper index={0} isLast={false} bgClass="bg-black">
      <section className="relative h-[100dvh] min-h-[700px] w-full flex items-center justify-center overflow-hidden bg-black">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 w-full h-full"
        >
          <CloudinaryImage
            src={cmsContent?.heroImage || initialWebsiteContent?.aboutPage?.heroImage}
            alt="Cinematic Wedding Decor"
            className="w-full h-full object-cover opacity-60 mix-blend-screen"
            containerClassName="w-full h-full"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
        </motion.div>

        <div className="relative z-10 text-center text-white px-6 mt-16 max-w-5xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-8"
          >
            <span className="w-12 h-[1px] bg-primary"></span>
            <span className="font-label-sm text-[10px] lg:text-[11px] uppercase tracking-[0.5em] text-primary font-bold">
              The {firstWord} {restWords} Heritage
            </span>
            <span className="w-12 h-[1px] bg-primary"></span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="font-headline text-[48px] lg:text-[72px] lg:text-[96px] leading-[1.05] tracking-tight mb-8"
          >
            {cmsContent?.heroTitle || 'Crafting Traditions'} <br />
            <span className="italic font-light text-white">
              {cmsContent?.heroSubtitle || 'with Elegance.'}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="font-body text-[16px] lg:text-[20px] text-white/70 font-light leading-relaxed max-w-2xl mx-auto"
          >
            {cmsContent?.missionStatement || ''}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
          >
            <span className="font-label-sm text-[9px] uppercase tracking-[0.3em] text-white/50 font-bold">
              Scroll to Explore
            </span>
            <div className="w-[1px] h-16 bg-white/20 relative overflow-hidden">
              <motion.div
                animate={{ y: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 w-full h-1/2 bg-white"
              />
            </div>
          </motion.div>
        </div>
      </section>
    </StackedSectionWrapper>
  );
}
