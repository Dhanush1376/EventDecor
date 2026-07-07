import { Link } from 'react-router-dom';
import { CloudinaryImage } from '../../../components/ui/CloudinaryImage';
import { useState, useEffect, useRef } from 'react';
import { useWebsiteContent } from '../../../hooks/useWebsiteContent';
import { useProducts } from '../../../hooks/useProductQueries';

/**
 * Full-width hero displaying top products and auto-scrolling.
 */
export function HeroCarousel({ previewContent }) {
  const cms = useWebsiteContent({ includeDefaults: false });
  const activeCms = previewContent || cms;
  const heroConfig = activeCms?.hero;
  const productIds = heroConfig?.productIds || [];
  const cmsLoading = activeCms?.loading;

  // Fetch only specifically selected products
  const { data: productData, isPending: productsLoading } = useProducts(
    { ids: productIds.join(','), limit: 10 },
    { enabled: productIds.length > 0 },
  );

  const fetchedProducts =
    productData?.data ||
    productData?.products ||
    productData?.items ||
    (Array.isArray(productData) ? productData : []);

  const [featuredShowcases, setFeaturedShowcases] = useState([]);
  const [showcasesLoading, setShowcasesLoading] = useState(true);

  useEffect(() => {
    import('../../../services/domainServices').then(({ showcaseService }) => {
      showcaseService
        .getAll()
        .then((res) => {
          const list = res?.data || [];
          setFeaturedShowcases((Array.isArray(list) ? list : []).filter((sc) => sc.featured));
        })
        .catch(() => setFeaturedShowcases([]))
        .finally(() => setShowcasesLoading(false));
    });
  }, []);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef(null);

  // Map products to hero slides
  const productSlides = fetchedProducts.map((p) => ({
    id: p.id || p._id,
    title: p.title || p.name,
    subtitle: p.category,
    badgeText: 'FEATURED',
    ctaPrimary: { text: 'Shop Now', link: `/product/${p.id || p._id}` },
    backgroundImage: p.image || p.imageSrc,
    mobileBackgroundImage: p.image || p.imageSrc,
  }));

  const showcaseSlides = featuredShowcases.map((sc) => ({
    id: sc.id || sc._id,
    title: sc.title,
    subtitle: sc.category?.replace('_', ' '),
    badgeText: 'FEATURED SHOWCASE',
    ctaPrimary: { text: 'Explore Showcase', link: `/events/${sc.id || sc._id}` },
    backgroundImage: sc.image,
    mobileBackgroundImage: sc.image,
  }));

  const slides = [...productSlides, ...showcaseSlides];

  // Track which slides have been initialized to prevent downloading all images on initial load
  const [initializedSlides, setInitializedSlides] = useState([0]);

  useEffect(() => {
    setInitializedSlides((prev) => {
      if (slides.length === 0) return prev;
      const nextSlide = (currentSlide + 1) % slides.length;
      if (prev.includes(currentSlide) && prev.includes(nextSlide)) return prev;
      return Array.from(new Set([...prev, currentSlide, nextSlide]));
    });
  }, [currentSlide, slides.length]);

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

  if ((productsLoading && productIds.length > 0) || showcasesLoading || cmsLoading) {
    return (
      <div className="w-full h-[70vh] bg-surface-container-high relative animate-pulse">
        <div className="absolute bottom-16 left-8 lg:left-16 flex flex-col gap-6 w-full max-w-2xl z-10">
          <div className="h-5 w-40 bg-surface-container-highest/80 rounded-full"></div>
          <div className="h-16 lg:h-24 w-3/4 bg-surface-container-highest/80 rounded-2xl"></div>
          <div className="h-6 w-2/3 bg-surface-container-highest/80 rounded-full mt-2"></div>
          <div className="h-14 w-48 bg-surface-container-highest/80 rounded-full mt-6"></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface-bright via-transparent to-transparent"></div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <section className="h1-hero">
        <div className="h1-hero__carousel">
          <div className="h1-hero__slide h1-hero__slide--active relative">
            <div className="h1-hero__slide-image-wrap bg-[#1a1817]">
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a1817] via-[#1a1817]/80 to-[#1a1817]/40 z-[3]" />
            </div>
            <div className="h1-hero__slide-content relative z-20 pointer-events-none">
              <span className="h1-hero__slide-kicker">Handcrafted Heritage</span>
              <h2 className="h1-hero__slide-title">Artisanal Decor for Every Celebration</h2>
              <p className="h1-hero__slide-tagline">
                Explore our curated collection of handmade Indian wedding & event decorations
              </p>
              <div className="flex flex-wrap items-center gap-6 mt-4">
                <Link to="/collections" className="h1-hero__slide-cta pointer-events-auto">
                  Explore Collections
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
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
                {/* 1. Blurred Background Image (Desktop Only) - Fetching only 100px width! */}
                {initializedSlides.includes(idx) && (
                  <CloudinaryImage
                    src={slide.backgroundImage}
                    alt=""
                    className="hidden lg:block w-full h-full object-cover opacity-60 blur-[60px] scale-125"
                    loading="lazy"
                    fetchPriority="low"
                    containerClassName="hidden lg:block w-full h-full absolute inset-0 overflow-hidden"
                    width={100}
                    sizes="100px"
                    aria-hidden="true"
                    skipObserver={isActive}
                  />
                )}

                {/* 2. Dark Gradient Overlay (Desktop Only) */}
                <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-[1]" />

                {/* 3. Sharp Foreground Image (Full on mobile, right-aligned with mask on desktop) */}
                {initializedSlides.includes(idx) && (
                  <CloudinaryImage
                    src={slide.backgroundImage}
                    alt={slide.title}
                    className="h1-hero__slide-image w-full h-full object-cover lg:object-cover"
                    loading={isActive ? 'eager' : 'lazy'}
                    fetchPriority={isActive ? 'high' : 'auto'}
                    containerClassName="w-full lg:w-[60%] h-full relative z-[2] ml-auto"
                    width={1280}
                    sizes="(max-width: 768px) 100vw, 60vw"
                    skipObserver={isActive}
                  />
                )}

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
          <div className="h1-hero__dots z-[30]">
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
