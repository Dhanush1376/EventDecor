import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SectionWrapper } from "../layout";
import { fadeUp } from "../../animations/variants";
import { handleImageError } from "../../utils/imageUtils";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";

const categories = [
  { title: "Traditional Wedding Decor", image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=2074&auto=format&fit=crop" },
  { title: "Festival Decorations", image: "https://images.unsplash.com/photo-1561571994-3c61c554181a?q=80&w=1974&auto=format&fit=crop" },
  { title: "Engagement Ring Trays", image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop" },
  { title: "Pooja Decoration Sets", image: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=1974&auto=format&fit=crop" },
];

export function FeaturedCategories() {
  const { featuredCollections } = useWebsiteContent();

  const activeItems = featuredCollections?.items?.filter(item => item.isVisible) || [];
  
  const displayCategories = activeItems.length > 0
    ? activeItems.map(item => ({
        title: item.name,
        image: item.image,
        link: item.link
      }))
    : [
        { title: categories[0].title, image: categories[0].image, link: "/collections?category=Traditional+Wedding+Decor" },
        { title: categories[1].title, image: categories[1].image, link: "/collections?category=Festival+Decorations" },
        { title: categories[2].title, image: categories[2].image, link: "/collections?category=Engagement+Ring+Trays" },
        { title: categories[3].title, image: categories[3].image, link: "/collections?category=Pooja+Decoration+Sets" },
      ];

  if (featuredCollections && !featuredCollections.isVisible) return null;

  const sectionTitle = featuredCollections?.sectionTitle || "Signature Collections";
  const sectionSubtitle = featuredCollections?.sectionSubtitle || "Curated Selections";

  return (
    <section className="py-24 bg-surface relative overflow-hidden">
      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-label-sm text-label-sm text-primary uppercase tracking-[0.4em] mb-4 block"
            >
              {sectionSubtitle}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="font-headline-lg text-headline-lg text-on-surface"
            >
              {sectionTitle}
            </motion.h2>
          </div>
          <Link
            to="/collections"
            className="hidden md:block font-label-md text-label-md text-primary hover:text-primary-container transition-colors pb-1 border-b border-primary uppercase tracking-widest"
          >
            View All Collections
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-gutter min-h-[600px]">
          {/* Large Feature - Wedding */}
          {displayCategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="col-span-1 md:col-span-7 lg:col-span-8 relative rounded-2xl overflow-hidden group shadow-lg h-[260px] md:h-auto"
            >
              <Link
                to={displayCategories[0].link}
                className="absolute inset-0 z-10"
              />
              <img
                onError={handleImageError}
                src={displayCategories[0].image}
                alt={displayCategories[0].title}
                className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110"
                loading="lazy"
                width={800}
                height={600}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 flex flex-col items-start z-20 pointer-events-none">
                <span className="bg-surface/90 backdrop-blur-md px-3 py-1 md:px-4 md:py-1.5 rounded text-primary font-label-sm text-label-sm uppercase tracking-wider mb-3 md:mb-4 border border-white/20">
                  Premium Collection
                </span>
                <h3 className="font-headline-md text-headline-md text-white mb-2">
                  {displayCategories[0].title}
                </h3>
                <p className="font-body-md text-white/70 max-w-sm font-light hidden sm:block">
                  Exquisite bridal essentials crafted for timeless memories.
                </p>
              </div>
            </motion.div>
          )}

          {/* Side Stack - Now including all remaining categories */}
          <div className="col-span-1 md:col-span-5 lg:col-span-4 flex flex-col gap-gutter">
            {displayCategories.slice(1).map((cat, idx) => (
              <motion.div
                key={cat.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 * (idx + 1) }}
                className="flex-1 relative rounded-2xl overflow-hidden group shadow-lg min-h-[160px]"
              >
                <Link
                  to={cat.link}
                  className="absolute inset-0 z-10"
                />
                <img
                  onError={handleImageError}
                  src={cat.image}
                  alt={cat.title}
                  className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110"
                  loading="lazy"
                  width={400}
                  height={300}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 md:bottom-6 md:left-4 z-20 pointer-events-none">
                  <h3 className="font-headline-sm text-[clamp(1.1rem,3vw,1.5rem)] leading-tight text-white mb-1">
                    {cat.title}
                  </h3>
                  <div className="w-0 h-[1px] bg-primary group-hover:w-full transition-all duration-700"></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 flex justify-center md:hidden"
        >
          <Link to="/collections" className="btn-outline w-full text-center">
            View All Collections
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
