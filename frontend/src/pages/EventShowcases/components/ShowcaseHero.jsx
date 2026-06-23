import { m as motion } from 'framer-motion';
import { OptimizedImage } from '../../../components/ui/OptimizedImage';
import { MandalaArtDecor } from '../../../components/ui/MandalaArtDecor';

export function ShowcaseHero({ eventsPageContent }) {
  return (
    <section className="relative min-h-[320px] md:h-[70vh] flex items-center overflow-hidden bg-on-surface-variant">
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.6 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0"
      >
        <OptimizedImage
          src={eventsPageContent.hero.backgroundImage}
          className="w-full h-full object-cover"
          alt="Showcase Hero"
          eager={true}
          width={1920}
          sizes="100vw"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-surface" />

      <MandalaArtDecor
        variant={2}
        size={500}
        className="-top-20 -right-20 hidden lg:block absolute"
        opacity={0.12}
        spinDuration={240}
      />
      <MandalaArtDecor
        variant={2}
        size={250}
        className="-top-10 -right-10 lg:hidden absolute"
        opacity={0.15}
        spinDuration={240}
      />

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop w-full relative z-10 text-center">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-label-sm text-surface tracking-[0.4em] uppercase mb-6 block text-[#ffe088]"
        >
          {eventsPageContent.hero.subtitle}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-headline-xl text-[32px] sm:text-[42px] md:text-[56px] lg:text-[72px] text-surface mb-4 md:mb-8 text-gold leading-tight"
        >
          {eventsPageContent.hero.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-body-lg text-[13px] md:text-[16px] lg:text-[18px] text-surface/80 max-w-xl mx-auto font-light leading-relaxed px-4"
        >
          {eventsPageContent.hero.description}
        </motion.p>
      </div>
    </section>
  );
}
