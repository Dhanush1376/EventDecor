import { m as motion } from 'framer-motion';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';
import { OptimizedImage } from '../../components/ui';

export function EventHero({ eventsPageContent }) {
  return (
    <section className="relative min-h-[320px] lg:h-[70vh] flex items-center overflow-hidden bg-on-surface-variant">
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.65 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0"
      >
        <OptimizedImage
          src={eventsPageContent.hero.backgroundImage}
          width={1920}
          sizes="100vw"
          eager={true}
          className="w-full h-full object-cover"
          alt="Cinematic Events Background"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-surface" />

      {/* Top-right decorative art anchor */}
      <MandalaArtDecor
        variant={2}
        size={500}
        className="-top-20 -right-20 hidden lg:block"
        opacity={0.12}
        spinDuration={240}
      />
      <MandalaArtDecor
        variant={2}
        size={250}
        className="-top-10 -right-10 lg:hidden"
        opacity={0.15}
        spinDuration={240}
      />

      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop w-full relative z-10 text-center">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-label-sm text-surface tracking-[0.4em] uppercase mb-6 block"
        >
          {eventsPageContent.hero.subtitle}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-headline-xl text-[32px] sm:text-[42px] lg:text-[56px] lg:text-[72px] text-surface mb-4 lg:mb-8 text-gold leading-tight"
        >
          {eventsPageContent.hero.title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-body-lg text-[13px] lg:text-[16px] lg:text-[18px] text-surface/80 max-w-2xl mx-auto font-light leading-relaxed px-4"
        >
          {eventsPageContent.hero.description}
        </motion.p>
      </div>
    </section>
  );
}
