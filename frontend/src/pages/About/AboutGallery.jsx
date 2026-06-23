import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { StackedSectionWrapper } from '../../components/layout/StackedSectionWrapper';
import { MandalaElement } from '../../components/ui/MandalaElement';
import { CloudinaryImage } from '../../components/ui/CloudinaryImage';

export function AboutGallery({ galleryPreview }) {
  if (!galleryPreview || galleryPreview.length === 0) return null;

  return (
    <StackedSectionWrapper index={6} isLast={true} bgClass="bg-surface">
      <section className="py-24 md:py-40 bg-surface border-t border-black/5 relative">
        <MandalaElement
          size={600}
          duration={200}
          variant={2}
          className="absolute top-1/2 right-0 opacity-[0.02] pointer-events-none translate-x-1/2"
          skipFade
        />

        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center mb-16 md:mb-20">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 block"
          >
            Visual Stories
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="font-headline text-[42px] md:text-[56px] leading-[1.1] tracking-tight"
          >
            The Studio Gallery
          </motion.h2>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 md:px-12 columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6">
          {galleryPreview.map((item, i) => {
            const dynamicHeight =
              !item.height || item.height === 'aspect-square'
                ? i % 4 === 0
                  ? 'aspect-[2/3]'
                  : i % 4 === 1
                    ? 'aspect-square'
                    : i % 4 === 2
                      ? 'aspect-[4/5]'
                      : 'aspect-[3/4]'
                : item.height;

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.05, duration: 0.6 }}
                key={item._id || item.id}
                className="break-inside-avoid mb-4 md:mb-6 rounded-[24px] md:rounded-[40px] overflow-hidden group relative bg-white shadow-sm border border-black/[0.03] cursor-pointer"
              >
                <Link
                  to={`/gallery?id=${item._id || item.id}`}
                  className="block w-full h-full rounded-[inherit]"
                >
                  <div
                    className={`relative ${dynamicHeight} w-full overflow-hidden rounded-[inherit]`}
                  >
                    <CloudinaryImage
                      src={item.image}
                      alt={item.title}
                      className="transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                      containerClassName="w-full h-full"
                      loading="lazy"
                      width={400}
                      height={500}
                    />
                    <div className="absolute inset-0 bg-primary/20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Overlay Info */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center backdrop-blur-[2px] duration-500">
                      <span className="material-symbols-outlined text-white text-[32px] font-light mb-2 scale-50 group-hover:scale-100 transition-transform duration-500">
                        visibility
                      </span>
                      <p className="text-white font-display text-[16px] md:text-[18px] mb-1">
                        {item.title}
                      </p>
                      <p className="text-white/60 font-label-sm text-[8px] uppercase tracking-widest">
                        {item.event}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-16 md:mt-24">
          <Link
            to="/gallery"
            className="inline-flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-white border border-black/5 rounded-full font-label-sm text-[10px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-on-surface hover:bg-primary hover:text-white hover:border-primary transition-all duration-500 font-bold shadow-sm hover:shadow-luxury group"
          >
            Explore Full Portfolio
            <span className="material-symbols-outlined text-[16px] md:text-[18px] group-hover:translate-x-1 transition-transform">
              east
            </span>
          </Link>
        </div>
      </section>
    </StackedSectionWrapper>
  );
}
