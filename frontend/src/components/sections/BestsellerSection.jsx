import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { SectionWrapper } from '../layout';
import { ProductCard } from '../ui/ProductCard';
import { MandalaElement } from '../ui/MandalaElement';
import { MandalaArtDecor } from '../ui/MandalaArtDecor';
import { productService } from '../../services/domainServices';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { BestsellerSkeleton } from '../ui/Skeleton';

import logger from '../../utils/logger';
export function BestsellerSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [bestsellers, setBestsellers] = useState([]);
  const [rawBestsellers, setRawBestsellers] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const { featuredProducts, loading: cmsLoading } = useWebsiteContent();

  useEffect(() => {
    const fetchBestsellers = async () => {
      try {
        const res = await productService.getAll({ limit: 10, featured: true });
        if (res.success && res.data) {
          setRawBestsellers(res.data.data || res.data.products || []);
        }
      } catch (err) {
        logger.error('Failed to fetch bestsellers', err);
      } finally {
        setFetchLoading(false);
      }
    };
    fetchBestsellers();
  }, []);

  useEffect(() => {
    if (rawBestsellers.length > 0) {
      let products;
      if (featuredProducts?.productIds && featuredProducts.productIds.length > 0) {
        products = rawBestsellers.filter((p) => featuredProducts.productIds.includes(p._id));
        if (products.length < (featuredProducts.maxDisplay || 4)) {
          const others = rawBestsellers.filter((p) => !featuredProducts.productIds.includes(p._id));
          products = [...products, ...others].slice(0, featuredProducts.maxDisplay || 4);
        }
      } else {
        products = rawBestsellers.slice(0, featuredProducts?.maxDisplay || 4);
      }
      setBestsellers(products);
    }
  }, [rawBestsellers, featuredProducts]);

  if (!cmsLoading && featuredProducts && !featuredProducts.isVisible) return null;
  if (cmsLoading || fetchLoading) return <BestsellerSkeleton />;

  const allItems = [...bestsellers, { id: 'view-all', isViewAll: true }];

  const handleDragEnd = (e, { offset }) => {
    const swipe = offset.x;
    if (swipe < -30 && activeIndex < allItems.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else if (swipe > 30 && activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const index = Math.round(scrollLeft / (clientWidth * 0.5));
      setActiveIndex(Math.min(index, allItems.length - 1));
    }
  };

  const scrollNext = () => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      scrollRef.current.scrollBy({
        left: clientWidth * 0.8,
        behavior: 'smooth',
      });
    }
  };

  const scrollPrev = () => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      scrollRef.current.scrollBy({
        left: -(clientWidth * 0.8),
        behavior: 'smooth',
      });
    }
  };

  return (
    <SectionWrapper
      ref={containerRef}
      className="!py-16 md:!py-29 relative overflow-hidden bg-surface-bright"
    >
      {/* Decorative Texture */}
      <div className="absolute inset-0 bg-marble opacity-[0.03] pointer-events-none mix-blend-multiply"></div>

      {/* Background Atmosphere */}
      <div className="absolute top-1/2 right-0 w-[800px] h-[800px] bg-primary-container/15 rounded-full blur-[160px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <MandalaElement
        className="absolute top-0 -right-36 opacity-[0.03]"
        size={720}
        duration={180}
        variant={2}
      />

      {/* Detailed mandala art accents */}
      <MandalaArtDecor
        variant={1}
        size={300}
        className="-bottom-16 -left-16 md:hidden"
        opacity={0.16}
        blendMode="darken"
        spinDuration={175}
      />
      <MandalaArtDecor
        variant={1}
        size={600}
        className="-bottom-40 -left-40 hidden md:block"
        opacity={0.1}
        blendMode="darken"
        spinDuration={175}
      />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-7 mb-14 md:mb-22 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ type: 'spring', stiffness: 70, damping: 15 }}
          className="max-w-2xl flex flex-col items-center md:items-start text-center md:text-left w-full"
        >
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-primary/20 bg-surface/50 mb-5">
            <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.4em] font-bold">
              Curated Selection
            </span>
          </div>
          <h2 className="font-headline text-[32px] sm:text-[42px] md:text-[65px] text-on-surface leading-[1.1] tracking-tight">
            {(featuredProducts.sectionTitle || 'The Signature Collection.')
              .split(/\n/)
              .map((line, i, arr) => (
                <React.Fragment key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
          </h2>
        </motion.div>

        <div className="flex items-center gap-3.5 hidden md:flex">
          <button
            onClick={scrollPrev}
            className="w-13 h-13 rounded-full border border-black/10 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-all duration-300 shadow-sm active:scale-95 group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">
              arrow_left_alt
            </span>
          </button>
          <button
            onClick={scrollNext}
            className="w-13 h-13 rounded-full border border-black/10 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-all duration-300 shadow-sm active:scale-95 group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_right_alt
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Stacked Carousel (Rummy cards swipe style) */}
      <div className="md:hidden relative h-[520px] w-full flex items-center justify-center overflow-visible touch-pan-y z-20 mt-4 mb-10">
        {allItems.map((item, idx) => {
          let x = '0%';
          let scale = 1;
          let zIndex = 30;
          let opacity = 1;

          if (idx < activeIndex) {
            x = `-${60 + (activeIndex - idx) * 10}%`;
            scale = 0.85 - (activeIndex - idx) * 0.05;
            zIndex = 20 - (activeIndex - idx);
            opacity = 0.5;
          } else if (idx > activeIndex) {
            x = `${60 + (idx - activeIndex) * 10}%`;
            scale = 0.85 - (idx - activeIndex) * 0.05;
            zIndex = 20 - (idx - activeIndex);
            opacity = 0.5;
          }

          return (
            <motion.div
              key={item._id || item.id}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              animate={{ x, scale, zIndex, opacity }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute w-[75vw] sm:w-[65vw] cursor-grab active:cursor-grabbing origin-center"
            >
              {item.isViewAll ? (
                <Link
                  to="/collections"
                  className="flex flex-col items-center justify-center bg-surface border border-outline-variant/30 rounded-[24px] md:rounded-[36px] p-11 group shadow-[0_20px_40px_rgba(0,0,0,0.1)] aspect-[4/5] cursor-pointer"
                >
                  <div className="w-18 h-18 rounded-full border border-black/10 flex items-center justify-center mb-5.5 transition-all duration-500 shadow-lg bg-surface group-hover:bg-primary group-hover:text-white group-hover:border-primary">
                    <span className="material-symbols-outlined text-[29px]">grid_view</span>
                  </div>
                  <div
                    className={`flex flex-col items-center transition-opacity duration-500 ${idx !== activeIndex ? 'opacity-0' : 'opacity-100'}`}
                  >
                    <h3 className="font-display text-[25px] md:text-[32px] text-on-surface mb-3.5 text-center">
                      Discover the <br /> Full Studio
                    </h3>
                    <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.3em] font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
                      Explore All{' '}
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="w-full h-full relative bg-surface-bright rounded-[24px] p-2 flex flex-col shadow-sm">
                  <ProductCard {...item} hideDetails={idx !== activeIndex} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Desktop Horizontal Scroll */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="hidden md:flex gap-9 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-11 -mx-[var(--spacing-margin-desktop)] px-[var(--spacing-margin-desktop)] relative z-10"
      >
        {bestsellers.map((product, idx) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
              type: 'spring',
              stiffness: 70,
              damping: 15,
              delay: idx * 0.05,
            }}
            className="min-w-[360px] xl:min-w-[405px] snap-start"
          >
            <ProductCard {...product} />
          </motion.div>
        ))}

        {/* View All Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{
            type: 'spring',
            stiffness: 70,
            damping: 15,
            delay: bestsellers.length * 0.05,
          }}
          className="min-w-[360px] xl:min-w-[405px] snap-start flex flex-col items-center justify-center bg-surface border border-outline-variant/30 rounded-[36px] p-11 group hover-lift-glow hover:border-primary/30 hover:bg-primary/5 transition-all duration-500 cursor-pointer"
        >
          <Link
            to="/collections"
            className="flex flex-col items-center text-center w-full h-full justify-center"
          >
            <div className="w-18 h-18 rounded-full border border-black/10 flex items-center justify-center mb-5.5 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-500 shadow-lg">
              <span className="material-symbols-outlined text-[29px]">grid_view</span>
            </div>
            <h3 className="font-display text-[25px] md:text-[32px] text-on-surface mb-3.5">
              Discover the <br /> Full Studio
            </h3>
            <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.3em] font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
              Explore All{' '}
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </span>
          </Link>
        </motion.div>
      </div>

      {/* Mobile Scroll Indicators & CTA */}
      <div className="md:hidden mt-4 flex flex-col items-center gap-6 relative z-20">
        <div className="flex justify-center gap-2">
          {allItems.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-500 ${
                activeIndex === idx ? 'w-6 bg-primary' : 'w-1.5 bg-primary/20'
              }`}
            />
          ))}
        </div>

        <Link
          to="/collections"
          className="w-full sm:w-auto px-8 py-4 bg-transparent border border-black/10 text-on-surface rounded-full font-label-sm text-[11px] uppercase tracking-widest font-bold hover:bg-black/5 flex items-center justify-center gap-3"
        >
          Explore All Decor
          <span className="material-symbols-outlined text-[16px]">trending_flat</span>
        </Link>
      </div>
    </SectionWrapper>
  );
}
