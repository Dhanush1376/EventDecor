import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "../components/seo/SEO";
import { useWishlist } from "../context/WishlistContext";
import { handleImageError } from "../utils/imageUtils";
import { MandalaElement } from "../components/ui/MandalaElement";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { ShareButton } from "../components/ui/ShareButton";
import { eventService, showcaseService, bookingService } from "../services/domainServices";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { LocationSelectorModal } from "../components/ui/LocationSelectorModal";

import logger from '../utils/logger';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const EVENT_TYPES = [
  { id: "wedding", label: "Wedding / Vivaham", icon: "church", desc: "Grand traditional structures, modular mandaps & royal backdrops" },
  { id: "engagement", label: "Engagement Ceremony", icon: "diamond", desc: "Modern floral panels, elegant backdrops & grand entrances" },
  { id: "haldi", label: "Haldi & Mehndi", icon: "palette", desc: "Vibrant yellow marigold blasting, traditional swings & photo booths" },
  { id: "reception", label: "Reception Gala", icon: "celebration", desc: "Bespoke stage styling, luxury uplighting & contemporary look" },
  { id: "birthday", label: "Birthday / Cradle", icon: "child_care", desc: "Vibrant custom themes, balloon archways & kid-friendly elements" },
  { id: "festival", label: "Festival / Puja Decor", icon: "spa", desc: "Traditional South Indian mango leaves, lotus hangings & brass props" },
  { id: "other", label: "Other Celebration", icon: "more_horiz", desc: "Specify your custom milestone celebration and setup blueprints" },
];

