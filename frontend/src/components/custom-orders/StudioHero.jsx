import React from "react";
import { motion } from "framer-motion";
import { handleImageError } from "../../utils/imageUtils";

export function StudioHero() {
  return (
    <section className="relative h-[40vh] md:h-[70vh] flex items-center overflow-hidden bg-[#1a1817]">
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.65 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0"
      >
        <img
          onError={handleImageError}
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZBEDcwKob0pNIA9hznZFXRijWsUylcaexjcyYHU3uJ0G6FJsCl8PUmwvoqng7V7FcYfXHAKVXvTQslP1jvT8zs20B1g3wPof07Mlyd2AZv8gm6wtooHrXzTBK4pnESxISwoLM3prUNpSp-k9uBH3KyBN8T5jcQ_x_nUeGAbF77roym8CBSDLlg4Td3OzkkXbuG66SpvhETJaOKYjPxDbhxtuOK3v2b85m87Yzsbz3ik2leo2G609lS8sokN-GIlYkesf59GTAGsk"
          className="w-full h-full object-cover"
          alt="Artisanal Design Studio Background"
          loading="eager"
          fetchpriority="high"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-[#fcfbf9]" />

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop w-full relative z-10 text-center">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-label-sm text-surface tracking-[0.4em] uppercase mb-6 block font-bold"
        >
          Exclusive Design Studio
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-headline-xl text-surface mb-8 text-gold"
        >
          Custom Order Studio
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-body text-surface/80 max-w-2xl mx-auto font-light leading-relaxed block px-4 text-[12px] md:text-base"
        >
          "From structural mandapams to botanical ceiling matrices, we manifest
          your heritage vision with absolute precision."
        </motion.p>
      </div>
    </section>
  );
}
