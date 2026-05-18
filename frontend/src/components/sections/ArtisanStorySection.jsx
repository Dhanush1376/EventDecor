import React from "react";
import { motion } from "framer-motion";
import { handleImageError } from "../../utils/imageUtils";

export const ArtisanStorySection = () => {
  return (
    <section className="relative py-16 md:py-32 overflow-hidden bg-on-surface-variant text-surface">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-marble" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40" />

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
          {/* Visual Showcase - First on mobile/tablet */}
          <div className="relative lg:order-1">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative h-[300px] md:h-[400px] lg:h-auto lg:aspect-[4/5] rounded-3xl md:rounded-[48px] overflow-hidden shadow-2xl"
            >
              <img
                onError={handleImageError}
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsQCa-kmW4cetaI5gJVRriIZNGZYHmU8E8am3cFeZUDKCilYWXQlzjOUcNC-7Y4X0QJ2pMwgKSpIYdQFq2_Ay_f7SiqSInMa0U5TCRu-S9oj-mVqYRw6hgjkSbDXB7oCY4ohJnWlNM9fs3HETumRdaSq9tc2uoOw5j3yAtroOIPxRui4ppd0CZwJFbmZQbtiTuQxdBtPqh581LUvCxkr2wfFHHmDS6rvY21b8hNpq25j6h71ID7Xq7g1y1_z9GbgcjSzZHaGgl54M"
                alt="Artisan at work"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10">
                <p className="font-label text-[8px] sm:text-[10px] uppercase tracking-widest text-surface/80 font-bold">
                  Workshop: Rajasthan, India
                </p>
              </div>
            </motion.div>

            {/* Floating Detail Card */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="absolute bottom-3 left-3 right-3 sm:right-auto md:-bottom-8 md:-left-12 lg:-left-20 bg-surface/95 backdrop-blur-2xl p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-[32px] border border-white/20 shadow-2xl max-w-xs z-20"
            >
              <span className="material-symbols-outlined text-primary text-[24px] sm:text-[32px] mb-2 sm:mb-4">
                draw
              </span>
              <p className="font-body text-on-surface-variant font-light italic leading-relaxed text-[11px] sm:text-[13px]">
                "Our goal is to breathe life into materials, turning static
                decor into emotional memories."
              </p>
              <p className="mt-2 sm:mt-4 font-label text-[8px] sm:text-[10px] uppercase tracking-widest text-primary font-bold">
                — Master Artisan Omkar
              </p>
            </motion.div>
          </div>

          {/* Text Content - Second on mobile/tablet, right on desktop */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="lg:order-2"
          >
            <span className="font-label text-primary tracking-[0.4em] uppercase mb-4 md:mb-8 block text-[10px]">
              The Craftsmanship
            </span>
            <h2 className="font-headline-sm md:font-headline-lg mb-6 md:mb-10 text-gold">
              Masterfully Hand-Carved <br /> Heritage Details
            </h2>
            <div className="space-y-4 md:space-y-6 font-body text-surface/70 font-light leading-relaxed text-[15px] md:text-[17px]">
              <p>
                Every piece in our collection begins its journey in the hands of
                a master artisan. Using centuries-old techniques passed down
                through generations, each curve and detail is meticulously
                shaped to perfection.
              </p>
              <p>
                We source only the finest raw materials—from sustainable teak
                wood to premium heritage brass—ensuring that your decor isn't
                just a temporary setup, but a lasting legacy of your
                celebration.
              </p>
            </div>

            <div className="mt-10 md:mt-16 grid grid-cols-2 gap-6 md:gap-12">
              <div>
                <h4 className="font-display text-[20px] sm:text-[24px] text-gold mb-1 md:mb-2 font-bold">
                  40+ Hours
                </h4>
                <p className="font-label text-[8px] sm:text-[10px] uppercase tracking-widest text-surface/40 font-bold">
                  Hand-carving per unit
                </p>
              </div>
              <div>
                <h4 className="font-display text-[20px] sm:text-[24px] text-gold mb-1 md:mb-2 font-bold">
                  Artisan Grade
                </h4>
                <p className="font-label text-[8px] sm:text-[10px] uppercase tracking-widest text-surface/40 font-bold">
                  Certified Heritage Craft
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
