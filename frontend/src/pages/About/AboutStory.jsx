import { m as motion } from 'framer-motion';
import { StackedSectionWrapper } from '../../components/layout/StackedSectionWrapper';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';
import { MandalaElement } from '../../components/ui/MandalaElement';
import { CloudinaryImage } from '../../components/ui/CloudinaryImage';

export function AboutStory({ cmsContent }) {
  return (
    <StackedSectionWrapper index={1} isLast={false} bgClass="bg-surface">
      <section className="py-24 lg:py-40 relative bg-surface z-10 overflow-hidden">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <MandalaArtDecor
          variant={2}
          size={320}
          className="-top-16 -right-16 lg:hidden"
          opacity={0.16}
          blendMode="darken"
          spinDuration={170}
        />
        {/* Large mandala on the top right edge, as seen in the screenshot */}
        <MandalaArtDecor
          variant={2}
          size={800}
          className="-top-48 -right-48 hidden lg:block"
          opacity={0.08}
          blendMode="darken"
          spinDuration={170}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1 }}
            className="relative aspect-[3/4] lg:aspect-[4/5] bg-white rounded-[40px] p-4 lg:p-6 shadow-2xl border border-black/[0.02]"
          >
            <div className="w-full h-full rounded-[32px] overflow-hidden relative">
              <CloudinaryImage
                src={cmsContent?.storyImage || '/assets/legacy_artistry_decor.webp'}
                alt="Handcrafted Details"
                className="scale-[1.02] hover:scale-110 transition-transform duration-[3s] ease-out"
                containerClassName="w-full h-full object-cover"
                loading="lazy"
                width={800}
                height={1000}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          </motion.div>

          <div className="space-y-8 relative">
            {/* Small mandala behind the text, as seen in the screenshot */}
            <MandalaElement
              size={400}
              duration={160}
              className="absolute -top-24 -left-20 opacity-[0.06] pointer-events-none hidden lg:block"
              skipFade
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-[#8B7355]/20 bg-[#8B7355]/5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B7355]" />
              <span className="font-label-sm text-[10px] text-[#8B7355] uppercase tracking-[0.4em] font-bold">
                The Journey
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-headline text-[42px] lg:text-[56px] lg:text-[64px] leading-[1.15] tracking-tight text-[#1A1A1A]"
              dangerouslySetInnerHTML={{
                __html: cmsContent?.storyHeadline || 'A Legacy of <br />Family Artistry.',
              }}
            />

            <div className="space-y-6">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="font-body text-[16px] lg:text-[18px] text-[#4A4A4A] font-light leading-relaxed"
              >
                {cmsContent?.storyParagraph1 ||
                  'Founded with a profound passion for celebrations, Siri Arts & Crafts began as a small family endeavor designed to weave authentic Telugu traditions into modern wedding landscapes.'}
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="font-body text-[16px] lg:text-[18px] text-[#4A4A4A] font-light leading-relaxed"
              >
                {cmsContent?.storyParagraph2 ||
                  'Today, we stand as a premier digital studio, honoring our ancient roots while elevating event decor to a profound form of high art. Our artisans pour their hearts into every creation, ensuring your cherished moments are framed in unparalleled elegance.'}
              </motion.p>
            </div>
          </div>
        </div>
      </section>
    </StackedSectionWrapper>
  );
}
