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
}) {
  const bgClasses = {
    default: "bg-surface",
    bright: "bg-surface-bright",
    surface: "bg-surface-container-lowest",
  };

  return (
    <section
      id={id}
      className={`relative w-full py-8 md:py-16 lg:py-20 overflow-hidden ${bgClasses[variant]} ${className}`}
    >
      <motion.div
        variants={noAnimation ? {} : fadeUp}
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true, margin: "-100px" }}
        className={`relative z-10 mx-auto ${
          container
            ? "px-container-margin-mobile md:px-container-margin-desktop max-w-[1440px]"
            : ""
        } ${narrow ? "max-w-4xl" : ""}`}
      >
        {children}
      </motion.div>
    </section>
  );
}
