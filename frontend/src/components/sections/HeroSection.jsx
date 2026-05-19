import React, { useState, useEffect } from "react";
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
  const { hero } = useWebsiteContent();

  if (!hero?.isVisible) return null;

  /* ─────────── MOBILE — Immersive full-bleed static blurred hero ─────────── */
  if (isMobile) {
    return (
      <section className="relative w-full overflow-hidden bg-surface">
        {/* 1. Dark Hero Section with V-shape bottom and Background Image */}
        <div className="relative text-white pt-28 pb-24 px-6 flex flex-col z-10 min-h-[440px] justify-center overflow-hidden">
          {/* Background image & gradient overlay */}
          <div className="absolute inset-0 z-0">
            <CloudinaryImage
              src={hero.mobileBackgroundImage || hero.backgroundImage || "/images/luxury_royal_wedding.png"}
              alt="Luxury Royal Wedding Background"
              className="w-full h-full object-cover"
              containerClassName="absolute inset-0 w-full h-full"
              loading="eager"
              fetchPriority="high"
            />
            {/* Soft dark radial & linear gradients to ensure premium contrast, fading on the right */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0F0E0C]/90 via-[#0F0E0C]/40 to-transparent mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E0C] via-black/30 to-transparent" />
            {/* Subtle grain/texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-start max-w-[290px]">
            {/* Eyebrow */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="material-symbols-outlined text-[13px] text-[#d4af37]">
                filter_vintage
              </span>
              <span className="font-label text-[8px] tracking-[0.2em] text-[#d4af37]/80 uppercase font-semibold leading-none">
                ARTISAN EXCELLENCE SINCE 2003
              </span>
            </div>

            {/* Title */}
            <h1 className="font-headline text-[26px] leading-[1.25] text-white mb-4">
              Heritage
              <br />
              Crafted for
              <br />
              <span className="text-[#d4af37] italic font-normal inline-block relative">
                Modern Celebrations
                <span className="absolute left-0 -bottom-1.5 w-full h-[1px] bg-[#d4af37]/60" />
              </span>
            </h1>

            {/* Subtext */}
            <p className="font-body text-white/75 text-[11.5px] leading-relaxed mb-6">
              Handcrafted luxury event decorations rooted in South Indian tradition.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 items-start w-full">
              <Link
                to="/collections"
                className="border border-[#d4af37]/60 text-[#d4af37] font-semibold text-[9.5px] uppercase tracking-widest px-5 py-2.5 rounded-full inline-flex items-center gap-1.5 bg-[#d4af37]/5 active:scale-95 transition-all hover:bg-[#d4af37]/10"
              >
                EXPLORE COLLECTIONS
                <span className="material-symbols-outlined text-[12px]">trending_flat</span>
              </Link>

              <Link
                to="/about"
                className="inline-flex items-center gap-1.5 text-white/80 font-semibold text-[9px] uppercase tracking-widest active:scale-95 transition-all py-1"
              >
                <span className="material-symbols-outlined text-[13px] text-[#d4af37]">
                  play_arrow
                </span>
                <span className="underline decoration-[#d4af37]/40 underline-offset-4 font-semibold">
                  WATCH OUR STORY
                </span>
              </Link>
            </div>
          </div>

          {/* V-Shape bottom mask */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 translate-y-[1px]">
            <svg
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              className="w-full h-6 text-surface fill-current"
            >
              <path d="M0 0 L50 10 L100 0 L100 10 L0 10 Z" />
              <path d="M0 0 L50 10 L100 0" fill="none" stroke="#d4af37" strokeWidth="0.3" />
            </svg>
          </div>
        </div>

        {/* 2. Cream Content Area */}
        <div className="relative bg-surface px-5 pt-8 pb-10 flex flex-col items-center">
          {/* Watermark mandala in the background */}
          <div className="absolute bottom-2 left-2 w-44 h-44 opacity-[0.03] pointer-events-none mix-blend-multiply">
            <img src="/mandala_hero_art.png" alt="" className="w-full h-full object-contain animate-slow-spin" style={{ animationDuration: "120s" }} />
          </div>
          {/* Booking Consultation Banner */}
          <div className="w-full max-w-[420px] bg-[#0F0E0C] rounded-full py-2.5 px-4 flex items-center justify-between border border-[#d4af37]/35 shadow-lg mb-8 relative overflow-hidden">
            {/* Left side */}
            <div className="flex items-center gap-2 relative z-10 min-w-0">
              <span className="material-symbols-outlined text-[12px] text-[#d4af37] shrink-0">
                calendar_month
              </span>
              <span className="text-white text-[9.5px] font-medium tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
                Let's Design Your Dream Celebration
              </span>
            </div>

            {/* Divider */}
            <div className="h-3 w-px bg-[#d4af37]/25 mx-2.5 shrink-0" />

            {/* Right side */}
            <Link
              to="/custom-orders"
              className="text-[#d4af37] text-[8.5px] font-bold uppercase tracking-widest shrink-0 flex items-center gap-1 active:scale-95 transition-all"
            >
              BOOK NOW
              <span className="material-symbols-outlined text-[10px] text-[#d4af37]">
                trending_flat
              </span>
            </Link>
          </div>

          {/* Scroll Indicator */}
          <div className="flex flex-col items-center gap-1.5 opacity-60">
            <span className="text-[8px] uppercase tracking-[0.25em] font-bold text-[#d4af37]">
              SCROLL
            </span>
            <div className="w-4 h-7 rounded-full border border-[#d4af37]/40 p-[3px] flex justify-center">
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-1 rounded-full bg-[#d4af37]"
              />
            </div>
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
