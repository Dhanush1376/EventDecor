import React from "react";
import { motion } from "framer-motion";
import { SectionWrapper } from "../layout";
import { fadeUp, staggerContainer } from "../../animations/variants";
import { MandalaElement } from "../ui/MandalaElement";

const specializations = [
  {
    id: 1,
    title: "Coconut Decorations",
    telugu: "కొబ్బరి అలంకరణలు",
    icon: "yard",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBZBEDcwKob0pNIA9hznZFXRijWsUylcaexjcyYHU3uJ0G6FJsCl8PUmwvoqng7V7FcYfXHAKVXvTQslP1jvT8zs20B1g3wPof07Mlyd2AZv8gm6wtooHrXzTBK4pnESxISwoLM3prUNpSp-k9uBH3KyBN8T5jcQ_x_nUeGAbF77roym8CBSDLlg4Td3OzkkXbuG66SpvhETJaOKYjPxDbhxtuOK3v2b85m87Yzsbz3ik2leo2G609lS8sokN-GIlYkesf59GTAGsk",
  },
  {
    id: 2,
    title: "Bangle Trays",
    telugu: "గాజుల ట్రేలు",
    icon: "dry_cleaning",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA7F3ck_1VBGtclja4rFpblASLZWmGyrrSeXc-D7PYlO1RJFSwwrZdHFE80h72hY1_kcwRRwjHuqfhG4Zlouur0m6jrXSLrhifw9vDKzna2lQ-ju5fdSEXiP7YRFTwnqlKsqohXveyKFObF5Wlx3w4eHE_H8k0Y1_l5DTr3WtpRbeEK40rGPLPe9CzEazxPBk_dKXe0G4hYrk0NZhhWEsdpFvGFb0pGyqjB5La45C5zfJ87FPCec_D1_Au1Z-IJca6gythEhj_rF4g",
  },
  {
    id: 3,
    title: "Harathi Plates",
    telugu: "హారతి పళ్ళెము",
    icon: "brightness_7",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDe83Lsd47lZqynVJ0kMtX8bQXTRecbu7H0C1BlkLxOasxemcqQEuKnNyGxKot0fwPK8XK3B7KlKM6L4TPRVgoVdJqq9XbM6x-UQ1iVr-aTMjYA2PVJ-t5AklU0knTE2gCEJQlcCrgbfKRxQQCm0QcC2jFkShh9Zl7gMAmORpzgwWgZwoyWnB5OVEcj4hALz_cOJBfuUW6PkCCrjivtHrJZ46oFXRq2xHqpkcUUppREtOkav1hREotXGozlrWwmRfDfzcmP54tYsm8",
  },
  {
    id: 4,
    title: "Wedding Baskets",
    telugu: "పెళ్లి గంపలు",
    icon: "shopping_basket",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBIpNH8br15Ge3ShywA13R5RATlBWLY6FATegrXBoB6N_W8bLSs7SDxfez5uU4I5GDIqC_9musVh61_WQuU9ykCwxmz6Uu1Ql1HBc82UGgwrfrhSv6WBikwpnx9oCtW1aJKo9nmboD4qT2Ddd_Q5jL4gsy49L_UHCNRJ2ABrBTZe-rJj-RjlnlRx-wNse0EzMDN2y4dPR1M1ZjsGS4v7Vz6p1yLbI_z1Soss4kd8In6LUqvCKavjYPNlQrbAa-tKQ1WJs7ukRUsuPA",
  },
  {
    id: 5,
    title: "Custom Gift Hampers",
    telugu: "బహుమతి హ్యాంపర్లు",
    icon: "featured_seasonal_and_gifts",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBsQCa-kmW4cetaI5gJVRriIZNGZYHmU8E8am3cFeZUDKCilYWXQlzjOUcNC-7Y4X0QJ2pMwgKSpIYdQFq2_Ay_f7SiqSInMa0U5TCRu-S9oj-mVqYRw6hgjkSbDXB7oCY4ohJnWlNM9fs3HETumRdaSq9tc2uoOw5j3yAtroOIPxRui4ppd0CZwJFbmZQbtiTuQxdBtPqh581LUvCxkr2wfFHHmDS6rvY21b8hNpq25j6h71ID7Xq7g1y1_z9GbgcjSzZHaGgl54M",
  },
  {
    id: 6,
    title: "Tambulam Sets",
    telugu: "తాంబూలం సెట్లు",
    icon: "spa",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuArmLX9xra0m1GxmrjS8xH0pXUpTrKa18fhO9gW8NY160WAZ5MfXc157OoFlIivj6H_WT6aMZVWNjLvqixrhrBG2ryiAU15p_ZC42em1Dzj1w8ukwUFzndsHouARkcvS5wRRDyDVaOaIHwbiV5vUgkbNfc6zFl8XAYOQBERj5JYLZZOPpjaoiUd4B_6zT7iQQYhbyHU5Q5geiCAvvn2hga0_UsahQbwxSy3eLhHFEKPHc897yWc_fLyCPjkZ0wcfIcXDcMrPumI35w",
  },
];

export function Specializations({ handleImageError }) {
  return (
    <SectionWrapper className="!py-24 relative overflow-hidden">
      <MandalaElement
        className="absolute -top-20 -right-20 opacity-[0.04]"
        size={500}
        duration={120}
      />
      <MandalaElement
        className="absolute -bottom-20 -left-20 opacity-[0.03]"
        size={400}
        duration={90}
        variant={2}
      />
      <div className="text-center mb-20 max-w-3xl mx-auto space-y-6">
        <motion.span
          variants={fadeUp}
          className="font-label text-[11px] text-primary uppercase tracking-[0.5em] font-bold"
        >
          మా ప్రత్యేకతలు (Maa Pratyekatalu)
        </motion.span>
        <motion.h2
          variants={fadeUp}
          className="font-display text-[42px] md:text-[56px] tracking-tight"
        >
          Our Artisanal Specializations
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="font-body text-[16px] text-secondary/60 max-w-xl mx-auto font-light"
        >
          Each category is a testament to our commitment to traditional
          craftsmanship and luxury aesthetics.
        </motion.p>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {specializations.map((spec) => (
          <motion.div
            key={spec.id}
            variants={fadeUp}
            whileHover={{ y: -10 }}
            className="group relative h-[450px] rounded-[48px] overflow-hidden cursor-pointer"
          >
            <img
              src={spec.image}
              onError={handleImageError}
              className="absolute inset-0 w-full h-full object-cover rounded-[inherit] transition-transform duration-1000 group-hover:scale-110"
              alt={spec.title}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500 rounded-[inherit]" />

            <div className="absolute inset-0 p-10 flex flex-col justify-end text-white">
              <span className="material-symbols-outlined text-[32px] mb-4 text-primary opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
                {spec.icon}
              </span>
              <span className="font-label text-[10px] uppercase tracking-[0.3em] text-white/90 font-bold mb-2 block">
                {spec.telugu}
              </span>
              <h3 className="font-display text-[28px] mb-2">{spec.title}</h3>
              <div className="w-0 group-hover:w-full h-[1px] bg-white/30 transition-all duration-700 mb-4" />
              <button className="flex items-center gap-2 font-label text-[10px] uppercase tracking-widest opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100">
                Discover Details{" "}
                <span className="material-symbols-outlined text-[16px]">
                  arrow_outward
                </span>
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </SectionWrapper>
  );
}
