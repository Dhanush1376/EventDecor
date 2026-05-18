import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { handleImageError } from "../../utils/imageUtils";
import toast from "react-hot-toast";
import { reviewService } from "../../services/domainServices";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";

// Lazy load heavy interaction overlays to trim the main package bundle size
const PostReviewModal = lazy(() => import("../reviews/PostReviewModal").then((m) => ({ default: m.PostReviewModal })));
const ReviewLightbox = lazy(() => import("../reviews/ReviewLightbox").then((m) => ({ default: m.ReviewLightbox })));

const INITIAL_PREMIUM_REVIEWS = [
  {
    id: 101,
    user: "Meera & Devraj Singhania",
    location: "Jubilee Hills, Hyderabad",
    eventType: "Royal Haldi & Engagement Arch",
    favoriteElement: "Antique Brass Urli & Golden Lotus Archway",
    rating: 5,
    subRatings: { quality: 5, design: 5, delivery: 5, setup: 5, communication: 5 },
    date: "May 14, 2026",
    comment:
      "The Royal Mandap Arch was the absolute soul of our celebration. The gold leaf detailing and brass lotus pillars felt incredibly authentic and royal. Our event planner was astounded by the pristine quality of these handcrafted rental masterpieces. Worth every single rupee for the premium aura it brought to our palace venue!",
    images: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop",
    ],
    video: null,
    verified: true,
    helpfulCount: 34,
    category: "showcase",
    aiPolished: true,
  },
  {
    id: 102,
    user: "Ananya Varma",
    location: "Banjara Hills, Hyderabad",
    eventType: "Traditional Bridal Shower Curation",
    favoriteElement: "Artisanal Coconut Leaf Trays & Hand-carved Pedestals",
    rating: 5,
    subRatings: { quality: 5, design: 5, delivery: 5, setup: 5, communication: 5 },
    date: "May 10, 2026",
    comment:
      "Siri Arts & Crafts redefined what traditional decor means to our family. The delivery concierge arrived perfectly on time, and the setup team transformed our garden marquee into an absolute sanctuary. The handcrafted coconut leaf arrangements and brass diyas were praised by all our elder relatives.",
    images: [
      "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=800&auto=format&fit=crop",
    ],
    video: null,
    verified: true,
    helpfulCount: 28,
    category: "event",
    aiPolished: false,
  },
  {
    id: 103,
    user: "Vikramaditya Rao",
    location: "Gachibowli, Hyderabad",
    eventType: "Corporate Heritage Banquet",
    favoriteElement: "Handcrafted Brass Diya Stands & Silk Drapes",
    rating: 5,
    subRatings: { quality: 5, design: 5, delivery: 5, setup: 5, communication: 5 },
    date: "April 28, 2026",
    comment:
      "We rented the premium stage backdrop and 12 antique brass stands for our annual corporate heritage gala. The entire booking experience was flawless. Seamless online quotation, lightning-fast delivery, and an immaculate setup that radiated prestige.",
    images: [
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop",
    ],
    video: "https://assets.mixkit.co/videos/preview/mixkit-wedding-table-decorations-and-candles-43285-large.mp4",
    verified: true,
    helpfulCount: 52,
    category: "product",
    aiPolished: true,
  },
];

const METRICS = {
  overall: 4.9,
  totalReviews: 1284,
  satisfactionRate: "99.4%",
  topLovedProp: "Golden Mandap Pillars",
};

