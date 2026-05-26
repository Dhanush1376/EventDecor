import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MandalaElement } from "../ui/MandalaElement";
import { MandalaArtDecor } from "../ui/MandalaArtDecor";
import { useWindowHeight } from "../../hooks/useWindowHeight";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";
import { CloudinaryImage } from "../ui/CloudinaryImage";
import { HeroSkeleton } from "../ui/Skeleton";

export function HeroSection({
  badgeText,
  title,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  backgroundImage,
  mobileBackgroundImage,
  floatingCardTitle,
  floatingCardDesc,
  floatingCardCtaText,
  floatingCardCtaLink,
  scrollText,
  isVisible = true
}) {
  const windowHeight = useWindowHeight();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  
  const { hero: cmsHero, loading } = useWebsiteContent();

  // Merge dynamic PageLayout props with CMS fallback
  const hero = {
    badgeText: badgeText || cmsHero?.badgeText,
    title: title || cmsHero?.title,
    subtitle: subtitle || cmsHero?.subtitle,
    ctaPrimary: ctaPrimary || cmsHero?.ctaPrimary,
    ctaSecondary: ctaSecondary || cmsHero?.ctaSecondary,
    backgroundImage: backgroundImage || cmsHero?.backgroundImage,
    mobileBackgroundImage: mobileBackgroundImage || cmsHero?.mobileBackgroundImage,
    floatingCardTitle: floatingCardTitle || cmsHero?.floatingCardTitle,
    floatingCardDesc: floatingCardDesc || cmsHero?.floatingCardDesc,
    floatingCardCtaText: floatingCardCtaText || cmsHero?.floatingCardCtaText,
    floatingCardCtaLink: floatingCardCtaLink || cmsHero?.floatingCardCtaLink,
    scrollText: scrollText || cmsHero?.scrollText,
    isVisible: isVisible !== undefined ? isVisible : cmsHero?.isVisible
  };

  const getBadgeParts = () => {
    if (!hero?.badgeText) return { top: "ARTISAN EXCELLENCE", bottom: "SINCE 2015" };
    const parts = hero.badgeText.split(/\s+[Ss][Ii][Nn][Cc][Ee]\s+/);
    if (parts.length > 1) {
      return { top: parts[0], bottom: `SINCE ${parts[1]}` };
    }
    return { top: hero.badgeText, bottom: "" };
  };
  const { top: badgeTop, bottom: badgeBottom } = getBadgeParts();

  const getFormattedTitle = () => {
    if (!hero?.title) return null;
    const words = hero.title.split(" ");
    if (words.length <= 2) {
      return <span className="text-[#d4af37]">{hero.title}</span>;
    }
    const normalPart = words.slice(0, words.length - 2).join(" ");
    const goldPart1 = words[words.length - 2];
    const goldPart2 = words[words.length - 1];
    return (
      <>
        {normalPart}
        <br />
        <span className="text-[#d4af37] block mt-1">{goldPart1}</span>
        <span className="text-[#d4af37] block">{goldPart2}</span>
      </>
    );
  };

  if (!hero?.isVisible) return null;
  if (loading) return <HeroSkeleton />;

  /* ─────────── MOBILE — Immersive full-bleed static blurred hero ─────────── */
  if (isMobile) {
    return (
      <section className="relative w-full overflow-hidden bg-[#0f0e0c]">
        {/* Ambient Gold Gradient Glows */}
        <div className="absolute top-[35%] left-0 w-[260px] h-[260px] bg-[#d4af37]/15 rounded-full blur-[80px] -translate-x-1/2 pointer-events-none z-0" />
        <div className="absolute bottom-[10%] right-0 w-[240px] h-[240px] bg-[#d4af37]/10 rounded-full blur-[80px] translate-x-1/3 pointer-events-none z-0" />

        {/* 1. Dark Hero Banner Section */}
        <div className="relative text-white pt-32 pb-24 px-7 flex flex-col z-10 min-h-[100dvh] justify-center overflow-hidden">
          {/* Background image & gradient overlay */}
          <div className="absolute inset-0 z-0">
            <CloudinaryImage
              src={hero.mobileBackgroundImage || hero.backgroundImage || "https://res.cloudinary.com/drxgnnzeb/image/upload/v1779181764/event_decor_ecommerce/assets/event_decor_mobile%20hero%20background.png"}
              alt="Luxury Royal Wedding Background"
              className="w-full h-full object-cover"
              containerClassName="absolute inset-0 w-full h-full"
              loading="eager"
              fetchPriority="high"
              width={600}
              height={1200}
            />
            {/* Soft dark radial & linear gradients to ensure premium contrast, fading on the right */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0F0E0C]/95 via-[#0F0E0C]/60 to-transparent mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E0C] via-[#0F0E0C]/60 to-transparent" />
            
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
                  {badgeTop}
                </span>
                {badgeBottom && (
                  <span className="font-label text-[9px] tracking-[0.25em] text-[#d4af37] uppercase font-semibold leading-tight mt-0.5">
                    {badgeBottom}
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <h2 className="font-headline text-[33px] sm:text-[38px] leading-[1.1] text-white mb-5 tracking-wide">
              {getFormattedTitle()}
            </h2>

            {/* Thin Gold Divider */}
            <div className="w-12 h-[1px] bg-[#d4af37]/60 mb-5" />

            {/* Subtext */}
            <p className="font-body text-white/80 text-[12px] leading-relaxed mb-6 max-w-[270px]">
              {hero.subtitle}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 items-start w-full mt-2">
              {hero.ctaPrimary && (
                <Link
                  to={hero.ctaPrimary.link || "/collections"}
                  className="w-full justify-center bg-[#d4af37] text-[#0f0e0c] font-bold text-[12px] uppercase tracking-[0.2em] px-7 py-4 rounded-full inline-flex items-center gap-2.5 active:scale-95 transition-all shadow-lg hover:bg-[#c4a030]"
                >
                  {hero.ctaPrimary.text?.toUpperCase() || "EXPLORE COLLECTIONS"}
                  <span className="material-symbols-outlined text-[15px] font-bold">arrow_forward</span>
                </Link>
              )}

              {hero.ctaSecondary && (
                <Link
                  to={hero.ctaSecondary.link || "/about"}
                  className="inline-flex items-center justify-center w-full gap-3.5 text-white/90 font-bold text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all py-3"
                >
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[15px] text-white fill-current">
                      {(hero.ctaSecondary.link?.includes("about") || hero.ctaSecondary.link?.includes("story") || hero.ctaSecondary.text?.toLowerCase().includes("story") || hero.ctaSecondary.text?.toLowerCase().includes("watch")) ? "play_arrow" : "arrow_forward"}
                    </span>
                  </div>
                  <span className="underline decoration-[#d4af37] underline-offset-4 font-bold">
                    {hero.ctaSecondary.text?.toUpperCase() || "WATCH OUR STORY"}
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* Bottom-Right Rotating Mandala Seal */}
          <div className="absolute right-4 bottom-20 w-24 h-24 z-20 pointer-events-none">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Outer rotating ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-full h-full rounded-full"
                style={{
                  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
                    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none"/><text fill="%23d4af37" font-size="5.5" font-family="serif" letter-spacing="1.5"><textPath href="%23circlePath">${hero.rotatingSealText || "• HANDCRAFTED LUXURY • HERITAGE ARTISTRY •"}</textPath></text></svg>`
                  )}")`,
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
              className="w-full h-12 text-[#FDFBF7] fill-current"
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
              to={hero.ctaPrimary?.link || "/collections"}
              className="btn-primary text-center px-5 py-3.5 text-[12px]"
            >
              {hero.ctaPrimary?.text}
            </Link>

            <Link
              to={hero.ctaSecondary?.link || "/about"}
              className="btn-outline text-center px-5 py-3.5 text-[12px]"
            >
              {hero.ctaSecondary?.text}
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
          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent rounded-[43px] pointer-events-none"></div>


          {/* Floating Glass Card */}
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute -left-10 bottom-10 w-[230px] bg-white/90 backdrop-blur-2xl border border-black/5 p-7 rounded-[28px] shadow-2xl"
          >
            <h3 className="font-display text-lg text-black mb-1.5 italic">
              {hero.floatingCardTitle || "Heritage Craft."}
            </h3>
            <p className="font-body text-black/50 text-[11px] mb-5 font-light leading-relaxed">
              {hero.floatingCardDesc || "Meticulously detailed by master artisans over 120 hours."}
            </p>
            <Link
              to={hero.floatingCardCtaLink || "/about"}
              className="font-label-sm text-[11px] text-primary uppercase tracking-widest font-bold inline-flex items-center group"
            >
              {hero.floatingCardCtaText || "Explore Technique"}
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
            {hero.scrollText || "Scroll"}
          </span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-primary to-transparent"></div>
        </motion.div>
      )}
    </section>
  );
}
