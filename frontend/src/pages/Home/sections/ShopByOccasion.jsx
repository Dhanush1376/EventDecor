import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { SectionHeader } from '../../../components/shared/SectionHeader';
import { MandalaElement } from '../../../components/ui/MandalaElement';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';
import { useState } from 'react';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';

/**
 * Shop By Occasion / Event Types using real digital studio event types.
 * Styled as a swipable stacked card carousel.
 */
export function ShopByOccasion() {
  const cms = useWebsiteContent({ includeDefaults: false });
  const loading = cms?.loading;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  if (loading) {
    return (
      <section className="h1-section relative overflow-hidden isolate" id="h1-occasions">
        <div className="max-w-[1400px] mx-auto px-6 mb-24 animate-pulse">
          <div className="flex flex-col items-center text-center mb-8 md:mb-10">
            <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2"></div>
            <div className="h-8 md:h-10 w-56 md:w-72 bg-surface-container-high rounded-full"></div>
          </div>

          {/* Mobile Swipe Carousel */}
          <div className="flex gap-6 justify-center overflow-hidden lg:hidden">
            <div className="w-[75vw] sm:w-[50vw] h-[400px] bg-surface-container-high rounded-[36px] shrink-0"></div>
            <div className="w-[75vw] sm:w-[50vw] h-[400px] bg-surface-container-high rounded-[36px] shrink-0 opacity-40"></div>
          </div>

          {/* Desktop Accordion */}
          <div className="hidden lg:flex w-full max-w-[1200px] mx-auto h-[600px] gap-4 px-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-1 bg-surface-container-high rounded-[32px] h-full"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const config = cms?.shopByOccasion || {};
  if (config.isVisible === false) return null;
  let occasions = config.occasions || [];

  if (occasions.length > 0) {
    // Ensure backwards compatibility with label and desc fields
    occasions = occasions
      .map((occ) => ({
        ...occ,
        label: occ.title || occ.label,
        desc: occ.desc || '',
      }))
      .filter((occ) => occ.label && occ.link);
  }

  if (!occasions || occasions.length === 0) {
    return null;
  }

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (e, { offset }) => {
    setTimeout(() => setIsDragging(false), 150);
    const swipe = offset.x;
    if (swipe < -30) {
      setActiveIndex((prev) => (prev + 1) % occasions.length);
    } else if (swipe > 30) {
      setActiveIndex((prev) => (prev - 1 + occasions.length) % occasions.length);
    }
  };

  return (
    <section className="h1-section relative overflow-hidden isolate" id="h1-occasions">
      {/* Background glow gradient behind mandala */}
      <div className="absolute -top-44 -right-32 w-[300px] h-[300px] bg-primary-container/15 rounded-full blur-[80px] pointer-events-none z-[-1]" />
      <div className="absolute -bottom-32 -left-32 w-[300px] h-[300px] bg-primary-container/15 rounded-full blur-[80px] pointer-events-none z-[-1]" />
      <MandalaElement
        className="absolute -top-36 -right-24 opacity-[0.04] z-[-1]"
        size={500}
        duration={200}
        variant={2}
      />
      <MandalaElement
        className="absolute -bottom-24 -left-24 opacity-[0.04] z-[-1]"
        size={500}
        duration={200}
        variant={2}
      />
      <div className="h1-container relative z-10">
        <SectionHeader
          kicker={config.kicker}
          title={config.sectionTitle}
          seeAllLink={config.seeAllLink}
        />
      </div>

      {/* --- MOBILE CAROUSEL LAYOUT --- */}
      <div className="block lg:hidden">
        <div className="relative h-[440px] w-full flex items-center justify-center overflow-visible touch-pan-y z-20 mt-4 max-w-max-width mx-auto">
          {occasions.map((occasion, idx) => {
            let x = '0%';
            let scale = 1;
            let zIndex = 30;
            let opacity = 1;
            let brightness = 1;

            if (idx < activeIndex) {
              x = `-${65 + (activeIndex - idx) * 8}%`;
              scale = 0.85 - (activeIndex - idx) * 0.05;
              zIndex = 20 - (activeIndex - idx);
              opacity = 0.95;
              brightness = 0.85;
            } else if (idx > activeIndex) {
              x = `${65 + (idx - activeIndex) * 8}%`;
              scale = 0.85 - (idx - activeIndex) * 0.05;
              zIndex = 20 - (idx - activeIndex);
              opacity = 0.95;
              brightness = 0.85;
            }

            return (
              <motion.div
                key={occasion.id || occasion._id || `occ-${idx}`}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.25}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                animate={{ x, scale, zIndex, opacity, filter: `brightness(${brightness})` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute w-[75vw] sm:w-[50vw] md:w-[350px] h-[400px] cursor-grab active:cursor-grabbing origin-center"
              >
                <Link
                  to={occasion.link}
                  draggable={false}
                  onClick={(e) => {
                    if (isDragging) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full h-full block relative rounded-[36px] overflow-hidden group shadow-[0_20px_40px_rgba(0,0,0,0.12)] hover:shadow-[0_28px_56px_rgba(212,175,55,0.25)] transition-all duration-500"
                >
                  <div className="absolute inset-0 w-full h-full">
                    {occasion.image ? (
                      <CloudinaryImage
                        src={occasion.image}
                        alt={occasion.label}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 select-none pointer-events-none"
                        containerClassName="absolute inset-0 w-full h-full"
                        sizes="(max-width: 640px) 75vw, (max-width: 768px) 50vw, 350px"
                        width={350}
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-container-high" aria-hidden="true" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Liquid Glass Shield Bulge Effect */}
                    <div className="absolute inset-0 rounded-[36px] pointer-events-none shadow-[inset_0_4px_14px_rgba(255,255,255,0.4),inset_0_-4px_14px_rgba(0,0,0,0.4)] border-[1.5px] border-white/30 group-hover:border-white/50 group-hover:shadow-[inset_0_6px_20px_rgba(255,255,255,0.5),inset_0_-6px_20px_rgba(0,0,0,0.5)] transition-all duration-500 z-20" />
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-8 flex items-end justify-between z-10 pb-8 gap-4">
                    <div className="flex flex-col items-start text-left min-w-0">
                      <span className="font-serif text-[18px] sm:text-[22px] lg:text-[26px] text-white font-normal tracking-[0.05em] uppercase drop-shadow-md leading-tight break-words hyphens-auto">
                        {occasion.label}
                      </span>
                      {occasion.desc && (
                        <span className="text-[13px] text-white/85 leading-normal mt-1.5 italic font-light font-body drop-shadow line-clamp-1 truncate max-w-[200px]">
                          {occasion.desc}
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full border border-white/40 text-white flex items-center justify-center backdrop-blur-sm group-hover:bg-white group-hover:text-black group-hover:border-white transition-all duration-350 shadow-md">
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Navigation indicator dots */}
        <div className="flex justify-center items-center gap-3 mt-6 relative z-20">
          {occasions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className="transition-all duration-350 cursor-pointer"
              style={{
                width: activeIndex === idx ? '9px' : '6px',
                height: activeIndex === idx ? '9px' : '6px',
                minWidth: activeIndex === idx ? '9px' : '6px',
                minHeight: activeIndex === idx ? '9px' : '6px',
                borderRadius: '50%',
                backgroundColor:
                  activeIndex === idx ? 'var(--color-primary)' : 'rgba(180, 150, 100, 0.25)',
                border: 'none',
                padding: 0,
                margin: 0,
                display: 'block',
              }}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* --- DESKTOP EXPANDING ACCORDION LAYOUT --- */}
      <div className="hidden lg:flex w-full max-w-[1200px] mx-auto h-[600px] gap-4 mt-8 px-8 relative z-20">
        {occasions.map((occasion, idx) => (
          <Link
            key={occasion.id || occasion._id || `occ-desk-${idx}`}
            to={occasion.link}
            className="group relative h-full flex-1 hover:flex-[3] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden rounded-[32px] border border-black/5 shadow-md hover:shadow-2xl cursor-pointer"
          >
            {occasion.image ? (
              <CloudinaryImage
                src={occasion.image}
                alt={occasion.label}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                containerClassName="absolute inset-0 w-full h-full"
                sizes="(max-width: 1024px) 100vw, 300px"
                width={350}
              />
            ) : (
              <div
                className="absolute inset-0 w-full h-full bg-surface-container-high"
                aria-hidden="true"
              />
            )}
            {/* Base dark gradient, becomes darker on hover for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 opacity-70 group-hover:opacity-90 transition-all duration-700"></div>

            <div className="absolute inset-0 flex flex-col justify-end p-8">
              {/* Vertical Text (Visible when contracted) */}
              <div className="absolute inset-0 flex flex-col justify-end items-center pb-12 pointer-events-none group-hover:opacity-0 transition-opacity duration-300">
                <span className="text-white font-serif tracking-[0.2em] text-2xl uppercase -rotate-90 origin-bottom-left absolute left-1/2 -ml-3 bottom-12 whitespace-nowrap opacity-80">
                  {occasion.label}
                </span>
              </div>

              {/* Expanded Content (Visible on hover) */}
              <div className="opacity-0 translate-y-12 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-100 flex flex-col items-start w-[320px] max-w-full">
                <span className="font-serif text-[36px] text-white leading-none mb-3 drop-shadow-lg uppercase tracking-wider">
                  {occasion.label}
                </span>
                <p className="text-white/80 font-body text-[15px] italic font-light mb-8 line-clamp-1 truncate leading-relaxed">
                  {occasion.desc}
                </p>
                <div className="w-14 h-14 rounded-full border border-white text-white flex items-center justify-center backdrop-blur-md hover:bg-white hover:text-black transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
