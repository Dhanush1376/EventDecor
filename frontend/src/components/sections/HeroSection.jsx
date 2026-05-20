import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MandalaElement } from "../ui/MandalaElement";
import { MandalaArtDecor } from "../ui/MandalaArtDecor";
import { useWindowHeight } from "../../hooks/useWindowHeight";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";
import { CloudinaryImage } from "../ui/CloudinaryImage";

export function HeroSection() {
  const windowHeight = useWindowHeight();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  
  const { hero, heroNavigationCards } = useWebsiteContent();

  const fallbackCards = [
    { id: 1, title: "Wedding Essentials", image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=2074&auto=format&fit=crop", link: "/collections", icon: "storefront", isVisible: true },
    { id: 2, title: "Premium Events", image: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=1974&auto=format&fit=crop", link: "/events", icon: "celebration", isVisible: true },
    { id: 3, title: "Our Gallery", image: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1974&auto=format&fit=crop", link: "/gallery", icon: "photo_library", isVisible: true }
  ];

  const cmsCards = heroNavigationCards?.items?.filter(item => item.isVisible !== false) || [];
  const displayCards = (cmsCards.length >= 3 ? cmsCards : fallbackCards).map((item, idx) => ({
    id: String(idx + 1).padStart(2, "0"),
    title: item.title,
    image: item.image,
    link: item.link || "/collections",
    icon: item.icon || "storefront"
  }));

  const carouselRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(1);
  const [activeDOMIndex, setActiveDOMIndex] = useState(4); // Start at index 4 (middle copy, card index 1)

  const handleScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    
    const children = Array.from(container.children);
    if (children.length === 0) return;
    
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    children.forEach((child, index) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const centerOfContainer = scrollLeft + containerWidth / 2;
      const distance = Math.abs(centerOfContainer - childCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    const N = displayCards.length;
    
    // Silence-reset to middle copy if we hit boundaries
    if (closestIndex < N) {
      const targetIndex = closestIndex + N;
      const targetChild = children[targetIndex];
      const targetScrollLeft = targetChild.offsetLeft - (containerWidth - targetChild.clientWidth) / 2;
      container.scrollLeft = targetScrollLeft;
      setActiveDOMIndex(targetIndex);
      setActiveIndex(targetIndex % N);
      return;
    } else if (closestIndex >= N * 2) {
      const targetIndex = closestIndex - N;
      const targetChild = children[targetIndex];
      const targetScrollLeft = targetChild.offsetLeft - (containerWidth - targetChild.clientWidth) / 2;
      container.scrollLeft = targetScrollLeft;
      setActiveDOMIndex(targetIndex);
      setActiveIndex(targetIndex % N);
      return;
    }

    setActiveDOMIndex(closestIndex);
    setActiveIndex(closestIndex % N);
  };

  const scrollToDOMIndex = (index) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const children = Array.from(container.children);
    if (children[index]) {
      const child = children[index];
      const containerWidth = container.clientWidth;
      const childWidth = child.clientWidth;
      const targetScrollLeft = child.offsetLeft - (containerWidth - childWidth) / 2;
      
      container.classList.remove("snap-x", "snap-mandatory");
      
      container.scrollTo({
        left: targetScrollLeft,
        behavior: "smooth"
      });
      
      setActiveDOMIndex(index);
      setActiveIndex(index % displayCards.length);
      
      setTimeout(() => {
        if (container) {
          container.classList.add("snap-x", "snap-mandatory");
        }
      }, 500);
    }
  };

  const scrollToCard = (targetOriginalIndex) => {
    const N = displayCards.length;
    const currentDOM = activeDOMIndex;
    const copies = [targetOriginalIndex, targetOriginalIndex + N, targetOriginalIndex + 2*N];
    let closestDOMIndex = copies[0];
    let closestDistance = Infinity;
    
    copies.forEach((copyIndex) => {
      const dist = Math.abs(copyIndex - currentDOM);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestDOMIndex = copyIndex;
      }
    });

    scrollToDOMIndex(closestDOMIndex);
  };

  const activeDOMIndexRef = useRef(activeDOMIndex);
  useEffect(() => {
    activeDOMIndexRef.current = activeDOMIndex;
  }, [activeDOMIndex]);

  useEffect(() => {
    if (isMobile && carouselRef.current) {
      const timer = setTimeout(() => {
        scrollToDOMIndex(4);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || displayCards.length <= 1) return;
    const interval = setInterval(() => {
      const nextDOM = activeDOMIndexRef.current + 1;
      scrollToDOMIndex(nextDOM);
    }, 3800);
    return () => clearInterval(interval);
  }, [isMobile, displayCards.length]);

  if (!hero?.isVisible) return null;

  /* ─────────── MOBILE — Immersive full-bleed static blurred hero ─────────── */
  if (isMobile) {
    const timelinePercentage = displayCards.length > 1 
      ? (activeIndex / (displayCards.length - 1)) * 75 + 12.5 
      : 50;

    return (
      <section className="relative w-full overflow-hidden bg-[#faf9f6]">
        {/* Ambient Gold Gradient Glows */}
        <div className="absolute top-[35%] left-0 w-[260px] h-[260px] bg-[#d4af37]/15 rounded-full blur-[80px] -translate-x-1/2 pointer-events-none z-0" />
        <div className="absolute bottom-[10%] right-0 w-[240px] h-[240px] bg-[#d4af37]/10 rounded-full blur-[80px] translate-x-1/3 pointer-events-none z-0" />

        {/* 1. Dark Hero Banner Section */}
        <div className="relative text-white pt-32 pb-28 px-7 flex flex-col z-10 min-h-[480px] justify-center overflow-hidden">
          {/* Background image & gradient overlay */}
          <div className="absolute inset-0 z-0">
            <CloudinaryImage
              src={hero.mobileBackgroundImage || hero.backgroundImage || "https://res.cloudinary.com/drxgnnzeb/image/upload/v1779181764/event_decor_ecommerce/assets/event_decor_mobile%20hero%20background.png"}
              alt="Luxury Royal Wedding Background"
              className="w-full h-full object-cover"
              containerClassName="absolute inset-0 w-full h-full"
              loading="eager"
              fetchPriority="high"
            />
            {/* Soft dark radial & linear gradients to ensure premium contrast, fading on the right */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0F0E0C]/90 via-[#0F0E0C]/50 to-transparent mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E0C] via-black/40 to-transparent" />
            
            {/* Subtle grain/texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-start max-w-[300px]">
            {/* Eyebrow */}
            <div className="flex items-start gap-2 mb-4">
              <span className="material-symbols-outlined text-[15px] text-[#d4af37] mt-0.5">
                filter_vintage
              </span>
              <div className="flex flex-col">
                <span className="font-label text-[9px] tracking-[0.25em] text-white/90 uppercase font-semibold leading-tight">
                  ARTISAN EXCELLENCE
                </span>
                <span className="font-label text-[9px] tracking-[0.25em] text-[#d4af37] uppercase font-semibold leading-tight mt-0.5">
                  SINCE 2015
                </span>
              </div>
            </div>

            {/* Title */}
            <h1 className="font-headline text-[33px] sm:text-[38px] leading-[1.1] text-white mb-5 tracking-wide">
              Heritage
              <br />
              Crafted for
              <br />
              <span className="text-[#d4af37] block mt-1">Modern</span>
              <span className="text-[#d4af37] block">Celebrations</span>
            </h1>

            {/* Thin Gold Divider */}
            <div className="w-12 h-[1px] bg-[#d4af37]/60 mb-5" />

            {/* Subtext */}
            <p className="font-body text-white/80 text-[12px] leading-relaxed mb-6 max-w-[270px]">
              Handcrafted luxury event decorations rooted in South Indian tradition.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-5 items-start w-full">
              <Link
                to="/collections"
                className="bg-[#d4af37] text-[#0f0e0c] font-bold text-[10px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-full inline-flex items-center gap-2.5 active:scale-95 transition-all shadow-lg hover:bg-[#c4a030]"
              >
                EXPLORE COLLECTIONS
                <span className="material-symbols-outlined text-[13px] font-bold">arrow_forward</span>
              </Link>

              <Link
                to="/about"
                className="inline-flex items-center gap-3.5 text-white/90 font-bold text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all py-1.5"
              >
                <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-md">
                  <span className="material-symbols-outlined text-[15px] text-white fill-current">
                    play_arrow
                  </span>
                </div>
                <span className="underline decoration-[#d4af37] underline-offset-4 font-bold">
                  WATCH OUR STORY
                </span>
              </Link>
            </div>
          </div>

          {/* Right Side Timeline Indicator */}
          <div className="absolute right-6 top-[28%] bottom-[28%] flex flex-col items-center justify-between pointer-events-none z-10">
            <span className="font-label text-[10px] text-white/60 tracking-wider font-semibold">01</span>
            <div className="w-[1px] flex-1 bg-white/20 my-2.5 relative">
              <div 
                className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.8)] transition-all duration-300"
                style={{ top: `${timelinePercentage}%` }}
              />
            </div>
            <span className="font-label text-[10px] text-white/60 tracking-wider font-semibold">
              {String(displayCards.length).padStart(2, "0")}
            </span>
          </div>

          {/* Bottom-Right Rotating Mandala Seal */}
          <div className="absolute right-4 bottom-14 w-24 h-24 z-20 pointer-events-none">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Outer rotating ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-full h-full rounded-full"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath id='circlePath' d='M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0' fill='none'/%3E%3Ctext fill='%23d4af37' font-size='5.5' font-family='serif' letter-spacing='1.5'%3E%3CtextPath href='%23circlePath'%3E • HANDCRAFTED LUXURY • HERITAGE ARTISTRY •%3C/textPath%3E%3C/text%3E%3C/svg%3E")`,
                  backgroundSize: "contain",
                }}
              />
              {/* Inner counter-rotating mandala artwork */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                className="w-13 h-13 rounded-full bg-[#1c1a17]/95 border border-[#d4af37] flex items-center justify-center shadow-lg shadow-black/50"
              >
                <span className="material-symbols-outlined text-[20px] text-[#d4af37]">
                  filter_vintage
                </span>
              </motion.div>
            </div>
          </div>

          {/* Gold-Stroked Wavy Bottom Mask SVG */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 translate-y-[1px]">
            <svg
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
              className="w-full h-12 text-[#faf9f6] fill-current"
            >
              <path d="M0 0 C 0 6, 4 13, 12 16 C 20 18, 35 18.5, 50 18.5 C 65 18.5, 80 18, 88 16 C 96 13, 100 6, 100 0 L100 20 L0 20 Z" />
              <path
                d="M0 0 C 0 6, 4 13, 12 16 C 20 18, 35 18.5, 50 18.5 C 65 18.5, 80 18, 88 16 C 96 13, 100 6, 100 0"
                fill="none"
                stroke="#d4af37"
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* 3. Collections Cards Snap-Scrolling Carousel */}
        <div className="w-full bg-[#faf9f6] pt-10 pb-10 relative flex flex-col items-center">
          {/* Scroll Snap Container with exact center alignment padding */}
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            className="w-full overflow-x-auto flex gap-8 pb-4 snap-x snap-mandatory scroll-smooth scrollbar-none"
            style={{
              paddingLeft: "calc(50vw - 50px)",
              paddingRight: "calc(50vw - 50px)",
            }}
          >
            {[...displayCards, ...displayCards, ...displayCards].map((card, index) => {
              const isActive = index === activeDOMIndex;
              return (
                <div
                  key={`${card.id}-${index}`}
                  className="flex flex-col items-center shrink-0 snap-center select-none"
                  style={{ width: "100px" }}
                >
                  <Link
                    to={card.link}
                    onClick={(e) => {
                      if (!isActive) {
                        e.preventDefault();
                        scrollToDOMIndex(index);
                      }
                    }}
                    className={`relative w-20 h-20 rounded-full border-[3px] shadow-[0_6px_16px_rgba(0,0,0,0.06)] transition-all duration-500 flex items-center justify-center overflow-hidden ${
                      isActive 
                        ? "border-[#d4af37] scale-110 shadow-[0_8px_24px_rgba(212,175,55,0.25)] ring-4 ring-[#d4af37]/15" 
                        : "border-white scale-95 opacity-60"
                    }`}
                  >
                    <CloudinaryImage
                      src={card.image || "https://res.cloudinary.com/drxgnnzeb/image/upload/v1779181764/event_decor_ecommerce/assets/event_decor_mobile%20hero%20background.png"}
                      alt={card.title}
                      className={`w-full h-full object-cover transition-transform duration-700 ${
                        isActive ? "scale-105" : "scale-100"
                      }`}
                      containerClassName="absolute inset-0 w-full h-full rounded-full"
                    />
                    {/* Subtle overlay for inactive state depth */}
                    <div className={`absolute inset-0 transition-opacity duration-500 ${
                      isActive ? "bg-[#d4af37]/5" : "bg-black/10"
                    }`} />
                  </Link>

                  {/* Spaced Elegant Label */}
                  <span className={`text-[9.5px] font-extrabold uppercase tracking-[0.15em] mt-3.5 text-center transition-all duration-300 ${
                    isActive ? "text-[#d4af37]" : "text-[#1c1a17]/40"
                  }`}>
                    {card.title.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Swipe/Scroll Center Indicator */}
          <div className="flex flex-col items-center mt-5">
            <div className="w-12 h-12 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center justify-center border border-black/[0.03] animate-pulse">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Left/Right Arrows */}
                <path d="M5 12H2M2 12L5 9M2 12L5 15" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 12H22M22 12L19 9M22 12L19 15" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Finger Pointer Icon */}
                <path d="M12 15V8.5C12 7.67157 11.3284 7 10.5 7C9.67157 7 9 7.67157 9 8.5V13M12 15C12 15.8284 11.3284 16.5 10.5 16.5C9.67157 16.5 9 15.8284 9 15M12 15H14.5C15.3284 15 16 14.3284 16 13.5C16 12.6716 15.3284 12 14.5 12H12" stroke="#d4af37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-[#1c1a17]/35 mt-2">
              S C R O L L
            </span>
          </div>
        </div>
      </section>
    );
  }

  /* ─────────── DESKTOP — Side-by-side layout (preserved) ─────────── */
  return (
    <section className="relative min-h-[720px] flex flex-col justify-center overflow-hidden bg-surface-bright py-0">
      {/* Architectural Background Texture & Mandalas */}
      <div className="absolute inset-0 bg-marble opacity-5 pointer-events-none"></div>

      <div className="absolute top-1/4 left-0 w-[700px] h-[700px] bg-primary-container/20 rounded-full blur-[150px] -translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary-container/20 rounded-full blur-[150px] pointer-events-none translate-x-1/4 translate-y-1/4" />

      <div className="absolute -top-36 -left-36 opacity-[0.08] origin-top-left pointer-events-none">
        <MandalaElement size={720} duration={120} skipFade={true} />
      </div>

      {/* Mandala art images — desktop */}
      <MandalaArtDecor
        variant={1}
        size={620}
        className="-top-36 -left-36 z-[1]"
        opacity={0.2}
        blendMode="darken"
        spinDuration={180}
      />
      <MandalaArtDecor
        variant={3}
        size={480}
        className="-bottom-32 -right-32 z-[1]"
        opacity={0.15}
        blendMode="darken"
        spinDuration={200}
      />
      <div className="absolute bottom-[20%] -right-18 opacity-[0.06] origin-bottom-right pointer-events-none">
        <MandalaElement size={540} duration={180} variant={2} skipFade={true} />
      </div>
      <MandalaElement
        className="absolute top-[30%] right-[15%] opacity-[0.02]"
        size={360}
        duration={150}
        skipFade={true}
      />

      <div className="max-w-max-width mx-auto px-margin-desktop w-full grid grid-cols-12 gap-20 items-center relative z-10 flex-1">
        {/* Hero Content */}
        <div className="col-span-7 flex flex-col items-start text-left space-y-6 z-20">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-outline-variant/50 bg-surface/50 backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
            <span className="font-label-sm text-[9px] text-on-surface-variant tracking-widest uppercase font-bold">
              {hero.badgeText}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 27 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-headline text-[65px] text-on-surface leading-[1.1] tracking-tighter"
          >
            {hero.title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="font-body text-black/60 text-lg max-w-lg leading-relaxed font-light"
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-row space-x-3 pt-4"
          >
            <Link
              to={hero.ctaPrimary.link}
              className="btn-primary text-center px-5 py-3.5 text-[12px]"
            >
              {hero.ctaPrimary.text}
            </Link>

            <Link
              to={hero.ctaSecondary.link}
              className="btn-outline text-center px-5 py-3.5 text-[12px]"
            >
              {hero.ctaSecondary.text}
            </Link>
          </motion.div>
        </div>

        {/* Hero Imagery */}
        <div className="col-span-5 relative w-full h-[580px]">
          <CloudinaryImage
            src={hero.backgroundImage}
            alt="Hero background"
            className="w-full h-full object-cover"
            containerClassName="absolute right-0 top-0 w-full h-full rounded-[43px] overflow-hidden shadow-2xl border border-black/5"
            loading="eager"
            fetchPriority="high"
            width={800}
            height={600}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>


          {/* Floating Glass Card */}
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute -left-10 bottom-10 w-[230px] bg-white/90 backdrop-blur-2xl border border-black/5 p-7 rounded-[28px] shadow-2xl"
          >
            <h3 className="font-display text-lg text-black mb-1.5 italic">
              Heritage Craft.
            </h3>
            <p className="font-body text-black/50 text-[11px] mb-5 font-light leading-relaxed">
              Meticulously detailed by master artisans over 120 hours.
            </p>
            <Link
              to="/about"
              className="font-label-sm text-[11px] text-primary uppercase tracking-widest font-bold inline-flex items-center group"
            >
              Explore Technique
              <span className="material-symbols-outlined text-[12px] ml-2 transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      {windowHeight >= 500 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 0.4,
            y: [0, 10, 0],
          }}
          transition={{
            opacity: { duration: 0.5 },
            y: { duration: 2, repeat: Infinity },
          }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
        >
          <span className="font-label-sm text-[12px] uppercase tracking-[0.3em] mb-2">
            Scroll
          </span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-primary to-transparent"></div>
        </motion.div>
      )}
    </section>
  );
}