export function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, runProtectedAction } = useAuth();
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxScrollRef = useRef(null);
  const { toggleItem, isWishlisted } = useWishlist();

  const openLightbox = (idx) => {
    setActiveGalleryIndex(idx);
    setIsLightboxOpen(true);
    setTimeout(() => {
      if (lightboxScrollRef.current) {
        lightboxScrollRef.current.scrollTo({
          left: idx * lightboxScrollRef.current.clientWidth,
          behavior: "instant"
        });
      }
    }, 10);
  };

  const [event, setEvent] = useState(null);
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ported Customizer States
  const [customInclusions, setCustomInclusions] = useState([]);
  const [rentalDurationDays, setRentalDurationDays] = useState(1);
  const [selectedPaletteColor, setSelectedPaletteColor] = useState("");
  const [placementPreference, setPlacementPreference] = useState("Side-Stage Showcase Corner");
  const [uploadedReferenceName, setUploadedReferenceName] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [venueDetails, setVenueDetails] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isManualLocationInput, setIsManualLocationInput] = useState(false);
  const [manualVenueName, setManualVenueName] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  const [manualPincode, setManualPincode] = useState("");
  const [guestCount, setGuestCount] = useState(100);
  const [startTime, setStartTime] = useState("09:00 AM");
  const [endTime, setEndTime] = useState("09:00 PM");
  const [isOutdoor, setIsOutdoor] = useState(false);
  const [customizerStep, setCustomizerStep] = useState(1);
  const [eventType, setEventType] = useState("wedding");
  const [customOccasion, setCustomOccasion] = useState("");
  const customizerCardRef = useRef(null);

  useEffect(() => {
    if (venueDetails) {
      setManualVenueName(venueDetails.name || "");
      setManualAddress(venueDetails.address || "");
      setManualCity(venueDetails.city || "");
      setManualState(venueDetails.state || "");
      setManualPincode(venueDetails.pincode || "");
    }
  }, [venueDetails]);

  const handleManualFieldChange = (field, value) => {
    const updated = {
      ...(venueDetails || {
        name: "",
        address: "",
        city: "",
        state: "",
        country: "India",
        pincode: "",
        latitude: null,
        longitude: null,
        googleMapsLink: ""
      }),
      [field]: value
    };

    const namePart = updated.name ? updated.name + ", " : "";
    const fullSearch = `${namePart}${updated.address} ${updated.city} ${updated.state} ${updated.pincode}`.trim();
    updated.googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullSearch)}`;

    setVenueDetails(updated);
  };

  const reserveButtonRef = useRef(null);
  const [showMobileSticky, setShowMobileSticky] = useState(false);

  useEffect(() => {
    if (!reserveButtonRef.current) {
      setShowMobileSticky(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowMobileSticky(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(reserveButtonRef.current);
    return () => observer.disconnect();
  }, [loading, event]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let res = null;
        try {
          res = await showcaseService.getById(id);
        } catch (err) {
          logger.warn("Not found in showcases, trying events service", err);
        }

        if (!res || !res.success || !res.data) {
          res = await eventService.getById(id);
        }

        if (res && res.success) {
          setEvent(res.data);

          // Pre-populate customizer defaults
          const sc = res.data;
          const defaultInclusions = [
            { name: "Traditional Backdrop Panel Setup", defaultQty: 1 },
            { name: "Mysore Brass Urlis & Diyas", defaultQty: 2 },
            { name: "Fresh Marigold Garland Hangings", defaultQty: 4 }
          ];
          setCustomInclusions(
            sc.inclusions?.map(inc => ({ ...inc, selected: true, qty: inc.defaultQty || 1 })) ||
            defaultInclusions.map(inc => ({ ...inc, selected: true, qty: inc.defaultQty }))
          );
          setSelectedPaletteColor(sc.colorPalette?.[0] || "#8B0000");

          // Pre-populate occasion category matching
          const cat = sc.category?.toLowerCase() || "wedding";
          if (EVENT_TYPES.some(t => t.id === cat)) {
            setEventType(cat);
          } else {
            setEventType("other");
            setCustomOccasion(sc.category || "");
          }
        }

        const relatedRes = await showcaseService.getAll();
        if (relatedRes.success) {
          const relatedItems = relatedRes.data || [];
          setRelatedEvents(relatedItems.filter(e => e._id !== id && e.id !== id).slice(0, 4));
        }
      } catch (err) {
        logger.error("Failed to fetch event masteries", err);
        setError("Could not load event details.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    window.scrollTo(0, 0);
  }, [id]);

  const toggleInclusion = (name) => {
    setCustomInclusions(prev => prev.map(inc =>
      inc.name === name ? { ...inc, selected: !inc.selected } : inc
    ));
  };

  const updateInclusionQty = (name, delta) => {
    setCustomInclusions(prev => prev.map(inc =>
      inc.name === name ? { ...inc, qty: Math.max(1, inc.qty + delta) } : inc
    ));
  };

  const calculateLivePrice = () => {
    if (!event) return 0;

    let basePrice = event.basePrice || 35000;
    if (!event.basePrice) {
      if (event.rentalPrice) {
        basePrice = Number(event.rentalPrice);
      } else if (event.pricing) {
        basePrice = parseInt(event.pricing.replace(/[^0-9]/g, "")) || 35000;
      }
    }

    const durationMultiplier = rentalDurationDays === 1 ? 1 : rentalDurationDays === 2 ? 1.5 : 1.5 + (rentalDurationDays - 2) * 0.4;
    return Math.round(basePrice * durationMultiplier);
  };

  const validateStep1 = () => {
    if (eventType === "other" && !customOccasion.trim()) {
      toast.error("Please specify your custom occasion.");
      return false;
    }
    if (!bookingDate) {
      toast.error("Please select a Ceremony Date.");
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(bookingDate);
    if (selected < today) {
      toast.error("Ceremony Date cannot be in the past.");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const finalAddress = isManualLocationInput 
      ? `${manualVenueName ? manualVenueName + ', ' : ''}${manualAddress} ${manualCity} ${manualState} ${manualPincode}`.trim()
      : (venueDetails?.address || "");

    if (!finalAddress) {
      toast.error("Please configure your venue location (either by map or manual entry).");
      return false;
    }
    if (isManualLocationInput) {
      if (!manualVenueName.trim()) {
        toast.error("Please enter a Venue Name.");
        return false;
      }
      if (!manualAddress.trim()) {
        toast.error("Please enter the Full Address.");
        return false;
      }
      if (!manualCity.trim()) {
        toast.error("Please enter the City.");
        return false;
      }
      if (!manualState.trim()) {
        toast.error("Please enter the State.");
        return false;
      }
      if (!manualPincode.trim()) {
        toast.error("Please enter the Pincode.");
        return false;
      }
      if (!/^\d{6}$/.test(manualPincode.trim())) {
        toast.error("Pincode must be exactly 6 digits.");
        return false;
      }
    }
    return true;
  };

  const handleBookRental = async () => {
    if (!isAuthenticated) {
      runProtectedAction(() => handleBookRental());
      return;
    }

    // Validation
    if (!validateStep1()) {
      setCustomizerStep(1);
      return;
    }
    if (!validateStep3()) {
      setCustomizerStep(3);
      return;
    }

    const loadId = toast.loading("Initializing secure checkout...");
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast.dismiss(loadId);
        toast.error("Failed to load payment gateway. Please check your connection.");
        return;
      }

      // Prepare venue payload
      const venuePayload = isManualLocationInput ? {
        name: manualVenueName,
        address: manualAddress,
        city: manualCity,
        state: manualState,
        pincode: manualPincode,
        country: "India",
        isOutdoor: isOutdoor,
        googleMapsLink: venueDetails?.googleMapsLink || ""
      } : {
        name: venueDetails?.name,
        address: venueDetails?.address,
        city: venueDetails?.city,
        state: venueDetails?.state,
        pincode: venueDetails?.pincode,
        country: venueDetails?.country || "India",
        latitude: venueDetails?.latitude,
        longitude: venueDetails?.longitude,
        googleMapsLink: venueDetails?.googleMapsLink,
        isOutdoor: isOutdoor
      };

      const finalEventType = eventType === "other" ? customOccasion : eventType;

      const checkoutPayload = {
        eventPackageId: event._id || event.id,
        eventType: finalEventType,
        title: `${event.title} Booking`,
        date: bookingDate,
        rentalDurationDays,
        timing: { start: startTime, end: endTime },
        guestCount,
        venue: venuePayload,
        customization: {
          themeColor: selectedPaletteColor || (event.colorPalette?.[0] || "Standard"),
          floralPreference: "Standard Garlands",
          lightingPreference: "Standard Lighting",
          stageSize: "Standard",
          additionalRequests: customNote || ""
        },
        selectedAddons: [],
        inspirationImages: []
      };

      // 1. Initialize Booking Checkout
      const initRes = await bookingService.initializeCheckout(checkoutPayload);
      if (!initRes.success || !initRes.data) {
        toast.dismiss(loadId);
        toast.error(initRes.message || "Failed to initialize checkout.");
        return;
      }

      const { bookingId, razorpayOrderId, amount, currency, key } = initRes.data;
      toast.dismiss(loadId);

      // 2. Open Razorpay Modal
      const options = {
        key,
        amount: amount * 100, // in paise
        currency,
        name: "Siri Arts Event Decor",
        description: `Advance Deposit for ${event.title}`,
        order_id: razorpayOrderId,
        handler: async function (response) {
          const verifyLoadId = toast.loading("Verifying your payment securely...");
          try {
            // 3. Verify Payment Signature
            const verifyRes = await bookingService.verifyCheckout({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingId,
            });

            toast.dismiss(verifyLoadId);
            if (verifyRes.success) {
              toast.success("Payment successful! Your luxury event is confirmed.");
              navigate(`/booking-success/${bookingId}`);
            } else {
              toast.error(verifyRes.message || "Payment verification failed.");
            }
          } catch (err) {
            toast.dismiss(verifyLoadId);
            logger.error("Verification Error:", err);
            toast.error("An error occurred during verification. Contact support.");
          }
        },
        prefill: {
          name: "Customer",
          email: "customer@example.com",
        },
        theme: {
          color: "#735c00",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response) {
        toast.error(`Payment Failed: ${response.error.description}`);
      });
      paymentObject.open();

    } catch (err) {
      toast.dismiss(loadId);
      logger.error(err);
      toast.error(err.response?.data?.message || "An error occurred. Please verify required fields and login state.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <h2 className="font-display text-3xl mb-4 text-on-surface">
            Event not found
          </h2>
          <Link to="/events" className="btn-primary">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const formattedCategory = event.category ? String(event.category).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Traditional Setup";

  const stats = [
    { label: "Design Style", value: event.style || "Traditional Royal", icon: "palette" },
    { label: "Decor Elements", value: event.decorCount || "95+ Elements", icon: "dashboard" },
    { label: "Venue Type", value: event.venueType || "Indoor & Outdoor", icon: "meeting_room" },
    { label: "Master Category", value: formattedCategory, icon: "verified" },
  ];

  return (
    <div className="bg-[#fbf9f6] min-h-screen text-on-surface selection:bg-primary/20 relative font-body">
      <SEO
        title={event.seoTitle || `${event.title} | Event Masteries`}
        description={event.seoDescription || event.description}
        ogImage={event.image}
      />

      {/* 1. BREADCRUMBS HEADER (Preserved for Desktop) */}
      <div className="hidden md:block pt-32 pb-4 max-w-max-width mx-auto px-margin-desktop relative z-10">
        <MandalaArtDecor
          variant={2}
          size={400}
          className="-top-20 -right-20 absolute pointer-events-none"
          opacity={0.1}
          spinDuration={240}
        />

        <nav className="flex items-center gap-3 font-label-sm text-[12px] uppercase tracking-[0.3em] text-black/40 font-bold">
          <Link to="/events" className="hover:text-primary transition-colors">
            Event Masteries
          </Link>
          <span className="material-symbols-outlined text-[14px] opacity-20">
            chevron_right
          </span>
          <span className="text-primary font-bold">{formattedCategory}</span>
        </nav>
      </div>

      {/* 2. MAIN DETAILS PAGE SECTION */}
      <section className="pt-[72px] md:pt-4 pb-20 max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">

          {/* Left Column: Event Gallery & Specs */}
          <div className="lg:col-span-7 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-[4/3] md:aspect-[16/10] rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl group"
            >
              {/* Mobile-Only Overlay Back Button */}
              <button
                onClick={() => navigate(-1)}
                className="md:hidden absolute top-4 left-4 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-black/5 active:scale-90"
              >
                <span className="material-symbols-outlined text-[20px] text-black">
                  arrow_back
                </span>
              </button>

              {/* Overlay Action Buttons (Visible on Mobile & Desktop) */}
              <div className="absolute top-4 right-4 z-20 flex flex-row gap-3">
                <button
                  onClick={() => toggleItem({ ...event, image: event.image })}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-[#fbfbf8] shadow-lg border border-black/5 active:scale-90 hover:scale-105 transition-all text-black hover:bg-white"
                >
                  <motion.span
                    animate={{
                      scale: isWishlisted(event.id) ? [1, 1.3, 1] : 1,
                      color: isWishlisted(event.id) ? "#ff2d55" : "#1a1817",
                      fontVariationSettings: isWishlisted(event.id) ? "'FILL' 1" : "'FILL' 0",
                    }}
                    className="material-symbols-outlined text-[20px]"
                  >
                    favorite
                  </motion.span>
                </button>
                <ShareButton
                  url={window.location.href}
                  title={`Siri Arts & Crafts: ${event.title}`}
                  variant="custom"
                  size="custom"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-[#fbfbf8] shadow-lg border border-black/5 active:scale-90 hover:scale-105 transition-all text-black hover:bg-white"
                  iconOnly={true}
                />
              </div>

              {/* Mobile Horizontal Scroll Gallery */}
              <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full w-full">
                {(event.gallery && event.gallery.length > 0 ? event.gallery : [event.image]).map((img, i) => (
                  <div
                    key={i}
                    onClick={() => openLightbox(i)}
                    className="flex-shrink-0 w-full h-full snap-center cursor-zoom-in"
                  >
                    <img
                      src={img}
                      className="w-full h-full object-cover"
                      alt={`${event.title} perspective ${i + 1}`}
                      onError={handleImageError}
                    />
                  </div>
                ))}
              </div>

              {/* Desktop-Only Fade Gallery */}
              <div className="hidden md:block h-full w-full relative">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeGalleryIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    src={event.gallery?.[activeGalleryIndex] || event.image}
                    onClick={() => openLightbox(activeGalleryIndex)}
                    className="w-full h-full object-cover cursor-zoom-in"
                    alt={event.title}
                    onError={handleImageError}
                  />
                </AnimatePresence>
              </div>

              {/* Floating Perspective Badges */}
              {(event.gallery && event.gallery.length > 1) && (
                <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 flex gap-2.5 z-10">
                  {event.gallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (window.innerWidth >= 768) {
                          setActiveGalleryIndex(i);
                        } else {
                          const container = document.querySelector(".snap-x");
                          if (container) {
                            container.scrollTo({
                              left: i * container.offsetWidth,
                              behavior: "smooth",
                            });
                          }
                          setActiveGalleryIndex(i);
                        }
                      }}
                      className={`w-8 h-8 md:w-9 md:h-9 rounded-full backdrop-blur-md border transition-all duration-500 flex items-center justify-center font-display text-[13px] md:text-[14px] ${activeGalleryIndex === i ? "bg-white border-white text-black shadow-lg scale-110" : "bg-black/20 border-white/30 text-white/80 hover:bg-black/40 hover:border-white/50"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Visual Indicators Strip */}
            {(event.gallery && event.gallery.length > 1) && (
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {event.gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveGalleryIndex(i)}
                    className={`relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shrink-0 transition-all duration-500 ${activeGalleryIndex === i ? "ring-2 ring-primary ring-offset-2 scale-95" : "opacity-45 grayscale-[70%] hover:opacity-100 hover:grayscale-0"}`}
                  >
                    <img
                      src={img}
                      className="w-full h-full object-cover"
                      alt={`Thumb ${i}`}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Header Information */}
            <div className="space-y-3 py-6 border-t border-b border-black/5 mt-4">
              <span className="font-label-sm text-primary uppercase tracking-[0.4em] font-bold text-[10px] md:text-[12px] block">
                {event.subtitle || "The Digital Studio Mastery"}
              </span>
              <h2 className="font-display text-black text-[32px] md:text-[44px] font-normal leading-tight tracking-tight">
                {event.title}
              </h2>
              <p className="font-body text-black/60 text-[14px] leading-relaxed font-light mt-4">
                {event.description}
              </p>
            </div>

            {/* Signature Masterpieces Included Highlights Panel */}
            {event.features && event.features.length > 0 && (
              <div className="bg-[#FAF6F0] p-6 rounded-[2rem] border border-[#C4A87C]/20 space-y-3">
                <span className="font-label-sm text-[10px] uppercase tracking-[0.3em] text-[#735c00] font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
                  Signature Masterpieces Included
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5">
                  {event.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-stone-700 text-xs font-semibold leading-relaxed">
                      <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">star</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Speciation Stats Cards Grid */}
            <div className="pt-6">
              <span className="font-label-sm text-[10px] uppercase tracking-[0.3em] text-black/40 font-bold block mb-6">
                Technical Specifications
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white border border-stone-200/50 p-4 rounded-2xl space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">{stat.icon}</span>
                      <span className="font-label text-[8px] uppercase tracking-wider text-black/40 font-bold">{stat.label}</span>
                    </div>
                    <span className="font-body text-black font-semibold text-[13px] block">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Artisan Customizer Form */}
          <div ref={customizerCardRef} className="lg:col-span-5 flex flex-col gap-6">

            {/* 2. Customizer Crate Form */}
            <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-[#C4A87C]/20 p-6 md:p-8 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)]">
              <div className="flex items-center justify-between pb-3 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
                  <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Artisan Customizer</span>
                </div>
                <span className="text-[10px] text-stone-400 font-bold">Step {customizerStep} of 4</span>
              </div>

              {/* Stepper Progress Indicator */}
              <div className="flex items-center justify-between pb-2">
                {[
                  { number: 1, label: "Occasion" },
                  { number: 2, label: "Schedule" },
                  { number: 3, label: "Venue" },
                  { number: 4, label: "Confirm" }
                ].map((s, idx) => (
                  <React.Fragment key={s.number}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-display text-[10px] font-bold transition-all duration-300 ${
                        customizerStep === s.number
                          ? "bg-black text-white scale-110 shadow-md"
                          : customizerStep > s.number
                          ? "bg-primary text-black"
                          : "bg-stone-100 text-stone-400"
                      }`}>
                        {customizerStep > s.number ? "✓" : s.number}
                      </div>
                      <span className={`text-[8px] uppercase tracking-wider font-semibold ${
                        customizerStep === s.number ? "text-black" : "text-stone-400"
                      }`}>{s.label}</span>
                    </div>
                    {idx < 3 && (
                      <div className={`h-[1px] flex-1 border-t ${
                        customizerStep > s.number ? "border-primary" : "border-stone-200"
                      } -mt-4`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* STEP 1: Occasion & Basic Schedule */}
              {customizerStep === 1 && (
                <div className="space-y-4 pt-2">
                  {/* Select Your Occasion */}
                  <div className="space-y-1.5">
                    <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">Select Your Occasion *</label>
                    <select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                    >
                      {EVENT_TYPES.map(type => (
                        <option key={type.id} value={type.id}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {eventType === "other" && (
                    <div className="space-y-1.5 bg-primary/5 p-4 rounded-2xl border border-primary/20">
                      <label className="font-label text-[8px] uppercase tracking-widest text-primary font-bold block">Specify Custom Occasion *</label>
                      <input
                        type="text"
                        placeholder="e.g. Housewarming, Baby Shower"
                        value={customOccasion}
                        onChange={(e) => setCustomOccasion(e.target.value)}
                        className="w-full px-4 py-2 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                      />
                    </div>
                  )}

                  {/* Date & Duration Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">Ceremony Date *</label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">Rental Days</label>
                      <select
                        value={rentalDurationDays}
                        onChange={(e) => setRentalDurationDays(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                      >
                        <option value={1}>1 Day Setup (Standard)</option>
                        <option value={2}>2 Days Setup (Ceremony + Return)</option>
                        <option value={3}>3 Days Setup (Extensive)</option>
                      </select>
                    </div>
                  </div>

                  {/* Setup Environment Toggle */}
                  <div className="space-y-2">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">Setup Environment</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsOutdoor(false)}
                        className={`flex-1 py-2 px-3 rounded-full font-semibold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${!isOutdoor ? 'bg-black text-white border-none shadow-sm' : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-black/10'}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">home</span>
                        <span>Indoor</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsOutdoor(true)}
                        className={`flex-1 py-2 px-3 rounded-full font-semibold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${isOutdoor ? 'bg-black text-white border-none shadow-sm' : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-black/10'}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">park</span>
                        <span>Outdoor</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Timings & Placement */}
              {customizerStep === 2 && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">Setup Start Time</label>
                      <select
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                      >
                        <option value="06:00 AM">06:00 AM (Early Dawn)</option>
                        <option value="09:00 AM">09:00 AM (Standard Morning)</option>
                        <option value="12:00 PM">12:00 PM (Midday)</option>
                        <option value="03:00 PM">03:00 PM (Afternoon)</option>
                        <option value="06:00 PM">06:00 PM (Evening Glow)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-label text-[8px] uppercase tracking-widest text-black/50 font-bold block">Ceremony End Time</label>
                      <select
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                      >
                        <option value="01:00 PM">01:00 PM (Afternoon)</option>
                        <option value="05:00 PM">05:00 PM (Sundown)</option>
                        <option value="09:00 PM">09:00 PM (Standard Night)</option>
                        <option value="11:00 PM">11:00 PM (Late Night Gala)</option>
                        <option value="02:00 AM">02:00 AM (Midnight Auspicious)</option>
                      </select>
                    </div>
                  </div>

                  {/* Placement Preference */}
                  <div className="space-y-2">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">Placement Destination</label>
                    <select
                      value={placementPreference}
                      onChange={(e) => setPlacementPreference(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                    >
                      <option value="Side-Stage Showcase Corner">Side-Stage Showcase Corner</option>
                      <option value="Entrance Presentation Desk">Entrance Presentation Desk</option>
                      <option value="Traditional Mandap Flanks">Traditional Mandap Flanks</option>
                      <option value="Groom/Bride Seating Podiums">Groom/Bride Seating Podiums</option>
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 3: Venue Location & Notes */}
              {customizerStep === 3 && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-label text-[9px] uppercase tracking-widest text-[#735c00] font-bold block">Select Event Venue *</label>
                      {venueDetails && (
                        <span className="text-[10px] text-green-600 font-bold flex items-center gap-0.5 animate-pulse">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span> Verified
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLocationModalOpen(true);
                          setIsManualLocationInput(false);
                        }}
                        className="flex-1 bg-white hover:bg-stone-50 text-black border border-black/10 py-2.5 px-3 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">map</span>
                        <span>Choose on Map</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsManualLocationInput(!isManualLocationInput)}
                        className={`flex-1 py-2.5 px-3 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer ${isManualLocationInput ? 'bg-primary text-black border-none shadow-sm' : 'bg-primary/10 text-primary border border-primary/20'}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        <span>Add Manually</span>
                      </button>
                    </div>

                    {/* Manual Location Form */}
                    {isManualLocationInput && (
                      <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#C4A87C]/20 space-y-3">
                        <div className="space-y-1">
                          <label className="font-label text-[8px] uppercase tracking-widest text-[#735c00] font-bold block">Venue Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Grand Palace Hall, Temple Flanks"
                            value={manualVenueName}
                            onChange={(e) => {
                              setManualVenueName(e.target.value);
                              handleManualFieldChange("name", e.target.value);
                            }}
                            className="w-full px-4 py-2 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-label text-[8px] uppercase tracking-widest text-[#735c00] font-bold block">Full Address *</label>
                          <input
                            type="text"
                            placeholder="e.g. 123 Heritage Lane, Near Old Circle"
                            value={manualAddress}
                            onChange={(e) => {
                              setManualAddress(e.target.value);
                              handleManualFieldChange("address", e.target.value);
                            }}
                            className="w-full px-4 py-2 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="font-label text-[8px] uppercase tracking-widest text-[#735c00] font-bold block">City *</label>
                            <input
                              type="text"
                              placeholder="e.g. Bengaluru"
                              value={manualCity}
                              onChange={(e) => {
                                setManualCity(e.target.value);
                                handleManualFieldChange("city", e.target.value);
                              }}
                              className="w-full px-3 py-2 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-label text-[8px] uppercase tracking-widest text-[#735c00] font-bold block">State *</label>
                            <input
                              type="text"
                              placeholder="e.g. Karnataka"
                              value={manualState}
                              onChange={(e) => {
                                setManualState(e.target.value);
                                handleManualFieldChange("state", e.target.value);
                              }}
                              className="w-full px-3 py-2 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="font-label text-[8px] uppercase tracking-widest text-[#735c00] font-bold block">Pincode *</label>
                            <input
                              type="text"
                              placeholder="e.g. 560001"
                              value={manualPincode}
                              onChange={(e) => {
                                setManualPincode(e.target.value);
                                handleManualFieldChange("pincode", e.target.value);
                              }}
                              className="w-full px-3 py-2 rounded-full border border-black/10 bg-white text-xs outline-none focus:border-primary font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Venue Detail Card Preview */}
                    {(venueDetails && !isManualLocationInput) ? (
                      <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#C4A87C]/25 space-y-2 relative overflow-hidden">
                        <div className="flex items-start justify-between gap-2 z-10 relative">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-black flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-primary text-[16px]">storefront</span>
                              {venueDetails.name}
                            </h4>
                            <p className="text-[11px] text-stone-600 leading-normal font-light">{venueDetails.address}</p>
                            <div className="flex gap-x-2 text-[9px] text-stone-500 font-semibold font-mono pt-1">
                              {venueDetails.city && <span>City: {venueDetails.city}</span>}
                              {venueDetails.pincode && <span>Pincode: {venueDetails.pincode}</span>}
                            </div>
                          </div>
                          <a
                            href={venueDetails.googleMapsLink}
                            target="_blank"
                            rel="noreferrer"
                            className="w-7 h-7 rounded-full bg-white border border-black/5 flex items-center justify-center text-primary hover:bg-stone-50 shrink-0 transition-colors shadow-sm"
                            title="Open in Google Maps"
                          >
                            <span className="material-symbols-outlined text-[16px]">directions</span>
                          </a>
                        </div>
                      </div>
                    ) : (!isManualLocationInput && (
                      <div className="bg-stone-50 border border-dashed border-black/10 p-4 rounded-2xl text-center text-stone-400 font-light text-xs">
                        No venue location specified yet. Tap "Choose on Map" to configure.
                      </div>
                    ))}
                  </div>

                  {/* Custom notes */}
                  <div className="space-y-2">
                    <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">Arrangement Notes</label>
                    <textarea
                      placeholder="Traditional naming, gift tray customize, placement dimensions..."
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-black/10 bg-stone-50/20 text-xs h-20 resize-none focus:border-primary outline-none font-medium"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Review & Payment */}
              {customizerStep === 4 && (
                <div className="space-y-4 pt-2">
                  <div className="bg-stone-50 p-4 rounded-2xl border border-black/5 space-y-3">
                    <span className="font-label text-[9px] uppercase tracking-widest text-black/40 font-bold block">Booking Summary</span>
                    
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-[11px] font-semibold text-stone-700">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-black/35 font-bold block">Occasion</span>
                        <span className="text-black capitalize truncate block">{eventType === "other" ? customOccasion : eventType}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-black/35 font-bold block">Ceremony Date</span>
                        <span className="text-black">{bookingDate}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-black/35 font-bold block">Rental Duration</span>
                        <span className="text-black">{rentalDurationDays} Day{rentalDurationDays > 1 ? 's' : ''}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-black/35 font-bold block">Environment</span>
                        <span className="text-black">{isOutdoor ? 'Outdoor' : 'Indoor'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-black/35 font-bold block">Setup Start</span>
                        <span className="text-black">{startTime}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-black/35 font-bold block">Ceremony End</span>
                        <span className="text-black">{endTime}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] uppercase tracking-wider text-black/35 font-bold block">Venue Location</span>
                        <span className="text-black line-clamp-1">{isManualLocationInput ? `${manualVenueName}, ${manualAddress}` : (venueDetails?.name || "TBD")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Calculation breakdown */}
                  <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#C4A87C]/20 relative overflow-hidden space-y-3">
                    {/* Floral Mandala Watermark */}
                    <div className="absolute right-0 top-0 bottom-0 w-24 overflow-hidden pointer-events-none flex items-center justify-end z-0">
                      <MandalaElement
                        variant={3}
                        size={120}
                        opacity={0.05}
                        rotate={true}
                        duration={50}
                        skipFade={true}
                        className="translate-x-4 mix-blend-darken"
                      />
                    </div>
                    
                    <div className="relative z-10 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-stone-600">
                        <span>Base Package Rental</span>
                        <span>₹{(event.basePrice || 35000).toLocaleString("en-IN")}</span>
                      </div>
                      {rentalDurationDays > 1 && (
                        <div className="flex justify-between items-center text-stone-600 text-[11px]">
                          <span>Duration Multiplier ({rentalDurationDays} Days)</span>
                          <span>x{rentalDurationDays === 2 ? '1.5' : (1.5 + (rentalDurationDays - 2) * 0.4).toFixed(1)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center font-bold text-black border-t border-black/5 pt-2 text-[14px]">
                        <span>Grand Total Price</span>
                        <span>₹{calculateLivePrice().toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-primary border-t border-dashed border-primary/20 pt-2 text-[14px] bg-primary/5 -mx-4 px-4 py-1.5 rounded-lg">
                        <div className="flex flex-col">
                          <span>50% Secure Deposit</span>
                          <span className="text-[8px] font-normal text-stone-500 leading-none">Paid now to confirm booking</span>
                        </div>
                        <span>₹{Math.round(calculateLivePrice() * 0.50).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center text-stone-500 text-[10px]">
                        <span>Remaining Balance</span>
                        <span>₹{(calculateLivePrice() - Math.round(calculateLivePrice() * 0.50)).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Stepper Navigation Footer */}
              <div className="pt-4 border-t border-black/5 space-y-3">
                <div className="flex gap-2">
                  {customizerStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCustomizerStep(prev => prev - 1)}
                      className="w-1/3 bg-stone-100 hover:bg-stone-200 text-stone-700 py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer border border-stone-250"
                    >
                      <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                      <span>Back</span>
                    </button>
                  )}
                  {customizerStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (customizerStep === 1 && validateStep1()) {
                          setCustomizerStep(2);
                        } else if (customizerStep === 2) {
                          setCustomizerStep(3);
                        } else if (customizerStep === 3 && validateStep3()) {
                          setCustomizerStep(4);
                        }
                      }}
                      className={`${customizerStep === 1 ? 'w-full' : 'w-2/3'} bg-black hover:bg-primary hover:text-black text-white py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer`}
                    >
                      <span>Continue</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  ) : (
                    <button
                      ref={reserveButtonRef}
                      type="button"
                      onClick={handleBookRental}
                      className="w-2/3 bg-black text-white py-3 rounded-full font-label text-[10px] uppercase tracking-widest font-bold shadow-xl hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-1.5 group active:scale-95 cursor-pointer"
                    >
                      <span>Pay Deposit & Reserve</span>
                      <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">trending_flat</span>
                    </button>
                  )}
                </div>
                {customizerStep === 4 && (
                  <p className="text-center font-body text-[9px] text-black/35 italic">
                    Secure payment powered by Razorpay.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 4. FURTHER DISCOVERY JOURNEYS */}
      <section className="pt-12 pb-12 md:py-32">
        <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex items-end justify-between mb-12 md:mb-16">
            <h2 className="font-display text-[28px] md:text-[48px] text-black font-normal leading-none">
              Further Discovery.
            </h2>
            <Link
              to="/events"
              className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold underline decoration-primary/20"
            >
              All Collections →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {relatedEvents.map((rel) => (
              <Link
                key={rel._id}
                to={`/events/${rel._id}`}
                className="group space-y-4"
              >
                <div className="relative aspect-[3/4] rounded-[24px] overflow-hidden bg-gray-100 shadow-lg">
                  <img
                    src={rel.image}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    alt={rel.title}
                  />
                </div>
                <div className="space-y-1 px-1">
                  <span className="font-label-sm text-primary text-[8px] md:text-[9px] uppercase tracking-widest font-bold block">
                    {rel.category}
                  </span>
                  <h4 className="font-display text-lg text-black font-normal leading-none">
                    {rel.title}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Subtle background art anchor at the bottom */}
        <MandalaArtDecor
          variant={1}
          size={600}
          className="-bottom-24 -left-24 hidden lg:block z-0"
          opacity={0.2}
          spinDuration={180}
        />
        <MandalaArtDecor
          variant={1}
          size={300}
          className="-bottom-12 -left-12 lg:hidden z-0"
          opacity={0.25}
          spinDuration={180}
        />
      </section>

      {/* 4. STICKY MOBILE PRICE CARD (Floats above mobile bottom navigation) */}
      <AnimatePresence>
        {showMobileSticky && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[400px] h-[72px] z-[150] md:hidden bg-white/95 backdrop-blur-3xl border border-[#C4A87C]/20 px-6 flex items-center justify-between gap-3 shadow-[0_20px_60px_rgba(115,92,0,0.10)] rounded-full select-none overflow-hidden"
          >
            {/* Elegant Floral Mandala Watermark backdrop */}
            <div className="absolute right-0 top-0 bottom-0 w-20 overflow-hidden pointer-events-none rounded-r-[28px] flex items-center justify-end z-0">
              <MandalaElement
                variant={3}
                size={110}
                opacity={0.05}
                rotate={true}
                duration={45}
                skipFade={true}
                className="translate-x-4 translate-y-1 mix-blend-darken"
              />
            </div>

            <div className="flex flex-col truncate relative z-10">
              <span className="font-label text-[8px] uppercase tracking-[0.2em] text-[#C4A87C] font-bold leading-none">
                Estimated Rental
              </span>
              <p className="font-display text-[15px] text-black font-bold leading-none mt-1 font-sans">
                ₹{calculateLivePrice().toLocaleString("en-IN")}
              </p>
            </div>

            <button
              onClick={() => {
                customizerCardRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-black text-white h-10 px-5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer relative z-10 shrink-0"
            >
              <span>Customize</span>
              <span className="material-symbols-outlined text-[14px]">tune</span>
            </button>
          </motion.div>

        )}
      </AnimatePresence>

      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={(details) => setVenueDetails(details)}
        initialLocation={venueDetails}
      />

      {/* Fullscreen Swipeable Lightbox (Rendered at root to escape stacking context) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isLightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[99999] bg-white/98 flex flex-col touch-none backdrop-blur-md"
            >
              {/* Prominent Close Button */}
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="fixed top-8 right-6 z-[100000] w-12 h-12 flex items-center justify-center rounded-full bg-white text-black shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-black/10 active:scale-90 transition-transform pointer-events-auto hover:bg-gray-50"
                aria-label="Close lightbox"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              {/* Image Counter */}
              <div className="fixed top-10 left-6 z-[100000] pointer-events-none">
                <span className="bg-white/80 px-4 py-1.5 rounded-full text-black font-label tracking-widest text-[12px] font-bold shadow-sm backdrop-blur-md">
                  {activeGalleryIndex + 1} / {(event.gallery && event.gallery.length > 0 ? event.gallery : [event.image]).length}
                </span>
              </div>

              {/* Lightbox Swipeable Viewport */}
              <div 
                ref={lightboxScrollRef}
                onScroll={(e) => {
                  const width = e.currentTarget.clientWidth;
                  if (!width) return;
                  const currentSlide = Math.round(e.currentTarget.scrollLeft / width);
                  const images = event.gallery && event.gallery.length > 0 ? event.gallery : [event.image];
                  if (currentSlide !== activeGalleryIndex && currentSlide >= 0 && currentSlide < images.length) {
                    setActiveGalleryIndex(currentSlide);
                  }
                }}
                className="flex-1 w-full h-full flex overflow-x-auto snap-x snap-mandatory items-center mt-12"
                style={{ scrollbarWidth: "none" }}
              >
                {(event.gallery && event.gallery.length > 0 ? event.gallery : [event.image]).map((img, idx) => (
                  <div key={idx} className="w-full h-full shrink-0 snap-center flex items-center justify-center p-2 md:p-8 relative">
                    <img
                      src={img}
                      alt={`Lightbox view ${idx + 1}`}
                      className="max-w-full max-h-full object-contain select-none"
                    />
                  </div>
                ))}
              </div>

              {/* Lightbox Thumbnail Strip */}
              <div className="w-full pb-8 pt-4 px-4 flex gap-3 overflow-x-auto no-scrollbar justify-center items-center pointer-events-auto shrink-0 z-20">
                {(event.gallery && event.gallery.length > 0 ? event.gallery : [event.image]).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveGalleryIndex(idx);
                      if (lightboxScrollRef.current) {
                        lightboxScrollRef.current.scrollTo({
                          left: idx * lightboxScrollRef.current.clientWidth,
                          behavior: "smooth"
                        });
                      }
                    }}
                    className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                      activeGalleryIndex === idx
                        ? "border-black shadow-lg scale-110"
                        : "border-transparent opacity-50 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
