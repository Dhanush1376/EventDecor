import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { SectionHeader } from '../../../components/shared/SectionHeader';
import { MandalaElement } from '../../../components/ui/MandalaElement';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';
import { useState, useEffect } from 'react';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import { HomeSectionState } from '../../../components/homepage/HomeSectionState';

/**
 * Shop By Occasion / Event Types using real digital studio event types.
 * Styled as a swipable stacked card carousel.
 */
export function ShopByOccasion({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const config = activeCms?.shopByOccasion || {};
  const loading = !previewContent && cms?.loading;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [showcases, setShowcases] = useState([]);
  const [showcasesLoading, setShowcasesLoading] = useState(true);

  useEffect(() => {
    import('../../../services/domainServices').then(({ showcaseService }) => {
      showcaseService
        .getAll()
        .then((res) => {
          const list = res?.data || [];
          setShowcases(Array.isArray(list) ? list : []);
        })
        .catch(() => setShowcases([]))
        .finally(() => setShowcasesLoading(false));
    });
  }, []);

  const selectedShowcaseIds = config.selectedShowcaseIds || [];

  if (loading || showcasesLoading) {
    return (
      <section className="h1-section relative overflow-hidden isolate" id="h1-occasions">
        <div className="max-w-[1400px] mx-auto px-6 mb-24 animate-pulse">
          <div className="flex flex-col items-center text-center mb-8 lg:mb-10">
            <div className="h-3 w-24 bg-surface-container-high rounded-full mb-2"></div>
            <div className="h-8 lg:h-10 w-56 lg:w-72 bg-surface-container-high rounded-full"></div>
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

  if (config.isVisible === false) return null;

  const occasions = showcases
    .filter((sc) => selectedShowcaseIds.includes(sc._id || sc.id))
    .map((sc) => {
      return {
        id: sc._id || sc.id,
        label: sc.title,
        link: `/events/${sc._id || sc.id}`,
        image: sc.image,
      };
    });

  if (!occasions || occasions.length === 0) {
    return (
      <HomeSectionState
        title={`No occasions available for ${config.sectionTitle || 'Shop By Occasion'}`}
        message="Configure showcases in the admin dashboard."
        icon="celebration"
      />
    );
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
          kicker={config.sectionSubtitle !== undefined ? config.sectionSubtitle : config.kicker}
          title={config.sectionTitle || 'Shop By Occasion'}
          seeAllLink={config.seeAllLink || '/collections'}
          hideUnderline={true}
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

            // Circular array math for infinite looping
            const N = occasions.length;
            let diff = idx - activeIndex;

            // Normalize diff to be between -N/2 and N/2
            if (diff > N / 2) {
              diff -= N;
            } else if (diff < -N / 2) {
              diff += N;
            }

            if (diff < 0) {
              x = `-${95 + (Math.abs(diff) - 1) * 90}%`;
              scale = 0.85;
              zIndex = 20 - Math.abs(diff);
              opacity = 0.9;
              brightness = 0.6;
            } else if (diff > 0) {
              x = `${95 + (diff - 1) * 90}%`;
              scale = 0.85;
              zIndex = 20 - diff;
              opacity = 0.9;
              brightness = 0.6;
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
                className="absolute w-[75vw] sm:w-[50vw] lg:w-[350px] h-[400px] cursor-grab active:cursor-grabbing origin-center"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

                    {/* Liquid Glass Shield Bulge Effect */}
                    <div className="absolute inset-0 rounded-[36px] pointer-events-none shadow-[inset_0_4px_14px_rgba(255,255,255,0.4),inset_0_-4px_14px_rgba(0,0,0,0.4)] border-[1.5px] border-white/30 group-hover:border-white/50 group-hover:shadow-[inset_0_6px_20px_rgba(255,255,255,0.5),inset_0_-6px_20px_rgba(0,0,0,0.5)] transition-all duration-500 z-20" />
                  </div>

                  {/* Elegant Editorial Mobile Overlay */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex flex-col justify-end z-10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      idx === activeIndex
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-6 pointer-events-none'
                    }`}
                  >
                    <div className="flex items-end justify-between gap-4 w-full">
                      <div className="flex flex-col items-start text-left min-w-0 flex-1">
                        <h3 className="font-serif text-[20px] sm:text-[22px] text-white font-normal tracking-wide leading-tight drop-shadow-md break-words">
                          {occasion.label}
                        </h3>
                      </div>

                      {/* Simple minimal arrow, no circles or borders */}
                      <div className="flex-shrink-0 text-white flex items-center justify-center transition-transform duration-500 group-hover:translate-x-2">
                        <span className="material-symbols-outlined text-[28px] sm:text-[32px] font-light">
                          arrow_right_alt
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
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
            {/* Base dark gradient, becomes slightly darker on hover for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-60 group-hover:opacity-80 transition-all duration-700"></div>

            <div className="absolute inset-0 flex flex-col justify-end p-8">
              {/* Vertical Text (Visible when contracted) */}
              <div className="absolute inset-0 flex flex-col justify-end items-center pb-12 pointer-events-none group-hover:opacity-0 transition-opacity duration-300">
                <span className="text-white font-serif tracking-widest text-lg xl:text-xl uppercase -rotate-90 origin-bottom-left absolute left-1/2 -ml-3 bottom-12 whitespace-nowrap opacity-80 max-w-[450px] truncate">
                  {occasion.label}
                </span>
              </div>

              {/* Expanded Content (Visible on hover) */}
              <div className="absolute bottom-0 left-0 right-0 opacity-0 translate-y-8 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-100 p-8 xl:p-12 flex flex-row items-end justify-between gap-6 overflow-hidden">
                <div className="flex flex-col items-start min-w-0 flex-1 relative z-10">
                  <h3 className="font-serif text-[24px] xl:text-[28px] text-white leading-tight drop-shadow-lg font-normal min-w-0 break-words w-full">
                    {occasion.label}
                  </h3>
                </div>

                <div className="flex-shrink-0 text-white flex items-center justify-center transition-transform duration-500 group-hover:translate-x-3 relative z-10">
                  <span className="material-symbols-outlined text-[36px] xl:text-[44px] font-light">
                    arrow_right_alt
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
