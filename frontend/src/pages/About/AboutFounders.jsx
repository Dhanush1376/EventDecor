import { m as motion } from 'framer-motion';
import { StackedSectionWrapper } from '../../components/layout/StackedSectionWrapper';
import { MandalaElement } from '../../components/ui/MandalaElement';

const cleanSignatureImg = (imgUrl, founderName) => {
  if (
    !imgUrl ||
    imgUrl.includes('unsplash.com') ||
    imgUrl === '' ||
    imgUrl.includes('images.unsplash.com')
  ) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="80" viewBox="0 0 250 80"><defs><style>@import url('https://fonts.googleapis.com/css2?family=Alex+Brush&amp;display=swap');.sig { font-family: 'Alex Brush', cursive; font-size: 42px; fill: %231a1a1a; }</style></defs><text x="25" y="52" class="sig">${founderName}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  return imgUrl;
};

export function AboutFounders({ founders }) {
  if (!founders || founders.length === 0) return null;

  return (
    <StackedSectionWrapper index={5} isLast={false} bgClass="bg-surface-bright">
      <section className="py-24 md:py-40 relative bg-surface-bright overflow-hidden">
        <div className="absolute top-1/2 -left-[20%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary-container/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center mb-16 md:mb-24">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 block"
          >
            The Founders
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="font-headline text-[42px] md:text-[56px] leading-[1.1] tracking-tight"
          >
            Guiding the Studio
          </motion.h2>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 items-start gap-16 lg:gap-24 relative z-10">
          {founders?.map((founder, index) => (
            <div key={index} className="space-y-8 flex flex-col items-center lg:items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: index * 0.2 }}
                className="relative w-full max-w-[280px] aspect-square bg-white rounded-[32px] md:rounded-[40px] p-4 md:p-6 shadow-[0_30px_60px_rgba(0,0,0,0.06)] border border-black/[0.02] flex items-center justify-center group"
              >
                <div className="w-full h-full rounded-[24px] md:rounded-[32px] overflow-hidden relative bg-surface-container-low flex items-center justify-center">
                  <MandalaElement
                    size={240}
                    duration={180}
                    variant={index === 0 ? 1 : 2}
                    className="opacity-[0.15] group-hover:opacity-[0.25] transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
                  <span className="font-display text-[48px] md:text-[64px] text-primary/20 select-none">
                    {founder.initials}
                  </span>
                </div>
              </motion.div>

              <div className="space-y-6 w-full text-center lg:text-center">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-primary/10 bg-primary/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.4em] font-bold">
                    {founder.role}
                  </span>
                </div>

                <h3 className="font-headline text-[32px] md:text-[42px] leading-tight">
                  {founder.name} <br />
                  <span className="italic font-light text-primary">{founder.subtitle}</span>
                </h3>

                <p className="font-body text-[16px] text-on-surface-variant/80 font-light leading-relaxed max-w-lg mx-auto">
                  {founder.quote}
                </p>

                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="pt-4 border-t border-black/5 flex justify-center lg:justify-center"
                >
                  <img
                    src={cleanSignatureImg(founder.signatureImg, founder.name)}
                    className="h-14 md:h-16 opacity-90 mix-blend-multiply filter grayscale contrast-150 -ml-4"
                    alt={`${founder.name} Signature`}
                  />
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </StackedSectionWrapper>
  );
}