export const VerifiedReviews = () => {
  const { reels } = useWebsiteContent();
  const [reviewsList, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState({ isOpen: false, media: [], activeIndex: 0 });
  const [helpfulLiked, setHelpfulLiked] = useState({});

  // Infinite scroll carousel states and auto-scroll handlers
  const scrollRef = React.useRef(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const filteredReviews = React.useMemo(() => {
    return reviewsList.filter((rev) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "media") return (rev.images && rev.images.length > 0) || rev.video;
      return rev.category === activeFilter;
    });
  }, [reviewsList, activeFilter]);

  const marqueeReviews = React.useMemo(() => {
    if (filteredReviews.length === 0) return [];
    // Triple the array to create a seamless infinite loop scrolling effect
    return [...filteredReviews, ...filteredReviews, ...filteredReviews];
  }, [filteredReviews]);

  // Center scroll position on mount/change to allow seamless scrolling in both directions
  useEffect(() => {
    const slider = scrollRef.current;
    if (!slider || filteredReviews.length === 0) return;

    // Start in the middle segment
    const maxScroll = slider.scrollWidth / 3;
    slider.scrollLeft = maxScroll;
  }, [filteredReviews]);

  // Continuous auto-scrolling loop using requestAnimationFrame
  useEffect(() => {
    const slider = scrollRef.current;
    if (!slider || filteredReviews.length === 0) return;

    let animationId;
    const speed = 0.5; // Smooth scroll speed (pixels per frame)

    const scroll = () => {
      if (!isDown && !isHovered) {
        slider.scrollLeft += speed;

        const maxScroll = slider.scrollWidth / 3;
        // Seamless loop boundaries
        if (slider.scrollLeft >= maxScroll * 2) {
          slider.scrollLeft -= maxScroll;
        } else if (slider.scrollLeft <= 0) {
          slider.scrollLeft += maxScroll;
        }
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isDown, isHovered, filteredReviews]);

  // Mouse drag-to-scroll event handlers
  const handleMouseDown = (e) => {
    const slider = scrollRef.current;
    if (!slider) return;
    setIsDown(true);
    setStartX(e.pageX - slider.offsetLeft);
    setScrollLeftState(slider.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDown(false);
    setIsHovered(false);
  };

  const handleMouseUp = () => {
    setIsDown(false);
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  const handleMouseMove = (e) => {
    const slider = scrollRef.current;
    if (!slider || !isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag sensitivity multiplier
    if (Math.abs(walk) > 5) {
      setIsDragging(true);
    }
    slider.scrollLeft = scrollLeftState - walk;

    // Boundary check during active dragging
    const maxScroll = slider.scrollWidth / 3;
    if (slider.scrollLeft >= maxScroll * 2) {
      slider.scrollLeft -= maxScroll;
      setScrollLeftState(prev => prev - maxScroll);
      setStartX(e.pageX - slider.offsetLeft);
    } else if (slider.scrollLeft <= 0) {
      slider.scrollLeft += maxScroll;
      setScrollLeftState(prev => prev + maxScroll);
      setStartX(e.pageX - slider.offsetLeft);
    }
  };

  useEffect(() => {
    const fetchLiveReviews = async () => {
      try {
        const response = await reviewService.getPublicReviews({ limit: 50 });
        if (response.success && response.data) {
          const liveData = response.data.data || response.data;
          const liveReviews = (Array.isArray(liveData) ? liveData : []).map(r => ({
            id: r._id || r.id,
            user: r.customerName || "Patron Customer",
            location: r.location || "Hyderabad",
            eventType: r.eventType || "Traditional Event",
            favoriteElement: r.favoriteElement || "Artisanal Curation",
            rating: r.rating || 5,
            subRatings: { quality: r.rating, design: r.rating, delivery: 5, setup: 5, communication: 5 },
            date: new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            comment: r.comment,
            images: r.images || [],
            video: null,
            verified: r.verified !== undefined ? r.verified : true,
            helpfulCount: r.helpfulCount || 0,
            category: r.category || "product",
            aiPolished: false,
          }));

          setReviewsList(liveReviews);
        }
      } catch (err) {
        console.error("Failed to fetch live reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveReviews();
  }, []);

  const handleHelpfulClick = async (id) => {
    if (helpfulLiked[id]) return;
    setHelpfulLiked((prev) => ({ ...prev, [id]: true }));
    setReviewsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r))
    );
    toast.success("Thank you for endorsing this celebration story!", { icon: "👍" });

    // If it's a dynamic review with a MongoDB ObjectID, trigger the backend API
    if (typeof id === "string" && id.length === 24) {
      try {
        await reviewService.incrementHelpful(id);
      } catch (err) {
        console.error("Failed to increment helpful count in database:", err);
      }
    }
  };

  const handleNewReviewSubmit = async (newRevData) => {
    try {
      const reviewPayload = {
        rating: newRevData.rating,
        comment: newRevData.comment,
        images: newRevData.images || [],
        customerName: newRevData.user,
        location: newRevData.location,
        eventType: newRevData.eventType,
        favoriteElement: newRevData.favoriteElement,
        category: newRevData.experienceType || "product",
      };

      const response = await reviewService.create(reviewPayload);
      if (response.success && response.data) {
        const savedRev = response.data;
        const mappedRev = {
          id: savedRev._id || savedRev.id,
          user: savedRev.customerName || "Patron Customer",
          location: savedRev.location || "Hyderabad",
          eventType: savedRev.eventType || "Traditional Event",
          favoriteElement: savedRev.favoriteElement || "Artisanal Curation",
          rating: savedRev.rating || 5,
          subRatings: { quality: savedRev.rating, design: savedRev.rating, delivery: 5, setup: 5, communication: 5 },
          date: "Today",
          comment: savedRev.comment,
          images: savedRev.images || [],
          video: null,
          verified: true,
          helpfulCount: 0,
          category: savedRev.category || "product",
          aiPolished: false,
        };
        setReviewsList((prev) => [mappedRev, ...prev]);
        toast.success("Your luxury event testimonial was saved in our database!");
      } else {
        setReviewsList((prev) => [newRevData, ...prev]);
      }
    } catch (err) {
      console.error("Failed to save review to database:", err);
      setReviewsList((prev) => [newRevData, ...prev]);
    }
  };

  const openMediaLightbox = (items, index = 0) => {
    setLightboxData({ isOpen: true, media: items, activeIndex: index });
  };



  // Extract all media for the Pinterest Gallery rack
  const allGalleryMedia = (reels?.items && reels.items.length > 0)
    ? reels.items.filter(itm => itm.isVisible).map(itm => ({
        url: itm.url,
        type: itm.type || "image",
        caption: itm.caption,
        author: itm.author || "Patron"
      }))
    : reviewsList.reduce((acc, rev) => {
        if (rev.images) {
          rev.images.forEach((img) => acc.push({ url: img, type: "image", caption: `${rev.eventType} · ${rev.user}`, author: rev.user }));
        }
        if (rev.video) {
          acc.push({ url: rev.video, type: "video", caption: `${rev.eventType} Highlights`, author: rev.user });
        }
        return acc;
      }, []);

  if (loading) {
    return null;
  }

  if (reviewsList.length === 0) {
    return null;
  }

  return (
    <section className="relative py-16 md:py-20 bg-[#FCFBF9] overflow-hidden border-t border-[#E8E2D5]/30">
      {/* Background Subtle Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-16 space-y-12 relative z-10">
        
        {/* Elegant Section Title */}
        <div className="text-center max-w-xl mx-auto mb-6">
          <span className="font-label text-[10px] md:text-xs text-[#8C7000] uppercase tracking-[0.4em] font-bold block mb-2">
            MEMORIES
          </span>
          <h2 className="text-2xl md:text-3xl font-display text-[#2D2B29] font-light tracking-tight">
            Client Testimonial
          </h2>
          <div className="w-8 h-[1px] bg-[#D4AF37]/40 mx-auto mt-3" />
        </div>

        {/* Continuous Looping Horizontal Scroll Marquee */}
        {filteredReviews.length === 0 ? (
          <div className="grid grid-cols-1 gap-8 md:gap-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-24 text-center bg-white rounded-[2.5rem] border border-[#E8E2D5] shadow-xs p-8 max-w-lg mx-auto"
            >
              <span className="material-symbols-outlined text-5xl text-[#735C00]/40 mb-4 block">auto_stories</span>
              <h4 className="text-lg font-display font-medium text-[#2D2B29]">No Stories in this Section Yet</h4>
              <p className="text-xs text-[#7F7663] max-w-sm mx-auto mt-2 mb-6 leading-relaxed font-body">
                Be the first to share your milestone memory for this category and register your journey in our patron showcase.
              </p>
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="px-6 py-3 bg-[#735C00] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:bg-[#594700] transition-colors cursor-pointer"
              >
                Post First Testimonial
              </button>
            </motion.div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            className="flex gap-8 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing select-none py-6 px-4"
          >
            {marqueeReviews.map((rev, index) => (
              <div
                key={`${rev.id}-${index}`}
                className="flex-shrink-0 w-[290px] xs:w-[320px] sm:w-[400px] md:w-[450px] bg-white p-8 md:p-10 rounded-[32px] border border-[#EBE6DD] shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between hover:border-[#D4AF37]/40 hover:shadow-[0_16px_40px_rgba(212,175,55,0.06)] hover:-translate-y-1 transition-all duration-500 group relative overflow-hidden"
              >
                <div className="space-y-6">
                  {/* Stars */}
                  <div className="flex gap-1 text-[#D4AF37] text-sm">
                    {[...Array(rev.rating || 5)].map((_, i) => (
                      <span key={i} className="tracking-widest">★</span>
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="font-serif text-[#4A453F] text-base md:text-[17px] font-light leading-relaxed italic mb-6">
                    "{rev.comment || rev.text}"
                  </p>
                </div>

                <div className="mt-8 space-y-5">
                  {/* Optional Attached Media inside Card */}
                  {((rev.images && rev.images.length > 0) || rev.video) && (
                    <div className="flex gap-2 pb-2 border-b border-[#F3EFE7]">
                      {rev.images?.slice(0, 3).map((img, i) => (
                        <div
                          key={i}
                          onClick={() => !isDragging && openMediaLightbox(rev.images.map(url => ({ url, type: "image", caption: rev.eventType, author: rev.user })), i)}
                          className="w-10 h-10 rounded-xl overflow-hidden border border-[#E2DACB] hover:scale-105 transition-transform duration-300 cursor-pointer shadow-2xs shrink-0"
                        >
                          <img onError={handleImageError} src={img} className="w-full h-full object-cover" alt="Customer Memory" />
                        </div>
                      ))}
                      {rev.video && (
                        <div
                          onClick={() => !isDragging && openMediaLightbox([{ url: rev.video, type: "video", caption: rev.eventType, author: rev.user }], 0)}
                          className="w-10 h-10 rounded-xl bg-[#735C00] text-white flex items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-300 shadow-2xs shrink-0"
                          title="Watch Reel"
                        >
                          <span className="material-symbols-outlined text-sm">play_circle</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Profile */}
                  <div className="flex items-center justify-between gap-4 mt-auto">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-[#E2DACB] bg-[#FAF9F6] flex items-center justify-center shrink-0 shadow-2xs">
                        <span className="font-serif text-[#735C00] text-sm font-bold">
                          {(rev.user || rev.name || "C")[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-display font-semibold uppercase tracking-[0.15em] text-[#2D2B29] text-[10px]">
                            {rev.user || rev.name}
                          </h4>
                          {rev.verified && (
                            <span className="material-symbols-outlined text-xs text-emerald-600 font-bold" title="Verified Event">verified</span>
                          )}
                        </div>
                        <p className="font-label text-[#8C7000] uppercase tracking-[0.2em] text-[8px] font-bold mt-0.5">
                          {rev.eventType || "Event"} · {rev.location || "Client"}
                        </p>
                      </div>
                    </div>

                    {/* Helpful Button */}
                    {rev.helpfulCount != null && (
                      <button
                        onClick={() => !isDragging && handleHelpfulClick(rev.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all cursor-pointer font-bold text-[8px] uppercase tracking-wider shrink-0 ${
                          helpfulLiked[rev.id]
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-[#FAF9F6] text-[#685C57] border-[#E2DACB] hover:border-[#735C00] hover:text-[#2D2B29]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[10px]">{helpfulLiked[rev.id] ? "thumb_up" : "thumb_up_off"}</span>
                        {rev.helpfulCount + (helpfulLiked[rev.id] ? 1 : 0)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Invite Curation Block */}
        <div className="pt-10 pb-10 text-center bg-gradient-to-r from-[#FCFBF9] via-[#FAF6EE] to-[#FCFBF9] rounded-[2.5rem] border border-[#E8E2D5] p-8 shadow-inner max-w-4xl mx-auto space-y-6">
          <span className="material-symbols-outlined text-3xl text-[#735C00] animate-pulse">workspace_premium</span>
          <h4 className="text-xl font-display font-medium text-[#2D2B29] tracking-tight">Have You Celebrated with Siri Arts & Crafts?</h4>
          <p className="text-xs md:text-sm text-[#685C57] font-light leading-relaxed max-w-xl mx-auto font-body">
            Share your authentic setup photos, traditional styling memories, and artisan feedback. Join our registry of discerning families and inspire milestone events across the nation.
          </p>
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="px-8 py-3.5 rounded-full bg-[#735C00] text-white font-bold text-[10px] uppercase tracking-widest hover:bg-[#594700] shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer inline-flex items-center gap-2 group active:scale-95"
          >
            Share Your Experience
          </button>
        </div>

      </div>

      {/* Review Submission Modal */}
      {isPostModalOpen && (
        <Suspense fallback={null}>
          <PostReviewModal
            isOpen={isPostModalOpen}
            onClose={() => setIsPostModalOpen(false)}
            onSubmit={handleNewReviewSubmit}
          />
        </Suspense>
      )}

      {/* Lightbox Modal */}
      {lightboxData.isOpen && (
        <Suspense fallback={null}>
          <ReviewLightbox
            isOpen={lightboxData.isOpen}
            media={lightboxData.media}
            activeIndex={lightboxData.activeIndex}
            onClose={() => setLightboxData({ isOpen: false, media: [], activeIndex: 0 })}
          />
        </Suspense>
      )}
    </section>
  );
};

