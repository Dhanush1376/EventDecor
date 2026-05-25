import React from "react";
import { motion } from "framer-motion";
import { fadeUp } from "../../animations/variants";

export function SectionWrapper({
  children,
  className = "",
  id = "",
  variant = "default", // 'default', 'bright', 'surface'
  container = true,
  narrow = false,
  noAnimation = false,
  ref,
}) {
  const bgClasses = {
    default: "bg-surface",
    bright: "bg-surface-bright",
    surface: "bg-surface-container-lowest",
  };

  return (
    <section
      ref={ref}
      id={id}
      className={`relative w-full py-12 md:py-20 lg:py-24 overflow-hidden ${bgClasses[variant]} ${className}`}
    >
      <motion.div
        variants={noAnimation ? {} : fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className={`relative z-10 mx-auto ${
          container
            ? "px-margin-mobile md:px-margin-desktop max-w-[1440px]"
            : ""
        } ${narrow ? "max-w-4xl" : ""}`}
      >
        {children}
      </motion.div>
    </section>
  );
}
