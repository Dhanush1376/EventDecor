import { m as motion } from 'framer-motion';
import { StackedSectionWrapper } from '../../components/layout/StackedSectionWrapper';
import { CloudinaryImage } from '../../components/ui/CloudinaryImage';

export function AboutTestimonial({ cmsContent }) {
  if (!cmsContent?.testimonialQuote) return null;

  return (
    <StackedSectionWrapper index={4} isLast={false} bgClass="bg-black">
      <section className="py-32 md:py-48 bg-black relative text-white overflow-hidden">
        <div className="absolute inset-0 opacity-50">
          <CloudinaryImage
            src={cmsContent?.testimonialImage || ''}
            alt="Wedding Background"
            className="mix-blend-overlay"
            containerClassName="w-full h-full"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black" />
          <div className="absolute inset-0 bg-primary/5 mix-blend-color" />
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', duration: 1 }}
            className="w-20 h-20 mx-auto rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center mb-10"
          >
            <span className="material-symbols-outlined text-[36px] text-primary">format_quote</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 1 }}
            className="font-headline text-[32px] md:text-[48px] lg:text-[56px] leading-[1.2] tracking-tight text-white mb-12 italic font-light max-w-4xl mx-auto"
          >
            "{cmsContent.testimonialQuote}"
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 1 }}
          >
            <h4 className="font-display text-[22px] text-primary mb-2">
              {cmsContent.testimonialAuthor}
            </h4>
            <p className="font-label-sm text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold">
              {cmsContent.testimonialEvent}
            </p>
          </motion.div>
        </div>
      </section>
    </StackedSectionWrapper>
  );
}
