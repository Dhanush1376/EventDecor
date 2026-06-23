import { m as motion } from 'framer-motion';
import { StackedSectionWrapper } from '../../components/layout/StackedSectionWrapper';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';
import { MandalaElement } from '../../components/ui/MandalaElement';
import { CloudinaryImage } from '../../components/ui/CloudinaryImage';

export function AboutStory({ cmsContent }) {
  return (
    <StackedSectionWrapper index={1} isLast={false} bgClass="bg-surface">
      <section className="py-24 md:py-40 relative bg-surface z-10 overflow-hidden">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <MandalaArtDecor
          variant={2}
          size={320}
          className="-top-16 -right-16 md:hidden"
          opacity={0.16}
          blendMode="darken"
          spinDuration={170}
        />
        <MandalaArtDecor
          variant={2}
          size={600}
          className="-top-36 -right-36 hidden md:block"
          opacity={0.12}
          blendMode="darken"
          spinDuration={170}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1 }}
            className="relative aspect-[3/4] md:aspect-[4/5] bg-white rounded-[40px] p-4 md:p-6 shadow-[0_40px_80px_rgba(0,0,0,0.08)] border border-black/[0.02]"
          >
            <div className="w-full h-full rounded-[32px] md:rounded-t-full md:rounded-b-full overflow-hidden relative">
              <CloudinaryImage
                src={cmsContent?.storyImage || '/assets/legacy_artistry_decor.webp'}
                alt="Handcrafted Details"
                className="scale-[1.02] hover:scale-110 transition-transform duration-[3s] ease-out"
                containerClassName="w-full h-full"
                loading="lazy"
                width={600}
                height={800}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
          </motion.div>

          <div className="space-y-8 relative">
            <MandalaElement
              size={300}
              duration={160}
              className="absolute -top-16 -left-16 opacity-[0.04] pointer-events-none"
              skipFade
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-primary/10 bg-primary/5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.4em] font-bold">
                The Journey
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-headline text-[42px] md:text-[56px] lg:text-[64px] leading-[1.1] tracking-tight text-on-surface"
            >
              A Legacy of <br />
              <span className="italic font-light text-primary">Family Artistry.</span>
            </motion.h2>

            <div className="space-y-6">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="font-body text-[16px] md:text-[18px] text-on-surface-variant/80 font-light leading-relaxed"
              >
                Founded with a profound passion for celebrations, Siri Arts & Crafts began as a
                small family endeavor designed to weave authentic Telugu traditions into modern
                wedding landscapes.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="font-body text-[16px] md:text-[18px] text-on-surface-variant/80 font-light leading-relaxed"
              >
                Today, we stand as a premier digital studio, honoring our ancient roots while
                elevating event decor to a profound form of high art. Our artisans pour their hearts
                into every creation, ensuring your cherished moments are framed in unparalleled
                elegance.
              </motion.p>
            </div>
          </div>
        </div>
      </section>
    </StackedSectionWrapper>
  );
}
