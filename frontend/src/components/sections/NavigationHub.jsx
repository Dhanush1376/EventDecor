import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { MandalaElement } from "../ui/MandalaElement";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";
import { CloudinaryImage } from "../ui/CloudinaryImage";

export function NavigationHub() {
  const containerRef = useRef(null);
  const { featuredCollections } = useWebsiteContent();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const headerY = useTransform(scrollYProgress, [0, 0.5], [90, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  if (!featuredCollections?.isVisible) return null;

  const items = featuredCollections.items.filter((i) => i.isVisible);

  return (
    <section
      ref={containerRef}
      className="py-16 md:py-29 bg-surface relative overflow-hidden"
    >
      {/* Background Cinematic Lighting */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-primary-container/20 rounded-full blur-[150px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[900px] h-[900px] bg-primary-container/15 rounded-full blur-[150px] -ml-64 -mb-64 pointer-events-none" />

      <MandalaElement
        className="absolute -bottom-20 -left-20 opacity-[0.03]"
        size={600}
        duration={200}
        skipFade={true}
      />

      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop">
        <motion.div
          style={{ y: headerY, opacity }}
          className="text-center max-w-4xl mx-auto mb-12 md:mb-16 relative z-10"
        >
          <span className="inline-flex items-center gap-3 px-4.5 py-1.5 rounded-full border border-primary/10 bg-primary/5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.4em] font-bold">
              Curated for you
            </span>
          </span>
          <h2 className="font-headline text-[32px] sm:text-[42px] md:text-[56px] text-on-surface leading-[1.15] md:leading-[1.1] tracking-tight mb-6">
            {featuredCollections.sectionTitle}
          </h2>
          <p className="font-body text-on-surface-variant/70 text-base md:text-lg font-light leading-relaxed max-w-2xl mx-auto">
            {featuredCollections.sectionSubtitle}
          </p>
        </motion.div>

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 relative z-20">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 36 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                delay: idx * 0.1,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group cursor-pointer"
            >
              <Link to={item.link} className="block w-full">
                <div className="relative aspect-[4/5] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-luxury/10 mb-4 bg-surface-container-low">
                  <CloudinaryImage
                    src={item.image}
                    alt={item.name}
                    className="transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                    containerClassName="w-full h-full"
                    loading="lazy"
                    width={400}
                    height={500}
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <div className="text-center">
                  <h3 className="font-display text-[16px] md:text-[20px] text-on-surface group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <div className="mt-2 w-8 h-px bg-primary/30 mx-auto group-hover:w-16 transition-all duration-500" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
