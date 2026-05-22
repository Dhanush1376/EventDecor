import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { SEO } from "../components/seo/SEO";
import { MandalaElement } from "../components/ui/MandalaElement";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { galleryService, cmsService } from "../services/domainServices";
import { CloudinaryImage } from "../components/ui/CloudinaryImage";
import { useWebsiteContent } from "../hooks/useWebsiteContent";
import { StackedSectionWrapper } from "../components/layout/StackedSectionWrapper";
import { initialWebsiteContent } from "../admin/data/websiteContentData";

import logger from '../utils/logger';
const cleanSignatureImg = (imgUrl, founderName) => {
  if (!imgUrl || imgUrl.includes("unsplash.com") || imgUrl === "" || imgUrl.includes("images.unsplash.com")) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="250" height="80" viewBox="0 0 250 80"><defs><style>@import url('https://fonts.googleapis.com/css2?family=Alex+Brush&amp;display=swap');.sig { font-family: 'Alex Brush', cursive; font-size: 42px; fill: %231a1a1a; }</style></defs><text x="25" y="52" class="sig">${founderName}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  return imgUrl;
};

export function About() {
  const { navigation } = useWebsiteContent();
  const logoText = navigation?.logo?.text || "SIRI ARTS & CRAFTS";
  const logoWords = logoText.split(" ");
  const firstWord = logoWords[0] || "SIRI";
  const restWords = logoWords.slice(1).join(" ") || "ARTS & CRAFTS";

  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  const [cmsContent, setCmsContent] = useState(null);
  const [galleryPreview, setGalleryPreview] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const specScrollRef = useRef(null);
  const [isDraggingSpec, setIsDraggingSpec] = useState(false);
  const [startXSpec, setStartXSpec] = useState(0);
  const [scrollLeftSpec, setScrollLeftSpec] = useState(0);

  const handleMouseDownSpec = (e) => {
    setIsDraggingSpec(true);
    setStartXSpec(e.pageX - specScrollRef.current.offsetLeft);
    setScrollLeftSpec(specScrollRef.current.scrollLeft);
  };

  const handleMouseLeaveSpec = () => {
    setIsDraggingSpec(false);
  };

  const handleMouseUpSpec = () => {
    setIsDraggingSpec(false);
  };

  const handleMouseMoveSpec = (e) => {
    if (!isDraggingSpec) return;
    e.preventDefault();
    const x = e.pageX - specScrollRef.current.offsetLeft;
    const walk = (x - startXSpec) * 1.5; // scroll-fast multiplier
    specScrollRef.current.scrollLeft = scrollLeftSpec - walk;
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Fetch CMS data with individual catch block
      try {
        const cmsRes = await cmsService.getSection('aboutPage');
        if (cmsRes?.success && cmsRes?.data) {
          // The API response holds data in res.data, and within it, section.data is at cmsRes.data.data
          setCmsContent(cmsRes.data.data || cmsRes.data);
        }
      } catch (err) {
        logger.error("About page CMS content fetch failed:", err);
      }

      // Fetch Gallery data with individual catch block
      try {
        const galleryRes = await galleryService.getAll({ limit: 8 });
        if (galleryRes?.success) {
          setGalleryPreview(galleryRes.data?.items || galleryRes.data?.data || galleryRes.data || []);
        }
      } catch (err) {
        logger.error("About page gallery fetch failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Premium Data Content from CMS
  const specializations = cmsContent?.specializations || [];
  const features = cmsContent?.features || [];
  const founders = cmsContent?.founders || [];

  return (
    <div
      ref={containerRef}
      className="bg-surface relative overflow-hidden text-on-surface"
    >
      <SEO
        title={`Our Story | ${logoText}`}
        description={`Discover the cinematic luxury of ${logoText}. Handcrafted Telugu cultural decor.`}
      />

      {/* 1. HERO SECTION - Cinematic Immersive Entrance */}
      <StackedSectionWrapper index={0} isLast={false} bgClass="bg-black">
      <section className="relative h-[100dvh] min-h-[700px] w-full flex items-center justify-center overflow-hidden bg-black">
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 w-full h-full"
        >
          <CloudinaryImage
            src={cmsContent?.heroImage || initialWebsiteContent?.aboutPage?.heroImage || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop"}
            alt="Cinematic Wedding Decor"
            className="w-full h-full object-cover opacity-60 mix-blend-screen"
            containerClassName="w-full h-full"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
        </motion.div>



        <div className="relative z-10 text-center text-white px-6 mt-16 max-w-5xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 mb-8"
          >
            <span className="w-12 h-[1px] bg-primary"></span>
            <span className="font-label-sm text-[10px] md:text-[11px] uppercase tracking-[0.5em] text-primary font-bold">
              The {firstWord} {restWords} Heritage
            </span>
            <span className="w-12 h-[1px] bg-primary"></span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="font-headline text-[48px] md:text-[72px] lg:text-[96px] leading-[1.05] tracking-tight mb-8"
          >
            {cmsContent?.heroTitle || "Crafting Traditions"} <br />
            <span className="italic font-light text-white">
              {cmsContent?.heroSubtitle || "with Elegance."}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="font-body text-[16px] md:text-[20px] text-white/70 font-light leading-relaxed max-w-2xl mx-auto"
          >
            {cmsContent?.missionStatement || ""}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4"
          >
            <span className="font-label-sm text-[9px] uppercase tracking-[0.3em] text-white/50 font-bold">
              Scroll to Explore
            </span>
            <div className="w-[1px] h-16 bg-white/20 relative overflow-hidden">
              <motion.div
                animate={{ y: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-full h-1/2 bg-white"
              />
            </div>
          </motion.div>
        </div>
      </section>
      </StackedSectionWrapper>

      {/* 2. OUR STORY SECTION - Editorial Split */}
      <StackedSectionWrapper index={1} isLast={false} bgClass="bg-surface">
      <section className="py-24 md:py-40 relative bg-surface z-10 overflow-hidden">
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Detailed mandala art — story section */}
        <MandalaArtDecor
          variant={2}
          size={320}
          className="-top-16 -right-16 md:hidden"
          opacity={0.16}
          blendMode="darken"
          spinDuration={170}
        />
        <MandalaArtDecor
          variant={2}
          size={600}
          className="-top-36 -right-36 hidden md:block"
          opacity={0.12}
          blendMode="darken"
          spinDuration={170}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1 }}
            className="relative aspect-[3/4] md:aspect-[4/5] bg-white rounded-[40px] p-4 md:p-6 shadow-[0_40px_80px_rgba(0,0,0,0.08)] border border-black/[0.02]"
          >
            <div className="w-full h-full rounded-[32px] md:rounded-t-full md:rounded-b-full overflow-hidden relative">
              <CloudinaryImage
                src={cmsContent?.storyImage || "/assets/legacy_artistry_decor.png"}
                alt="Handcrafted Details"
                className="scale-[1.02] hover:scale-110 transition-transform duration-[3s] ease-out"
                containerClassName="w-full h-full"
                loading="lazy"
                width={600}
                height={800}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>
          </motion.div>

          <div className="space-y-8 relative">
            <MandalaElement
              size={300}
              duration={160}
              className="absolute -top-16 -left-16 opacity-[0.04] pointer-events-none"
              skipFade
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-primary/10 bg-primary/5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.4em] font-bold">
                The Journey
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-headline text-[42px] md:text-[56px] lg:text-[64px] leading-[1.1] tracking-tight text-on-surface"
            >
              A Legacy of <br />
              <span className="italic font-light text-primary">
                Family Artistry.
              </span>
            </motion.h2>

            <div className="space-y-6">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="font-body text-[16px] md:text-[18px] text-on-surface-variant/80 font-light leading-relaxed"
              >
                Founded with a profound passion for celebrations, Siri Arts &
                Crafts began as a small family endeavor designed to weave
                authentic Telugu traditions into modern wedding landscapes.
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="font-body text-[16px] md:text-[18px] text-on-surface-variant/80 font-light leading-relaxed"
              >
                Today, we stand as a premier digital studio, honoring our
                ancient roots while elevating event decor to a profound form of
                high art. Our artisans pour their hearts into every creation,
                ensuring your cherished moments are framed in unparalleled
                elegance.
              </motion.p>
            </div>
          </div>
        </div>
      </section>
      </StackedSectionWrapper>

      {/* 3. CRAFTSMANSHIP & FEATURED SPECIALIZATIONS - Premium Grid */}
      {specializations.length > 0 && (
        <StackedSectionWrapper index={2} isLast={false} bgClass="bg-surface-bright">
        <section className="py-24 md:py-32 relative bg-surface-bright border-y border-black/5">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-secondary-container/20 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 mb-16 md:mb-24 text-center relative z-10">
          <span className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 block">
            Our Expertise
          </span>
          <h2 className="font-headline text-[42px] md:text-[56px] leading-[1.1] tracking-tight">
            Signature Specializations
          </h2>
        </div>

        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-12 relative z-10">
          <div
            ref={specScrollRef}
            onMouseDown={handleMouseDownSpec}
            onMouseLeave={handleMouseLeaveSpec}
            onMouseUp={handleMouseUpSpec}
            onMouseMove={handleMouseMoveSpec}
            className={`flex flex-row gap-6 md:gap-8 overflow-x-auto pb-8 scrollbar-none cursor-grab active:cursor-grabbing select-none snap-x snap-mandatory scroll-smooth`}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {specializations.map((spec, i) => (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
                viewport={{ once: true, margin: "-50px" }}
                key={i}
                className="group relative flex flex-col cursor-pointer shrink-0 snap-start w-[280px] sm:w-[320px] md:w-[calc(50%-16px)] lg:w-[calc(33.333%-22px)]"
              >
                {/* 1. Image Frame - Shop Style */}
                <div className="relative aspect-[4/5] rounded-2xl md:rounded-[40px] overflow-hidden mb-3 md:mb-6 bg-surface-container-low border border-black/[0.03]">
                  <CloudinaryImage
                    src={spec.img}
                    alt={spec.title}
                    className="absolute inset-0 w-full h-full transition-transform duration-[2.5s] ease-out group-hover:scale-110 pointer-events-none"
                    containerClassName="w-full h-full"
                    loading="lazy"
                    width={400}
                    height={500}
                  />

                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                  {/* Luxury Brand Mark */}
                  <div className="absolute top-3 right-3 md:top-4 md:right-4 w-7 h-7 md:w-10 md:h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
                    <span className="material-symbols-outlined text-white text-[12px] md:text-[18px]">
                      workspace_premium
                    </span>
                  </div>
                </div>

                {/* 2. Editorial Details - Shop Style */}
                <div className="flex flex-col pointer-events-none">
                  <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2.5">
                    <div className="w-4 md:w-6 h-[1px] bg-primary/30" />
                    <span className="font-label-sm text-[8px] md:text-[9px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-primary font-bold">
                      Artisan Craft
                    </span>
                  </div>
                  <h3 className="font-display text-[15px] md:text-[24px] text-on-surface leading-tight mb-1 md:mb-1.5 transition-colors group-hover:text-primary">
                    {spec.title}
                  </h3>
                  <p className="font-body text-[10px] md:text-[13px] text-on-surface-variant/60 font-light leading-relaxed line-clamp-1 md:line-clamp-none">
                    Meticulously handcrafted for your cherished moments.
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      </StackedSectionWrapper>
      )}

      {/* 4. WHY CHOOSE US - Floating Luxury Cards */}
      {features.length > 0 && (
      <StackedSectionWrapper index={3} isLast={false} bgClass="bg-surface">
      <section className="py-24 md:py-40 relative bg-surface overflow-hidden">
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Detailed mandala art — features */}
        <MandalaArtDecor
          variant={3}
          size={300}
          className="-bottom-14 -right-14 md:hidden"
          opacity={0.15}
          blendMode="darken"
          spinDuration={185}
        />
        <MandalaArtDecor
          variant={3}
          size={600}
          className="-bottom-40 -right-40 hidden md:block"
          opacity={0.1}
          blendMode="darken"
          spinDuration={185}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center mb-16 md:mb-24">
          <span className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 block">
            The Siri Difference
          </span>
          <h2 className="font-headline text-[42px] md:text-[56px] leading-[1.1] tracking-tight">
            Why Families Choose Us
          </h2>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-12 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
          {features.map((feature, i) => (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              key={i}
              className="bg-white/90 backdrop-blur-xl border border-black/[0.02] rounded-[24px] md:rounded-[32px] p-5 md:p-10 hover:shadow-[0_20px_40px_rgba(212,175,55,0.06)] transition-all duration-500 group hover:-translate-y-2 relative overflow-hidden flex flex-col items-center text-center"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-surface border border-black/5 flex items-center justify-center mb-5 md:mb-8 group-hover:bg-primary group-hover:border-primary transition-all duration-500 shadow-sm group-hover:shadow-lg">
                <span className="material-symbols-outlined text-[20px] md:text-[24px] text-primary group-hover:text-white transition-colors duration-500">
                  {feature.icon}
                </span>
              </div>
              <h3 className="font-display text-[15px] md:text-[22px] text-on-surface mb-2 md:mb-4 leading-tight">
                {feature.title}
              </h3>
              <p className="font-body text-[11px] md:text-[14px] text-on-surface-variant/60 font-light leading-relaxed line-clamp-3 md:line-clamp-none">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
      </StackedSectionWrapper>
      )}

      {/* 5. TESTIMONIALS - Cinematic Emotion */}
      {cmsContent?.testimonialQuote && (
      <StackedSectionWrapper index={4} isLast={false} bgClass="bg-black">
      <section className="py-32 md:py-48 bg-black relative text-white overflow-hidden">
        <div className="absolute inset-0 opacity-50">
          <CloudinaryImage
            src={cmsContent?.testimonialImage || ""}
            alt="Wedding Background"
            className="mix-blend-overlay"
            containerClassName="w-full h-full"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black" />
          <div className="absolute inset-0 bg-primary/5 mix-blend-color" />
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 1 }}
            className="w-20 h-20 mx-auto rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center mb-10"
          >
            <span className="material-symbols-outlined text-[36px] text-primary">
              format_quote
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 1 }}
            className="font-headline text-[32px] md:text-[48px] lg:text-[56px] leading-[1.2] tracking-tight text-white mb-12 italic font-light max-w-4xl mx-auto"
          >
            "{cmsContent.testimonialQuote}"
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 1 }}
          >
            <h4 className="font-display text-[22px] text-primary mb-2">
              {cmsContent.testimonialAuthor}
            </h4>
            <p className="font-label-sm text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold">
              {cmsContent.testimonialEvent}
            </p>
          </motion.div>
        </div>
      </section>
      </StackedSectionWrapper>
      )}

      {/* 6. THE VISIONARIES - Dual Leadership */}
      {founders.length > 0 && (
      <StackedSectionWrapper index={5} isLast={false} bgClass="bg-surface-bright">
      <section className="py-24 md:py-40 relative bg-surface-bright overflow-hidden">
        <div className="absolute top-1/2 -left-[20%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary-container/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center mb-16 md:mb-24">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 block"
          >
            The Founders
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="font-headline text-[42px] md:text-[56px] leading-[1.1] tracking-tight"
          >
            Guiding the Studio
          </motion.h2>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 items-start gap-16 lg:gap-24 relative z-10">
          {founders?.map((founder, index) => (
            <div key={index} className="space-y-8 flex flex-col items-center lg:items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: index * 0.2 }}
                className="relative w-full max-w-[280px] aspect-square bg-white rounded-[32px] md:rounded-[40px] p-4 md:p-6 shadow-[0_30px_60px_rgba(0,0,0,0.06)] border border-black/[0.02] flex items-center justify-center group"
              >
                <div className="w-full h-full rounded-[24px] md:rounded-[32px] overflow-hidden relative bg-surface-container-low flex items-center justify-center">
                  <MandalaElement
                    size={240}
                    duration={180}
                    variant={index === 0 ? 1 : 2}
                    className="opacity-[0.15] group-hover:opacity-[0.25] transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
                  <span className="font-display text-[48px] md:text-[64px] text-primary/20 select-none">
                    {founder.initials}
                  </span>
                </div>
              </motion.div>

              <div className="space-y-6 w-full text-center lg:text-center">
                <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-primary/10 bg-primary/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.4em] font-bold">
                    {founder.role}
                  </span>
                </div>

                <h3 className="font-headline text-[32px] md:text-[42px] leading-tight">
                  {founder.name} <br />
                  <span className="italic font-light text-primary">
                    {founder.subtitle}
                  </span>
                </h3>

                <p className="font-body text-[16px] text-on-surface-variant/80 font-light leading-relaxed max-w-lg mx-auto">
                  {founder.quote}
                </p>

                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="pt-4 border-t border-black/5 flex justify-center lg:justify-center"
                >
                  <img
                    src={cleanSignatureImg(founder.signatureImg, founder.name)}
                    className="h-14 md:h-16 opacity-90 mix-blend-multiply filter grayscale contrast-150 -ml-4"
                    alt={`${founder.name} Signature`}
                  />
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </section>
      </StackedSectionWrapper>
      )}

      {/* 7. GALLERY PREVIEW - Pinterest Style Masonry Grid */}
      {galleryPreview.length > 0 && (
      <StackedSectionWrapper index={6} isLast={true} bgClass="bg-surface">
      <section className="py-24 md:py-40 bg-surface border-t border-black/5 relative">
        <MandalaElement
          size={600}
          duration={200}
          variant={2}
          className="absolute top-1/2 right-0 opacity-[0.02] pointer-events-none translate-x-1/2"
          skipFade
        />

        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center mb-16 md:mb-20">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="font-label-sm text-[10px] uppercase tracking-[0.4em] text-primary font-bold mb-4 block"
          >
            Visual Stories
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="font-headline text-[42px] md:text-[56px] leading-[1.1] tracking-tight"
          >
            The Studio Gallery
          </motion.h2>
        </div>

        <div className="max-w-[1440px] mx-auto px-6 md:px-12 columns-2 md:columns-4 gap-4 md:gap-6">
          {galleryPreview.map((item, i) => {
            const dynamicHeight = (!item.height || item.height === "aspect-square") 
              ? (i % 4 === 0 ? "aspect-[2/3]" : i % 4 === 1 ? "aspect-square" : i % 4 === 2 ? "aspect-[4/5]" : "aspect-[3/4]") 
              : item.height;

            return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.05, duration: 0.6 }}
              key={item._id || item.id}
              className="break-inside-avoid mb-4 md:mb-6 rounded-[24px] md:rounded-[40px] overflow-hidden group relative bg-white shadow-sm border border-black/[0.03] cursor-pointer"
            >
              <Link to={`/gallery?id=${item._id || item.id}`}>
                <div
                  className={`relative ${dynamicHeight} w-full overflow-hidden`}
                >
                  <CloudinaryImage
                    src={item.image}
                    alt={item.title}
                    className="transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
                    containerClassName="w-full h-full"
                    loading="lazy"
                    width={400}
                    height={500}
                  />
                  <div className="absolute inset-0 bg-primary/20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Overlay Info */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 text-center backdrop-blur-[2px] duration-500">
                    <span className="material-symbols-outlined text-white text-[32px] font-light mb-2 scale-50 group-hover:scale-100 transition-transform duration-500">
                      visibility
                    </span>
                    <p className="text-white font-display text-[16px] md:text-[18px] mb-1">
                      {item.title}
                    </p>
                    <p className="text-white/60 font-label-sm text-[8px] uppercase tracking-widest">
                      {item.event}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-16 md:mt-24">
          <Link
            to="/gallery"
            className="inline-flex items-center justify-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-white border border-black/5 rounded-full font-label-sm text-[10px] md:text-[11px] uppercase tracking-[0.2em] md:tracking-[0.3em] text-on-surface hover:bg-primary hover:text-white hover:border-primary transition-all duration-500 font-bold shadow-sm hover:shadow-luxury group"
          >
            Explore Full Portfolio
            <span className="material-symbols-outlined text-[16px] md:text-[18px] group-hover:translate-x-1 transition-transform">
              east
            </span>
          </Link>
        </div>
      </section>
      </StackedSectionWrapper>
      )}
    </div>
  );
}
