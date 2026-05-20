import React from "react";
import { motion } from "framer-motion";
import { SectionWrapper } from "../layout";
import { fadeUp, staggerContainer } from "../../animations/variants";
import { MandalaElement } from "../ui/MandalaElement";

export function BrandStory({ handleImageError }) {
  return (
    <SectionWrapper variant="bright" className="!py-24 md:!py-32">
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-24 items-center">
        <motion.div
          variants={fadeUp}
          className="col-span-1 md:col-span-6 lg:col-span-6 relative"
        >
          <div className="relative z-10 aspect-[4/5] rounded-[64px] overflow-hidden shadow-luxury-lg">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuArmLX9xra0m1GxmrjS8xH0pXUpTrKa18fhO9gW8NY160WAZ5MfXc157OoFlIivj6H_WT6aMZVWNjLvqixrhrBG2ryiAU15p_ZC42em1Dzj1w8ukwUFzndsHouARkcvS5wRRDyDVaOaIHwbiV5vUgkbNfc6zFl8XAYOQBERj5JYLZZOPpjaoiUd4B_6zT7iQQYhbyHU5Q5geiCAvvn2hga0_UsahQbwxSy3eLhHFEKPHc897yWc_fLyCPjkZ0wcfIcXDcMrPumI35w"
              alt="The Artisan at Work"
              onError={handleImageError}
              className="w-full h-full object-cover rounded-[inherit]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent rounded-[inherit]" />
          </div>

          <motion.div
            initial={{ x: 50, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -bottom-10 right-0 md:-right-12 z-20 bg-white/80 backdrop-blur-xl p-6 md:p-12 rounded-[32px] md:rounded-[40px] border border-outline-variant/10 shadow-luxury w-[90%] md:max-w-[320px] min-w-0"
          >
            <span className="font-display text-[64px] text-primary/10 absolute top-4 left-6 italic font-bold">
              "
            </span>
            <p className="font-display text-[20px] md:text-[24px] mb-6 italic leading-snug relative z-10">
              It started with a single needle and a mother's vision to honor our
              roots.
            </p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-[1px] bg-primary/40" />
              <span className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">
                Siri, Founder
              </span>
            </div>
          </motion.div>

          <div className="absolute -top-10 -left-10 w-full h-full border-2 border-primary/5 rounded-[64px] -z-10" />
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="col-span-1 md:col-span-6 lg:col-span-6 space-y-12"
        >
          <div className="space-y-6">
            <motion.span
              variants={fadeUp}
              className="font-label text-[11px] text-primary uppercase tracking-[0.5em] font-bold block"
            >
              Heritage & Heart
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="font-display text-[42px] md:text-[64px] leading-[1.1] tracking-tight"
            >
              Handcrafted by a Family, <br />
              <span className="text-primary/60 italic font-light">
                Loved by a Nation.
              </span>
            </motion.h2>
            <div className="w-20 h-[2px] bg-primary/20" />
          </div>

          <motion.div
            variants={fadeUp}
            className="space-y-8 font-body text-[17px] md:text-[19px] text-secondary/80 leading-relaxed font-light"
          >
            <p>
              Siri Arts & Crafts was born in the quiet sanctuary of Siri’s
              workshop, a space where the intricate beauty of traditional Telugu
              crafts was given a new life.
            </p>
            <p>
              What began as a personal quest to create meaningful decor for her
              family ceremonies soon evolved into an artisanal collective.
              Today, we are proud to be a mother-led family business where every
              piece is still touched by the same philosophy:{" "}
              <strong className="text-on-surface font-medium">
                Art should feel like a blessing.
              </strong>
            </p>

            <div className="grid grid-cols-2 gap-8 pt-6">
              <div className="space-y-2">
                <span className="font-display text-[32px] text-primary">
                  30+
                </span>
                <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Years of Legacy
                </p>
              </div>
              <div className="space-y-2">
                <span className="font-display text-[32px] text-primary">
                  15k+
                </span>
                <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold">
                  Events Celebrated
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <MandalaElement
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]"
        size={900}
        rotate={false}
      />
    </SectionWrapper>
  );
}
