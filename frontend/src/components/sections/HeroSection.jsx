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
      <section className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden">
        {/* Full-bleed background image - Optimized */}
        <CloudinaryImage
          src={hero.backgroundImage}
          alt="Hero background"
          className="w-full h-full object-cover"
          containerClassName="absolute inset-0 z-0"
          loading="eager"
          fetchPriority="high"
        />

        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 z-[1] bg-black/40" />

        {/* Subtle grain texture */}
        <div
          className="absolute inset-0 z-[2] opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Floating mandala accents */}
        <div className="absolute top-16 -right-12 opacity-[0.06] z-[2] pointer-events-none">
          <MandalaElement size={240} duration={120} skipFade={true} />
        </div>
        <div className="absolute -bottom-20 -left-16 opacity-[0.04] z-[2] pointer-events-none">
          <MandalaElement
            size={320}
            duration={180}
            variant={2}
            skipFade={true}
          />
        </div>

        {/* Hero content — Entire area blurred with backdrop-blur */}
        <div className="relative z-10 px-6 pb-[calc(var(--bottom-nav-height)+40px)] pt-32 flex flex-col justify-end min-h-[100svh] backdrop-blur-xl bg-black/30">
          {/* Top-left mandala art image */}
          <MandalaArtDecor
            variant={1}
            size={320}
            className="-top-12 -left-12"
            opacity={0.35}
            dark
            blendModeDark="soft-light"
            spinDuration={150}
          />
          {/* Kicker / Eyebrow */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="h-px w-8 bg-primary-container/70" />
            <span className="font-label-sm text-[10px] text-primary-container tracking-[0.4em] uppercase font-bold">
              {hero.badgeText}
            </span>
          </motion.div>

          {/* Editorial headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="font-headline text-[42px] leading-[1.05] tracking-tight text-white mb-4"
          >
            {hero.title.split(" ").slice(0, -1).join(" ")}
            <br />
            <span className="italic font-light text-primary-container">
              {hero.title.split(" ").slice(-1).join(" ")}
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="font-body text-white/70 text-[14px] leading-relaxed max-w-[320px] mb-8 font-light"
          >
            {hero.subtitle}
          </motion.p>

          {/* Heritage badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.6 }}
            className="flex items-center gap-2 mb-10"
          >
            <span className="material-symbols-outlined text-primary-container text-[16px]">
              verified
            </span>
            <span className="font-label text-[9px] uppercase tracking-[0.25em] text-white/50 font-bold">
              {hero.badgeText}
            </span>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex flex-col gap-4"
          >
            <Link
              to={hero.ctaPrimary.link}
              className="w-full h-14 flex items-center justify-center gap-3 rounded-full bg-white text-black font-bold text-[11px] uppercase tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all group"
            >
              {hero.ctaPrimary.text}
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                trending_flat
              </span>
            </Link>
            <Link
              to={hero.ctaSecondary.link}
              className="w-full h-14 flex items-center justify-center rounded-full border border-white/30 text-white font-bold text-[11px] uppercase tracking-[0.3em] backdrop-blur-md active:scale-[0.98] transition-all"
            >
              {hero.ctaSecondary.text}
            </Link>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3, y: [0, 8, 0] }}
          transition={{
            opacity: { delay: 1.5, duration: 0.5 },
            y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <div className="w-[1px] h-8 bg-gradient-to-b from-white/50 to-transparent mx-auto" />
        </motion.div>
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
