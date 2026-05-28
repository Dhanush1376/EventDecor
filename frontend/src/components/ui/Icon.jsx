import React, { useState, useEffect } from "react";

/**
 * Reusable and production-grade Icon component for Siri Arts & Crafts.
 * Renders Google Material Symbols Outlined with automatic name sanitation,
 * hydration safety, accessibility support, and prevention of raw text leakages.
 */
export function Icon({ name, className = "", style = {}, ...props }) {
  // Check if fonts are loaded on mount (or if we're on the server)
  const [isLoaded, setIsLoaded] = useState(() => {
    if (typeof window === "undefined") return true;
    return !document.documentElement.classList.contains("fonts-loading");
  });

  useEffect(() => {
    if (isLoaded) return;
    
    // Fallback timer just in case MutationObserver misses it
    const timer = setTimeout(() => setIsLoaded(true), 4000);

    const observer = new MutationObserver(() => {
      if (!document.documentElement.classList.contains("fonts-loading")) {
        setIsLoaded(true);
        observer.disconnect();
        clearTimeout(timer);
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [isLoaded]);

  if (!name) return null;

  const sanitizedName = name
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();

  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={style}
      aria-hidden="true"
      {...props}
    >
      {isLoaded ? sanitizedName : ""}
    </span>
  );
}
