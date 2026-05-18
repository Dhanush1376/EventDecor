import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MandalaElement } from "../ui/MandalaElement";
import { cinematicHero } from "../../animations/variants";

export function AboutHero({ heroY, heroOpacity, handleImageError }) {
  return (
    <header className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <motion.div
        style={{ y: heroY, opacity: heroOpacity }}
        className="absolute inset-0 z-0"
      >
        <motion.img
          variants={cinematicHero}
          initial="initial"
          animate="animate"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD89_M3Lnd4v78oVoztX6gpOeKhPXsMbIUza4LaL2BO2u-RYUy4150fNUYMAdaH8M3By_o5Gf1kvNKPibBZPkWzdO7oO7O5KsR15wET-JWvbpEYl2iC5-kkeXBjLtN5Q7WACU-nvuvLpf3ECM32o_k-SnsMVYOk0GTOjNkQAmTc_EL3RUogX7Xy35QQ5z4dljZmVUuJq0RXtHv0LTGm27dppyYL-E93wFN5xkXxkAOHzxsiH39emAsN9jyz96cjhEL46A8"
          alt="Artisan Craftsmanship Background"
          onError={handleImageError}
          className="w-full h-full object-cover grayscale-[30%] opacity-40 scale-105"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-surface" />
      </motion.div>

      {/* Ambient Decorative Elements */}
      <MandalaElement
        className="absolute top-[15%] right-[10%] opacity-20"
        size={300}
        duration={80}
        variant={2}
      />
      <MandalaElement
        className="absolute -top-20 -left-20 opacity-10"
        size={500}
        duration={100}
      />
      <MandalaElement
        className="absolute -bottom-40 -right-20 opacity-[0.08]"
        size={700}
        duration={150}
        variant={2}
      />

      <div className="relative z-10 text-center max-w-5xl px-6">
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-3 font-label text-[11px] uppercase tracking-[0.4em] mb-12 text-primary/60 font-bold"
        >
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span className="w-1 h-1 rounded-full bg-primary/30" />
          <span className="text-on-surface">Artisanal Heritage</span>
        </motion.nav>

        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-label text-[12px] md:text-[14px] text-white/70 uppercase tracking-[0.6em] mb-8 block font-bold"
        >
          Est. in 2003
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-[48px] md:text-[96px] leading-[0.95] mb-10 tracking-tight"
        >
          Crafting Traditions <br />
          <span className="italic font-light text-primary/80">
            with Elegance.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="font-body text-[16px] md:text-[20px] text-secondary/70 font-light italic leading-relaxed max-w-2xl mx-auto mb-12"
        >
          "Where ancient Telugu artistry meets contemporary luxury, creating
          memories that last for generations."
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <button className="btn-primary !px-10 !py-4 rounded-full group overflow-hidden relative">
            <span className="relative z-10">Explore Our Story</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </button>
          <Link
            to="/collections"
            className="font-label text-[11px] uppercase tracking-[0.4em] text-on-surface hover:text-primary transition-all font-bold flex items-center gap-3"
          >
            View Masterpieces
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </Link>
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30"
      >
        <span className="font-label text-[9px] uppercase tracking-[0.3em] font-bold">
          Scroll to Discover
        </span>
        <div className="w-[1px] h-12 bg-on-surface/50" />
      </motion.div>
    </header>
  );
}
