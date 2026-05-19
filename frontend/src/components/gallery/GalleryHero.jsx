import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { handleImageError } from "../../utils/imageUtils";

const PARTICLES_DATA = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  initialX: ((i * 7) % 100) + "%",
  initialY: ((i * 13) % 100) + "%",
  initialOpacity: 0.2 + ((i * 3) % 5) * 0.1,
  animateY: -50 - ((i * 17) % 100) + "%",
  duration: 10 + ((i * 11) % 10),
}));

export function GalleryHero() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const particles = PARTICLES_DATA;

  return (
    <section className="relative h-[80vh] md:h-[95vh] flex items-center overflow-hidden bg-[#1a1817]">
      {/* Background Parallax Images */}
      <motion.div style={{ y: y1, opacity }} className="absolute inset-0 z-0">
        <img
          onError={handleImageError}
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZBEDcwKob0pNIA9hznZFXRijWsUylcaexjcyYHU3uJ0G6FJsCl8PUmwvoqng7V7FcYfXHAKVXvTQslP1jvT8zs20B1g3wPof07Mlyd2AZv8gm6wtooHrXzTBK4pnESxISwoLM3prUNpSp-k9uBH3KyBN8T5jcQ_x_nUeGAbF77roym8CBSDLlg4Td3OzkkXbuG66SpvhETJaOKYjPxDbhxtuOK3v2b85m87Yzsbz3ik2leo2G609lS8sokN-GIlYkesf59GTAGsk"
          className="w-full h-full object-cover opacity-40 scale-110"
          alt="Luxury Background"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
      </motion.div>

      {/* Floating Gold Particles Effect */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: p.initialX,
              y: p.initialY,
              opacity: p.initialOpacity,
            }}
            animate={{
              y: [null, p.animateY],
              opacity: [null, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute w-1 h-1 bg-gold rounded-full blur-[1px]"
          />
        ))}
      </div>

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop w-full relative z-20">
        <div className="max-w-4xl">
          <motion.span
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.5em" }}
            transition={{ duration: 1 }}
            className="font-label text-primary uppercase mb-6 block font-bold text-xs md:text-sm"
          >
            Inspiration Sanctuary
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="font-display text-[42px] md:text-[86px] text-white leading-[1.1] mb-8 italic"
          >
            Explore Timeless <br />
            <span className="text-gold font-normal not-italic">
              Handcrafted Inspirations.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="font-body text-white/70 text-lg md:text-xl max-w-2xl mb-12 font-light leading-relaxed"
          >
            A cinematic ecosystem designed to transform your milestones into
            visual masterpieces. Discover the harmony of heritage art and
            contemporary luxury.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex flex-wrap gap-6"
          >
            <button className="bg-primary text-white px-8 md:px-10 py-4 rounded-full font-label text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white hover:text-primary transition-all shadow-luxury">
              Explore Collections
            </button>
            <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 md:px-10 py-4 rounded-full font-label text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-white/20 transition-all">
              Trending Designs
            </button>
          </motion.div>
        </div>
      </div>

      {/* Parallax Floating Shapes */}
      <motion.div
        style={{ y: y2 }}
        className="absolute right-[-5%] top-[20%] w-[30%] aspect-square rounded-full border border-gold/10 hidden lg:block"
      />
      <motion.div
        style={{ y: y1 }}
        className="absolute left-[-10%] bottom-[10%] w-[40%] aspect-square rounded-full border border-primary/5 hidden lg:block"
      />
    </section>
  );
}
