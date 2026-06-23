import { useRef, useState } from 'react';
import { m as motion } from 'framer-motion';
import { StackedSectionWrapper } from '../../components/layout/StackedSectionWrapper';
import { CloudinaryImage } from '../../components/ui/CloudinaryImage';

export function AboutSpecializations({ specializations }) {
  const specScrollRef = useRef(null);
  const [isDraggingSpec, setIsDraggingSpec] = useState(false);
  const [startXSpec, setStartXSpec] = useState(0);
  const [scrollLeftSpec, setScrollLeftSpec] = useState(0);

  const handleMouseDownSpec = (e) => {
    setIsDraggingSpec(true);
    setStartXSpec(e.pageX - specScrollRef.current.offsetLeft);
    setScrollLeftSpec(specScrollRef.current.scrollLeft);
  };

  const handleMouseLeaveSpec = () => {
    setIsDraggingSpec(false);
  };

  const handleMouseUpSpec = () => {
    setIsDraggingSpec(false);
  };

  const handleMouseMoveSpec = (e) => {
    if (!isDraggingSpec) return;
    e.preventDefault();
    const x = e.pageX - specScrollRef.current.offsetLeft;
    const walk = (x - startXSpec) * 1.5;
    specScrollRef.current.scrollLeft = scrollLeftSpec - walk;
  };

  if (!specializations || specializations.length === 0) return null;

  return (
    <StackedSectionWrapper index={2} isLast={false} bgClass="bg-surface-bright">
      <section className="py-24 md:py-32 relative bg-surface-bright border-y border-black/5">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-secondary-container/20 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 mb-16 md:mb-24 text-center relative z-10">
          <span className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 block">
            Our Expertise
          </span>
          <h2 className="font-headline text-[42px] md:text-[56px] leading-[1.1] tracking-tight">
            Signature Specializations
          </h2>
        </div>

        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-12 relative z-10">
          <div
            ref={specScrollRef}
            onMouseDown={handleMouseDownSpec}
            onMouseLeave={handleMouseLeaveSpec}
            onMouseUp={handleMouseUpSpec}
            onMouseMove={handleMouseMoveSpec}
            className={`flex flex-row gap-6 md:gap-8 overflow-x-auto pb-8 scrollbar-none cursor-grab active:cursor-grabbing select-none snap-x snap-mandatory scroll-smooth`}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {specializations.map((spec, i) => (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                viewport={{ once: true, margin: '-50px' }}
                key={i}
                className="group relative flex flex-col cursor-pointer shrink-0 snap-start w-[280px] sm:w-[320px] md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]"
              >
                {/* 1. Image Frame - Shop Style */}
                <div className="relative aspect-[4/5] rounded-2xl md:rounded-[40px] overflow-hidden mb-3 md:mb-6 bg-surface-container-low border border-black/[0.03]">
                  <CloudinaryImage
                    src={spec.img}
                    alt={spec.title}
                    className="absolute inset-0 w-full h-full transition-transform duration-[2.5s] ease-out group-hover:scale-110 pointer-events-none"
                    containerClassName="w-full h-full"
                    loading="lazy"
                    width={400}
                    height={500}
                  />

                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                  {/* Luxury Brand Mark */}
                  <div className="absolute top-3 right-3 md:top-4 md:right-4 w-7 h-7 md:w-10 md:h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                    <span className="material-symbols-outlined text-white text-[12px] md:text-[18px]">
                      workspace_premium
                    </span>
                  </div>
                </div>

                {/* 2. Editorial Details - Shop Style */}
                <div className="flex flex-col pointer-events-none">
                  <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2.5">
                    <div className="w-4 md:w-6 h-[1px] bg-primary/30" />
                    <span className="font-label-sm text-[8px] md:text-[9px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-primary font-bold">
                      Artisan Craft
                    </span>
                  </div>
                  <h3 className="font-display text-[15px] md:text-[24px] text-on-surface leading-tight mb-1 md:mb-1.5 transition-colors group-hover:text-primary">
                    {spec.title}
                  </h3>
                  <p className="font-body text-[10px] md:text-[13px] text-on-surface-variant/60 font-light leading-relaxed line-clamp-1 md:line-clamp-none">
                    Meticulously handcrafted for your cherished moments.
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </StackedSectionWrapper>
  );
}
