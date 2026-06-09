import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import { useProducts } from '../../../hooks/useProductQueries';
import { HomeSectionState } from '../../../components/homepage/HomeSectionState';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';

/**
 * Full-width hero displaying top products and auto-scrolling.
 */
export function HeroCarousel() {
  const cms = useWebsiteContent({ includeDefaults: false });
  const cmsLoading = cms?.loading;
  const heroConfig = cms?.hero;
  const selectedProductIds = heroConfig?.selectedProductIds || [];

  // Fetch only specifically selected products
  const { data: productData, isPending: productsLoading } = useProducts(
    { ids: selectedProductIds.join(','), limit: 10 },
    { enabled: selectedProductIds.length > 0 },
  );

  const fetchedProducts =
    productData?.data ||
    productData?.products ||
    productData?.items ||
    (Array.isArray(productData) ? productData : []);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef(null);

  // Map products to hero slides
  const slides = fetchedProducts.map((p) => ({
    id: p.id || p._id,
    title: p.title || p.name,
    subtitle: p.category,
    badgeText: 'FEATURED',
    ctaPrimary: { text: 'Shop Now', link: `/product/${p.id || p._id}` },
    backgroundImage: p.image || p.imageSrc,
    mobileBackgroundImage: p.image || p.imageSrc,
  }));

  // Swipe tracking
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const handleInteraction = () => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => setIsPaused(false), 4000);
  };

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    handleInteraction();
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    } else if (distance < -minSwipeDistance) {
      setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    }
  };

  const onMouseDown = (e) => {
    setTouchEnd(null);
    setTouchStart(e.clientX);
    handleInteraction();
  };

  const onMouseMove = (e) => {
    if (touchStart !== null) setTouchEnd(e.clientX);
  };

  const onMouseUpHandler = () => {
    if (touchStart === null || touchEnd === null) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    } else if (distance < -minSwipeDistance) {
      setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const onMouseLeave = () => {
    if (touchStart !== null) onMouseUpHandler();
  };

  // Auto-slide effect
  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  if ((productsLoading && selectedProductIds.length > 0) || cmsLoading) {
    return (
      <div className="w-full h-[70vh] bg-surface-container-high relative animate-pulse">
        <div className="absolute bottom-16 left-8 md:left-16 flex flex-col gap-6 w-full max-w-2xl z-10">
          <div className="h-5 w-40 bg-surface-container-highest/80 rounded-full"></div>
          <div className="h-16 md:h-24 w-3/4 bg-surface-container-highest/80 rounded-2xl"></div>
          <div className="h-6 w-2/3 bg-surface-container-highest/80 rounded-full mt-2"></div>
          <div className="h-14 w-48 bg-surface-container-highest/80 rounded-full mt-6"></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-bright via-transparent to-transparent"></div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <HomeSectionState
        title="Hero banner is not configured"
        message="Select products in the Admin panel to display in this section."
        icon="wallpaper"
      />
    );
  }

  return (
    <section className="h1-hero">
      {/* Hero Carousel */}
      <div
        className="h1-hero__carousel"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUpHandler}
        onMouseLeave={onMouseLeave}
        onDragStart={(e) => e.preventDefault()}
      >
        {slides.map((slide, idx) => {
          const isActive = idx === currentSlide;
          return (
            <div
              key={slide.id}
              className={`h1-hero__slide ${isActive ? 'h1-hero__slide--active' : ''} relative`}
            >
              {/* Invisible overlay link to make the entire slide clickable */}
              {slide.ctaPrimary?.link && (
                <Link
                  to={slide.ctaPrimary.link}
                  className="absolute inset-0 z-10"
                  aria-label={`View details for ${slide.title}`}
                />
              )}

              <div className="h1-hero__slide-image-wrap bg-black">
                {/* 1. Blurred Background Image (Desktop Only) */}
                <CloudinaryImage
                  src={slide.backgroundImage}
                  alt=""
                  className="hidden md:block w-full h-full object-cover opacity-60 blur-[60px] scale-125"
                  loading={isActive ? 'eager' : 'lazy'}
                  fetchPriority={isActive ? 'high' : 'auto'}
                  containerClassName="hidden md:block w-full h-full absolute inset-0 overflow-hidden"
                  sizes="100vw"
                  aria-hidden="true"
                />

                {/* 2. Dark Gradient Overlay (Desktop Only) */}
                <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-[1]" />

                {/* 3. Sharp Foreground Image (Full on mobile, right-aligned with mask on desktop) */}
                <CloudinaryImage
                  src={slide.backgroundImage}
                  alt={slide.title}
                  className="h1-hero__slide-image w-full h-full object-cover md:object-cover"
                  loading={isActive ? 'eager' : 'lazy'}
                  fetchPriority={isActive ? 'high' : 'auto'}
                  containerClassName="w-full md:w-[60%] h-full relative z-[2] ml-auto"
                  sizes="(max-width: 768px) 100vw, 60vw"
                />

                <div className="h1-hero__slide-overlay z-[3]" />
              </div>

              <div className="h1-hero__slide-content relative z-20 pointer-events-none">
                {slide.badgeText && (
                  <span className="h1-hero__slide-kicker">{slide.badgeText}</span>
                )}
                <h2 className="h1-hero__slide-title">{slide.title}</h2>
                <p className="h1-hero__slide-tagline">{slide.subtitle}</p>

                <div className="flex flex-wrap items-center gap-6 mt-4">
                  {slide.ctaPrimary?.text && slide.ctaPrimary?.link && (
                    <Link
                      to={slide.ctaPrimary.link}
                      className="h1-hero__slide-cta pointer-events-auto"
                    >
                      {slide.ctaPrimary.text}
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {slides.length > 1 && (
          <div className="h1-hero__dots">
            {slides.map((_, idx) => (
              <button
                key={idx}
                className={`h1-hero__dot ${idx === currentSlide ? 'h1-hero__dot--active' : ''}`}
                onClick={() => {
                  setCurrentSlide(idx);
                  handleInteraction();
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
