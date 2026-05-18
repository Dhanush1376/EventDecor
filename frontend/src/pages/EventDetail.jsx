import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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

export function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, runProtectedAction } = useAuth();
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const { toggleItem, isWishlisted } = useWishlist();
  
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
        }

        const relatedRes = await showcaseService.getAll();
        if (relatedRes.success) {
          const relatedItems = relatedRes.data || [];
          setRelatedEvents(relatedItems.filter(e => e._id !== id && e.id !== id).slice(0, 4));
        }
      } catch (err) {
        console.error("Failed to fetch event masteries", err);
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
    
    let basePrice = 15000;
    if (event.rentalPrice) {
      basePrice = Number(event.rentalPrice);
    } else if (event.pricing) {
      basePrice = parseInt(event.pricing.replace(/[^0-9]/g, "")) || 15000;
    }

    const itemsAdjustment = customInclusions.reduce((acc, item) => {
      if (!item.selected) return acc - (basePrice * 0.05);
      const defaultQty = item.defaultQty || 1;
      if (item.qty > defaultQty) return acc + ((item.qty - defaultQty) * (basePrice * 0.1));
      return acc;
    }, 0);
    const durationMultiplier = rentalDurationDays === 1 ? 1 : rentalDurationDays === 2 ? 1.5 : 1.5 + (rentalDurationDays - 2) * 0.4;
    return Math.round(Math.max(basePrice * 0.5, basePrice + itemsAdjustment) * durationMultiplier);
  };

  const handleBookRental = async () => {
    if (!isAuthenticated) {
      runProtectedAction(() => handleBookRental());
      return;
    }
    if (!bookingDate) {
      toast.error("Please select a target ceremony date!");
      return;
    }

    const loadId = toast.loading("Reserving showcase arrangement crates...");
    try {
      const finalAddons = customInclusions
        .filter(i => i.selected)
        .map(i => ({ name: `${i.name} (Qty: ${i.qty})`, price: 0 }));

      const bookingData = {
        title: `Rent: ${event.title}`,
        eventType: event.category || "Showcase Rental",
        date: bookingDate,
        timing: { start: "09:00 AM", end: "09:00 PM" },
        guestCount: 100,
        venue: {
          address: `Showcase Placement: ${placementPreference}. Notes: ${customNote}`,
          isOutdoor: false,
        },
        customization: {
          themeColor: `Color Profile: ${selectedPaletteColor}`,
          floralPreference: "Matching Traditional Silk-Thread Accents",
          additionalRequests: `Showcase Duration: ${rentalDurationDays} Days. Note: ${customNote}`,
        },
        selectedAddons: finalAddons,
      };

      const res = await bookingService.create(bookingData);
      toast.dismiss(loadId);
      if (res.success) {
        toast.success("Decor Showcase reserved! Track setup times in your dashboard.");
        navigate("/dashboard");
      }
    } catch (err) {
      toast.dismiss(loadId);
      toast.error("Failed to place rental inquiry.");
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

  const stats = [
    { label: "Complexity", value: "Level 5 Master", icon: "diamond" },
    { label: "Install", value: `${event.setupTimeHours || 3} Hours`, icon: "schedule" },
    { label: "Artisans", value: "12 Craftsmen", icon: "groups" },
    {
      label: "Capacity",
      value: event.venueSize || "300-1500",
      icon: "door_front",
    },
  ];

  const formattedCategory = event.category ? String(event.category).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Traditional Setup";

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
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
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
                  url={typeof window !== 'undefined' ? window.location.href : ''} 
                  title={`${event.title} - Siri Arts & Crafts Event Masteries`}
                  description={event.description}
                  variant="custom"
                  size="custom"
                  iconOnly={true}
                  className="w-10 h-10 rounded-full bg-[#fbfbf8] shadow-lg border border-black/5 flex items-center justify-center active:scale-90 hover:scale-105 transition-all text-black hover:bg-white"
                />
              </div>

              {/* Mobile Horizontal Scroll Gallery */}
              <div className="md:hidden flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full w-full">
                {(event.gallery && event.gallery.length > 0 ? event.gallery : [event.image]).map((img, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-full h-full snap-center"
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
                    className="w-full h-full object-cover"
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

            {/* Speciation Stats Cards Grid */}
            <div className="pt-6 border-t border-black/5">
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
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* 1. Header Information */}
            <div className="space-y-3 pb-6 border-b border-black/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="font-label-sm text-primary uppercase tracking-[0.4em] font-bold text-[10px] md:text-[12px] block">
                    {event.subtitle || "The Digital Studio Mastery"}
                  </span>
                  <h1 className="font-display text-black text-[32px] md:text-[44px] leading-tight tracking-tight">
                    {event.title}.
                  </h1>
                </div>
                <ShareButton 
                  url={typeof window !== 'undefined' ? window.location.href : ''} 
                  title={`${event.title} - Siri Arts & Crafts Event Masteries`}
                  description={event.description}
                  variant="ghost"
                  size="sm"
                  className="shrink-0 bg-neutral-100"
                />
              </div>
              <p className="font-body text-black/60 text-[14px] leading-relaxed font-light mt-4">
                {event.description}
              </p>
            </div>

            {/* 2. Customizer Crate Form */}
            <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-[#C4A87C]/20 p-6 md:p-8 space-y-6 shadow-[0_15px_40px_rgba(115,92,0,0.02)]">
              <div className="flex items-center gap-2 pb-3 border-b border-black/5">
                <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
                <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Artisan Customizer</span>
              </div>

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

              {/* Color Swatches */}
              {event.colorPalette && event.colorPalette.length > 0 && (
                <div className="space-y-2">
                  <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">Silk Thread / Accent Palette</label>
                  <div className="flex gap-2">
                    {event.colorPalette.map((color, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedPaletteColor(color)}
                        className={`w-8 h-8 rounded-full border cursor-pointer transition-all flex items-center justify-center shadow-xs ${
                          selectedPaletteColor === color ? "ring-2 ring-primary ring-offset-2 scale-110" : "border-black/10 hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Inclusions Checklist */}
              {customInclusions.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-black/5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold">Configure Handcrafted Props</h4>
                    <span className="font-body text-[10px] text-primary italic font-semibold">Mix & Match Items</span>
                  </div>
                  <div className="space-y-2">
                    {customInclusions.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                          item.selected ? "bg-[#fdfbf7] border-primary/20 shadow-2xs" : "bg-neutral-50/50 border-neutral-200/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleInclusion(item.name)}
                            className="w-4 h-4 accent-primary cursor-pointer"
                          />
                          <span className="font-body text-xs text-black font-bold leading-tight">{item.name}</span>
                        </div>
                        {item.selected && (
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => updateInclusionQty(item.name, -1)}
                              className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs hover:bg-stone-200 font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-bold text-black w-5 text-center">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateInclusionQty(item.name, 1)}
                              className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs hover:bg-stone-200 font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Placement Preference */}
              <div className="space-y-2 pt-3 border-t border-black/5">
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

              {/* Upload visual blueprint */}
              <div className="space-y-2">
                <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">Upload placement blueprint (Optional)</label>
                <div className="border border-dashed border-black/10 rounded-2xl p-5 text-center bg-stone-50/50 hover:bg-stone-50 transition-colors relative cursor-pointer flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-primary">cloud_upload</span>
                  <span className="font-body text-xs text-black font-semibold">Upload Blueprint</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadedReferenceName(e.target.files[0]?.name || "")}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                {uploadedReferenceName && (
                  <span className="font-mono text-[10px] text-[#8B0000] block font-semibold">✓ Linked: {uploadedReferenceName}</span>
                )}
              </div>

              {/* Custom notes */}
              <div className="space-y-2">
                <label className="font-label text-[9px] uppercase tracking-widest text-black/45 font-bold block">Arrangement Instruction Notes</label>
                <textarea
                  placeholder="Enter traditional naming preferences, gift tray custom wording, or placement dimensions..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-black/10 bg-stone-50/20 text-xs h-24 resize-none focus:border-primary outline-none font-medium"
                />
              </div>

              {/* Price Calculation & Reserve CTA */}
              <div className="pt-6 border-t border-black/5 space-y-4">
                <div className="flex justify-between items-center bg-[#FAF6F0] p-4.5 rounded-2xl border border-[#C4A87C]/15 relative overflow-hidden">
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
                  <div className="relative z-10">
                    <span className="font-label text-[8px] uppercase tracking-widest text-black/45 font-bold block mb-1">Estimated Rental Price</span>
                    <span className="text-[10px] text-stone-500 font-light block leading-none">(Includes custom inclusions)</span>
                  </div>
                  <span className="font-display text-3xl font-bold text-black font-sans relative z-10">
                    ₹{calculateLivePrice().toLocaleString("en-IN")}
                  </span>
                </div>

                <button
                  ref={reserveButtonRef}
                  type="button"
                  onClick={handleBookRental}
                  className="w-full bg-black text-white py-4 rounded-full font-label-sm text-[10px] uppercase tracking-[0.25em] font-bold shadow-xl hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2 group active:scale-98 cursor-pointer"
                >
                  <span>Reserve Setup Inquiry</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">trending_flat</span>
                </button>
                <p className="text-center font-body text-[10px] text-black/35 italic">
                  Subject to boutique workshop schedule availability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE ANATOMY OF DESIGN — PRESERVED BUT REFINED */}
      <section className="pt-20 pb-12 md:py-32 bg-white relative overflow-hidden">
        <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
          <div className="text-center mb-12 md:mb-20 px-2">
            <span className="font-label-sm text-primary uppercase tracking-[0.4em] font-bold block mb-3 text-[10px] md:text-[12px]">
              INVENTORY HARMONY
            </span>
            <h2 className="font-display text-[28px] md:text-[64px] text-black font-normal leading-tight">
              Anatomy of the Setup.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-10">
            {[
              {
                icon: "layers",
                title: "Structural Integrity",
                desc: "Modular heritage frameworks engineered for architectural stability.",
                assets: ["Teak Foundations", "Hidden Truss", "Anchor Weights"],
              },
              {
                icon: "architecture",
                title: "Material Mastery",
                desc: "Hand-picked premium materials selected for visual depth.",
                assets: [
                  "Hand-Carved Panels",
                  "Heritage Silks",
                  "Linen Accents",
                ],
              },
              {
                icon: "flare",
                title: "Atmospheric Glow",
                desc: "Bespoke amber lighting designed for a twilight sanctuary.",
                assets: ["LED Arrays", "Brass Diyas", "Uplighting"],
              },
            ].map((part, i) => (
              <motion.div
                key={i}
                className={`group p-4 md:p-6 space-y-4 md:space-y-8 transition-all bg-surface/30 rounded-3xl border border-black/5 ${i === 2 ? "col-span-2 md:col-span-1" : "col-span-1"}`}
              >
                <div className="w-10 h-10 md:w-16 md:h-16 rounded-[14px] md:rounded-[20px] bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all">
                  <span className="material-symbols-outlined text-[20px] md:text-[28px] text-primary group-hover:text-white">
                    {part.icon}
                  </span>
                </div>
                <div className="space-y-2 md:space-y-4">
                  <h4 className="font-display text-[15px] md:text-xl text-black font-bold leading-tight">
                    {part.title}.
                  </h4>
                  <p className="font-body text-black/50 font-light leading-relaxed text-[11px] md:text-sm line-clamp-2 md:line-clamp-none">
                    {part.desc}
                  </p>
                  <ul className="space-y-1.5 pt-3 md:pt-4 border-t border-black/5 hidden xs:block">
                    {part.assets.map((asset, ii) => (
                      <li
                        key={ii}
                        className="flex items-center gap-1.5 font-label-sm text-[8px] md:text-[9px] uppercase tracking-widest text-black/40 font-bold italic"
                      >
                        <span className="w-1 h-1 rounded-full bg-primary/60" />
                        {asset}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
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
                  <h4 className="font-display text-lg text-black font-normal italic leading-none">
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
            className="fixed left-4 right-4 bottom-24 z-[110] md:hidden bg-white/95 backdrop-blur-3xl border border-[#C4A87C]/20 p-3.5 pl-6 flex items-center justify-between gap-4 shadow-[0_20px_50px_rgba(115,92,0,0.08)] rounded-[32px] select-none overflow-hidden"
          >
            {/* Elegant Floral Mandala Watermark backdrop */}
            <div className="absolute right-0 top-0 bottom-0 w-28 overflow-hidden pointer-events-none rounded-r-[32px] flex items-center justify-end z-0">
              <MandalaElement
                variant={3}
                size={140}
                opacity={0.06}
                rotate={true}
                duration={45}
                skipFade={true}
                className="translate-x-6 translate-y-2 mix-blend-darken scale-110"
              />
            </div>

            <div className="flex flex-col truncate relative z-10">
              <span className="font-label text-[9px] uppercase tracking-[0.25em] text-[#C4A87C] font-bold leading-none">
                Estimated Rental
              </span>
              <p className="font-display text-[22px] text-black font-bold leading-none mt-1.5 font-sans">
                ₹{calculateLivePrice().toLocaleString("en-IN")}
              </p>
            </div>

            <button
              onClick={handleBookRental}
              className="bg-black text-white h-12 px-6 rounded-full font-label-sm text-[10px] uppercase tracking-[0.2em] font-bold shadow-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer relative z-10"
            >
              <span>Reserve</span>
              <span className="material-symbols-outlined text-[16px]">trending_flat</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
