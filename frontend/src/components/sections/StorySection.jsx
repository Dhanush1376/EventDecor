import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { SectionWrapper } from "../layout/SectionWrapper";
import { fadeUp } from "../../animations/variants";
import { MandalaElement } from "../ui/MandalaElement";
import { MandalaArtDecor } from "../ui/MandalaArtDecor";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";
import { CloudinaryImage } from "../ui/CloudinaryImage";
import { StorySkeleton } from "../ui/Skeleton";

export function StorySection() {
  const containerRef = useRef(null);
  const { storyTeaser, loading } = useWebsiteContent();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Subtle parallax only on larger screens (width >= 1024px)
  const isLargeScreen = typeof window !== "undefined" && window.innerWidth >= 1024;
  const imageY = useTransform(scrollYProgress, [0, 1], isLargeScreen ? [-40, 40] : [0, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], isLargeScreen ? [40, -40] : [0, 0]);

  if (!storyTeaser?.isVisible) return null;
  if (loading) return <StorySkeleton />;

  return (
    <section
      ref={containerRef}
      className="relative pt-16 pb-28 lg:py-28 overflow-hidden bg-surface"
    >


      {/* Background Depth Glimmer */}
      <div className="absolute top-1/4 left-0 w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-primary-container/15 rounded-full blur-[100px] md:blur-[150px] -translate-x-1/2 pointer-events-none" />

      <div className="absolute -top-29 -right-29 opacity-[0.04] blur-[1px] scale-[0.6] md:scale-100 pointer-events-none">
        <MandalaElement size={720} duration={150} skipFade={true} />
      </div>
      <div className="absolute bottom-9 -left-36 opacity-[0.03] scale-[0.6] md:scale-100 pointer-events-none">
        <MandalaElement size={540} duration={180} variant={2} skipFade={true} />
      </div>

      {/* Detailed mandala art accents */}
      <MandalaArtDecor
        variant={2}
        size={320}
        className="-bottom-16 -right-16 md:hidden"
        opacity={0.18}
        blendMode="darken"
        spinDuration={160}
      />
      <MandalaArtDecor
        variant={2}
        size={650}
        className="-bottom-40 -right-40 hidden md:block"
        opacity={0.14}
        blendMode="darken"
        spinDuration={160}
      />

      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-22 items-center">
          {/* Cinematic Artisan Image Frame */}
          <div className="lg:col-span-5 relative h-full flex items-center px-4 lg:px-0">
            <motion.div
              style={{ y: imageY }}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full aspect-[4/5] rounded-[28px] md:rounded-[43px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.1)] border border-black/5"
            >
              <CloudinaryImage
                src={storyTeaser.image}
                alt="Master Artisan at work"
                className="w-full h-full object-cover scale-[1.05] transition-transform duration-[3s] hover:scale-110 ease-[cubic-bezier(0.16,1,0.3,1)]"
                containerClassName="relative z-10 w-full aspect-[4/5] rounded-[28px] md:rounded-[43px] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.1)] border border-black/5"
                loading="lazy"
                width={800}
                height={1000}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent mix-blend-overlay"></div>
            </motion.div>

            {/* Premium Heritage Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 60, damping: 12, delay: 0.6 }}
              className="absolute top-6 lg:top-auto lg:-bottom-11 right-1 lg:right-auto lg:-left-11 z-20 pointer-events-none"
            >
              <motion.div
                animate={{
                  y: [0, -6, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="bg-surface/90 backdrop-blur-md lg:bg-surface p-4 lg:p-9 rounded-[20px] lg:rounded-[36px] flex flex-col items-center min-w-[100px] lg:min-w-[162px] shadow-2xl border border-black/5"
              >
                <span className="font-label-sm text-[7px] lg:text-[9px] uppercase tracking-[0.3em] text-primary mb-1.5 lg:mb-2.5 font-bold">
                  {storyTeaser.badgeLabel || "Heritage"}
                </span>
                <span className="font-display text-on-surface text-[20px] lg:text-[36px] leading-none italic">
                  {storyTeaser.establishedYear}
                </span>
              </motion.div>
            </motion.div>
          </div>

          {/* Premium Story Content */}
          <div className="lg:col-span-7 relative z-20 -mt-16 lg:mt-0 px-1.5 sm:px-6 lg:px-0">
            <motion.div
              style={{ y: contentY }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl mx-auto lg:mx-0 bg-surface/95 backdrop-blur-2xl lg:bg-transparent px-4.5 py-8 pb-12 sm:px-8 lg:p-0 rounded-[28px] lg:rounded-none shadow-2xl lg:shadow-none border border-outline-variant/20 lg:border-none"
            >
              <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-7">
                <span className="w-8 md:w-11 h-[1px] bg-primary"></span>
                <span className="font-label-sm text-[9px] md:text-[10px] text-primary uppercase tracking-[0.4em] font-bold">
                  {storyTeaser.subtitle}
                </span>
              </div>

              <h2
                className="font-headline text-[26px] sm:text-[38px] md:text-[65px] text-on-surface mb-5 md:mb-7 leading-[1.1] md:leading-[1.05] tracking-tight"
                dangerouslySetInnerHTML={{
                  __html: storyTeaser.title.replace(/\n/g, "<br/>"),
                }}
              ></h2>

              <div className="space-y-6">
                {storyTeaser.description.split("\n\n").map((paragraph, idx) => (
                  <p
                    key={idx}
                    className={`font-body leading-relaxed font-light ${idx === 0 ? "text-on-surface-variant/80 text-[14px] sm:text-[16px] md:text-xl" : "text-on-surface-variant/60 text-[13px] sm:text-[14px] md:text-lg"}`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Luxury Stats Grid */}
              <div className="mt-10 md:mt-14 grid grid-cols-2 gap-6 md:gap-11 pt-8 md:pt-11 border-t border-outline-variant/10">
                {storyTeaser.stats?.map((stat) => (
                  <div key={stat.id} className="space-y-2 relative group cursor-default">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary group-hover:h-full transition-all duration-300"></div>
                    <span className="block font-headline text-on-surface text-[28px] md:text-[43px] leading-none transition-colors group-hover:text-primary">
                      {stat.value}
                    </span>
                    <span className="font-label-sm text-[9px] md:text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold block">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-14">
                <Link
                  to={storyTeaser.ctaLink}
                  className="inline-flex items-center gap-3.5 px-9 py-3.5 bg-transparent border border-black/20 text-on-surface rounded-full font-label-sm text-[10px] uppercase tracking-widest font-bold hover:border-primary hover:bg-primary/5 transition-all duration-300 group"
                >
                  {storyTeaser.ctaText}
                  <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                    trending_flat
                  </span>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
