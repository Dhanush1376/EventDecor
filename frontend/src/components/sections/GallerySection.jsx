import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { SectionWrapper } from "../layout/SectionWrapper";
import { MandalaElement } from "../ui/MandalaElement";
import { MandalaArtDecor } from "../ui/MandalaArtDecor";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";
import { galleryService } from "../../services/domainServices";
import { CloudinaryImage } from "../ui/CloudinaryImage";
import { GallerySkeleton } from "../ui/Skeleton";

import logger from '../../utils/logger';
export function GallerySection() {
  const containerRef = useRef(null);
  const { galleryPreview, loading: cmsLoading } = useWebsiteContent();

  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      if (!galleryPreview?.galleryIds || galleryPreview.galleryIds.length === 0) {
        // Fallback or empty state
        setLoading(false);
        return;
      }

      try {
        // Fetch all gallery items by their IDs
        // For simplicity, we can fetch all and filter, or add an API to fetch multiple by IDs
        const res = await galleryService.getAll({ limit: 12 });
        if (res.success) {
          // If galleryPreview has specific IDs, filter them. If not, just show recent.
          if (galleryPreview.galleryIds && galleryPreview.galleryIds.length > 0) {
             const filtered = res.data.data.filter(item => galleryPreview.galleryIds.includes(item._id));
             setGalleryItems(filtered.length > 0 ? filtered : res.data.data.slice(0, galleryPreview.maxDisplay || 6));
          } else {
             setGalleryItems(res.data.data.slice(0, galleryPreview.maxDisplay || 6));
          }
        }
      } catch (err) {
        logger.error("Failed to fetch gallery preview", err);
      } finally {
        setLoading(false);
      }
    };

    if (galleryPreview?.isVisible) {
      fetchGallery();
    }
  }, [galleryPreview]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const headerY = useTransform(scrollYProgress, [0, 0.5], [50, 0]);

  if (!galleryPreview?.isVisible) return null;
  if (cmsLoading || loading) return <GallerySkeleton />;

  return (
    <SectionWrapper
      ref={containerRef}
      id="gallery"
      variant="default"
      className="!py-16 md:!py-29 relative overflow-hidden bg-surface"
    >
      <div className="absolute -top-9 -left-9 opacity-[0.03] scale-[0.6] md:scale-100 pointer-events-none">
        <MandalaElement size={450} duration={180} skipFade={true} />
      </div>
      <div className="absolute top-1/2 -right-29 opacity-[0.02] scale-[0.6] md:scale-100 pointer-events-none">
        <MandalaElement size={720} duration={240} variant={2} skipFade={true} />
      </div>

      {/* Detailed mandala art accents */}
      <MandalaArtDecor
        variant={4}
        size={300}
        className="-bottom-16 -left-16 md:hidden"
        opacity={0.16}
        blendMode="darken"
        spinDuration={190}
      />
      <MandalaArtDecor
        variant={4}
        size={600}
        className="-bottom-40 -left-40 hidden md:block"
        opacity={0.12}
        blendMode="darken"
        spinDuration={190}
      />

      <motion.div
        style={{ y: headerY }}
        className="text-center mb-14 md:mb-22 relative z-10"
      >
        <span className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-5.5">
          <span className="font-label-sm text-[9px] text-primary uppercase tracking-[0.4em] font-bold">
            {galleryPreview.sectionSubtitle}
          </span>
        </span>
        <h2 className="font-headline text-[32px] sm:text-[42px] md:text-[58px] text-on-surface mb-5.5 tracking-tight">
          {galleryPreview.sectionTitle}
        </h2>
      </motion.div>

      {/* Cinematic Pinterest-style Layout */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-5.5 space-y-3 md:space-y-5.5 relative z-10 px-0 md:px-4">
        {galleryItems.map((item, idx) => (
            <motion.div
              key={item._id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                type: "spring",
                stiffness: 75,
                damping: 16,
                delay: idx * 0.08,
              }}
              className={`break-inside-avoid relative rounded-[22px] md:rounded-[28px] overflow-hidden shadow-ambient border border-black/5 group cursor-pointer hover-lift-glow ${
                (!item.height || item.height === "aspect-square")
                  ? (idx % 4 === 0
                    ? "aspect-[2/3]"
                    : idx % 4 === 1
                      ? "aspect-square"
                      : idx % 4 === 2
                        ? "aspect-[4/5]"
                        : "aspect-[3/4]")
                  : item.height
              }`}
            >
              <Link to={`/gallery/${item._id}`}>
                <CloudinaryImage
                  src={item.image}
                  alt={item.title}
                  className="transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.1]"
                  containerClassName="w-full h-full"
                  loading="lazy"
                  width={400}
                  height={600}
                />

                {/* Elegant Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-700 ease-out" />

                <div className="absolute inset-0 p-3 md:p-5.5 flex flex-col justify-end items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-700 delay-100 text-center">
                  <span className="font-display text-white text-[15px] md:text-xl transform translate-y-0 md:translate-y-3.5 md:group-hover:translate-y-0 transition-transform duration-700">
                    {item.title}
                  </span>
                  <span className="font-label-sm text-white/90 md:text-white/70 text-[7px] md:text-[8px] uppercase tracking-widest mt-1.5 md:mt-2 transform translate-y-0 md:translate-y-3.5 md:group-hover:translate-y-0 transition-transform duration-700 delay-75 flex items-center gap-1 md:gap-2">
                    View Details{" "}
                    <span className="material-symbols-outlined text-[13px]">
                      open_in_new
                    </span>
                  </span>
                </div>
              </Link>
            </motion.div>
          ))
        }

        {/* Cinematic View All CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{
            type: "spring",
            stiffness: 75,
            damping: 16,
            delay: galleryItems.length * 0.08,
          }}
          className="break-inside-avoid rounded-[22px] md:rounded-[28px] overflow-hidden shadow-ambient border border-primary/20 bg-primary/5 flex flex-col items-center justify-center p-7 aspect-[4/5] w-full group cursor-pointer hover-lift-glow hover:bg-primary hover:border-primary transition-all duration-700"
        >
          <Link
            className="flex flex-col items-center w-full h-full justify-center text-primary group-hover:text-white transition-colors duration-700"
            to="/gallery"
          >
            <div className="w-14 h-14 rounded-full border border-primary/30 group-hover:border-white/30 flex items-center justify-center mb-5.5 transition-colors duration-700">
              <span
                className="material-symbols-outlined text-[25px]"
                style={{ fontVariationSettings: "'wght' 200" }}
              >
                grid_view
              </span>
            </div>
            <h3 className="font-display text-[22px] mb-2">Explore Gallery</h3>
            <span className="font-label-sm text-[9px] uppercase tracking-[0.3em] font-bold flex items-center gap-2">
              View All{" "}
              <span className="material-symbols-outlined text-[13px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </span>
          </Link>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
