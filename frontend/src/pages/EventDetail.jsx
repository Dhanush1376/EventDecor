import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { EventDetailSkeleton } from '../components/ui/Skeleton';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useRecommendationTracker } from '../hooks/useRecommendationTracker';
import { eventService, showcaseService } from '../services/domainServices';
import logger from '../utils/core/logger';

// Extracted Components
import { useEventBookingForm } from './eventDetail/useEventBookingForm';
import { EventGallery } from './eventDetail/EventGallery';
import { EventBookingCard } from './eventDetail/EventBookingCard';
import { EventCustomizerDrawer } from './eventDetail/EventCustomizerDrawer';

// Lazy loading Recommendations
const RecommendationSystem = React.lazy(() =>
  import('../components/sections/RecommendationSystem').then((m) => ({
    default: m.RecommendationSystem,
  })),
);

import { ShowcaseReviews } from '../components/sections/ShowcaseReviews';

export function EventDetail() {
  const { id } = useParams();
  const { isAuthenticated, runProtectedAction } = useAuth();
  const { toggleItem, isWishlisted } = useWishlist();

  const [event, setEvent] = useState(null);
  const [_relatedEvents, setRelatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState(null);

  const reserveButtonRef = useRef(null);

  // Use Custom Hook for all booking form logic
  const bookingForm = useEventBookingForm(
    event,
    isAuthenticated,
    runProtectedAction,
    () => (window.location.href = '/events'),
  );
  const { state: bookingState, actions: bookingActions } = bookingForm;

  // Sticky Mobile Hook & Observer
  const [showMobileSticky, setShowMobileSticky] = useState(false);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const lastScrollY = useRef(0);

  useRecommendationTracker({
    targetType: 'event',
    targetId: event?._id || event?.id,
    category: event?.category,
    price: event?.basePrice || event?.rentalPrice,
    style: event?.style,
  });

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
        setIsScrollingDown(currentScrollY > lastScrollY.current && currentScrollY > 100);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!reserveButtonRef.current) {
      setShowMobileSticky(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowMobileSticky(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(reserveButtonRef.current);
    return () => observer.disconnect();
  }, [loading, event]);

  useEffect(() => {
    if (showMobileSticky && !isScrollingDown) {
      document.body.classList.add('sticky-atc-active');
    } else {
      document.body.classList.remove('sticky-atc-active');
    }
    return () => document.body.classList.remove('sticky-atc-active');
  }, [showMobileSticky, isScrollingDown]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let res = await showcaseService.getById(id).catch((err) => {
          logger.warn('Not found in showcases', err);
          return null;
        });

        if (!res?.success || !res?.data) {
          res = await eventService.getById(id);
        }

        if (res?.success) setEvent(res.data);

        const relatedRes = await showcaseService.getAll();
        if (relatedRes.success) {
          setRelatedEvents(relatedRes.data.filter((e) => e._id !== id && e.id !== id).slice(0, 4));
        }
      } catch (err) {
        logger.error('Failed to fetch event details', err);
        setError('Could not load event details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) return <EventDetailSkeleton />;

  if (!event) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-display text-4xl text-black mb-4">Masterpiece Not Found</h1>
        <p className="font-body text-stone-600 mb-8 max-w-md">
          This event setup might have been archived or customized for a private client.
        </p>
        <Link
          to="/events"
          className="px-8 py-3 bg-primary text-black rounded-full font-label-sm uppercase tracking-widest"
        >
          Explore Current Collections
        </Link>
      </div>
    );
  }

  const livePrice = bookingActions.calculateLivePrice();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-surface selection:bg-[#C4A87C]/30 selection:text-black"
    >
      <SEO
        title={`${event.title} | Premium Decor`}
        description={event.description}
        image={event.image}
      />

      <section className="pt-24 pb-8 lg:pt-32 lg:pb-12 bg-surface">
        <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop space-y-6 lg:space-y-8">
          <nav className="hidden lg:flex items-center gap-2 font-label text-[10px] uppercase tracking-widest text-black/40 font-bold overflow-x-auto whitespace-nowrap no-scrollbar">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <Link to="/events" className="hover:text-primary transition-colors">
              Collections
            </Link>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-black line-clamp-1">{event.title}</span>
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-12 lg:grid-cols-12 gap-8 lg:gap-12 lg:gap-16 items-start">
            <div className="md:col-span-7 lg:col-span-7 space-y-10 lg:space-y-16">
              <EventGallery event={event} toggleItem={toggleItem} isWishlisted={isWishlisted} />
              <div className="space-y-4">
                <span className="font-label-sm text-primary text-[10px] lg:text-xs uppercase tracking-[0.2em] font-bold block">
                  {event.category}
                </span>
                {event.rating > 0 && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span
                      className="material-symbols-outlined text-[14px] text-[#D4A853]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    <span className="font-body text-xs font-bold text-black">
                      {event.rating?.toFixed(1)}
                    </span>
                    <span className="font-body text-[10px] text-stone-500">
                      ({event.reviewCount || 0} reviews)
                    </span>
                  </div>
                )}
                <h1 className="font-display text-[32px] lg:text-[48px] lg:text-[56px] text-black leading-[1.05] font-normal mt-2">
                  {event.title}
                </h1>
                <p className="font-body text-[15px] lg:text-[16px] text-stone-600 leading-relaxed font-light max-w-2xl">
                  {event.description}
                </p>
              </div>
            </div>

            <EventBookingCard
              event={event}
              toggleItem={toggleItem}
              isWishlisted={isWishlisted}
              setIsDrawerOpen={bookingActions.setIsDrawerOpen}
              reserveButtonRef={reserveButtonRef}
            />
          </div>
        </div>
      </section>

      {/* Event Showcases */}
      {_relatedEvents && _relatedEvents.length > 0 && (
        <section className="bg-surface py-8 lg:py-12 border-t border-outline-variant/30">
          <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop">
            <h2 className="font-display text-xl lg:text-2xl text-black mb-6 lg:mb-8 text-left lg:text-left">
              Explore More Showcases
            </h2>
            <div className="flex overflow-x-auto gap-4 lg:gap-6 no-scrollbar pb-6 snap-x snap-mandatory">
              {_relatedEvents.map((showcase) => (
                <div
                  key={showcase._id || showcase.id}
                  className="w-[200px] lg:w-[280px] shrink-0 snap-start"
                >
                  <Link to={`/events/${showcase._id || showcase.id}`} className="block group">
                    <div className="aspect-[4/5] lg:aspect-[4/3] rounded-2xl overflow-hidden bg-surface-container mb-3 lg:mb-4">
                      <img
                        src={showcase.image || showcase.images?.[0]}
                        alt={showcase.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-primary text-[9px] lg:text-[10px] uppercase tracking-[0.2em] font-bold mb-1">
                        {showcase.category || 'Showcase'}
                      </span>
                      <h3 className="font-display text-lg text-black group-hover:text-primary transition-colors line-clamp-1">
                        {showcase.title}
                      </h3>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Review Section */}
      <ShowcaseReviews showcaseId={event._id || event.id} showcaseTitle={event.title} />

      {/* Smart Recommendations */}
      <React.Suspense
        fallback={<div className="h-44 w-full rounded-2xl bg-surface-container animate-pulse" />}
      >
        <RecommendationSystem
          category={event.category}
          currentProductId={event._id || event.id}
          targetType="event"
        />
      </React.Suspense>

      {/* Mobile Sticky CTA */}
      <AnimatePresence>
        {showMobileSticky && !isScrollingDown && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: 'spring' }}
            className="sticky-mobile-atc fixed bottom-0 left-0 w-full h-[80px] z-[100] lg:hidden bg-white/95 backdrop-blur-xl border-t border-outline-variant/15 px-6 flex items-center justify-between shadow-lg"
          >
            <div className="flex flex-col truncate">
              <span className="font-label text-[8px] uppercase tracking-[0.25em] text-stone-500 font-bold">
                Estimated Rental
              </span>
              <p className="font-sans text-[15px] text-black font-bold">
                ₹{livePrice.toLocaleString('en-IN')}
              </p>
            </div>
            <button
              onClick={() => bookingActions.setIsDrawerOpen(true)}
              className="bg-black text-white h-10 px-5 rounded-full font-label text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5"
            >
              <span>Book Now</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <EventCustomizerDrawer event={event} bookingForm={bookingForm} />
    </motion.div>
  );
}
