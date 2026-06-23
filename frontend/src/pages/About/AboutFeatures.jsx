import { m as motion } from 'framer-motion';
import { StackedSectionWrapper } from '../../components/layout/StackedSectionWrapper';
import { MandalaArtDecor } from '../../components/ui/MandalaArtDecor';

export function AboutFeatures({ features }) {
  if (!features || features.length === 0) return null;

  return (
    <StackedSectionWrapper index={3} isLast={false} bgClass="bg-surface">
      <section className="py-24 md:py-40 relative bg-surface overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <MandalaArtDecor
          variant={3}
          size={300}
          className="-bottom-14 -right-14 md:hidden"
          opacity={0.15}
          blendMode="darken"
          spinDuration={185}
        />
        <MandalaArtDecor
          variant={3}
          size={600}
          className="-bottom-40 -right-40 hidden md:block"
          opacity={0.1}
          blendMode="darken"
          spinDuration={185}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center mb-16 md:mb-24">
          <span className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 block">
            The Siri Difference
          </span>
          <h2 className="font-headline text-[42px] md:text-[56px] leading-[1.1] tracking-tight">
            Why Families Choose Us
          </h2>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
          {features.map((feature, i) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              key={i}
              className="bg-white/90 backdrop-blur-xl border border-black/[0.02] rounded-[24px] md:rounded-[32px] p-5 md:p-10 hover:shadow-[0_20px_40px_rgba(212,175,55,0.06)] transition-all duration-500 group hover:-translate-y-2 relative overflow-hidden flex flex-col items-center text-center"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-surface border border-black/5 flex items-center justify-center mb-5 md:mb-8 group-hover:bg-primary group-hover:border-primary transition-all duration-500 shadow-sm group-hover:shadow-lg">
                <span className="material-symbols-outlined text-[20px] md:text-[24px] text-primary group-hover:text-white transition-colors duration-500">
                  {feature.icon}
                </span>
              </div>
              <h3 className="font-display text-[15px] md:text-[22px] text-on-surface mb-2 md:mb-4 leading-tight">
                {feature.title}
              </h3>
              <p className="font-body text-[11px] md:text-[14px] text-on-surface-variant/60 font-light leading-relaxed line-clamp-3 md:line-clamp-none">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </StackedSectionWrapper>
  );
}
