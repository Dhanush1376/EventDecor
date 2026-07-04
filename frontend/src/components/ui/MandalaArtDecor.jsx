import { m as motion, useInView } from 'framer-motion';
import React from 'react';
import { MANDALA_VARIANT_URLS } from '../../constants/mandalaAssets';

/**
 * MandalaArtDecor — Renders a high-detail mandala art image as a decorative overlay.
 * Designed to be absolutely positioned inside a `relative overflow-hidden` container.
 *
 * Available variants:
 *   1 — Original lotus/paisley mandala  (mandala_hero_art.png)
 *   2 — Geometric star / rangoli        (mandala_art_2.png)
 *   3 — Mehndi / vine floral            (mandala_art_3.png)
 *   4 — Peacock / kalamkari sunburst    (mandala_art_4.png)
 */

const VARIANT_MAP = MANDALA_VARIANT_URLS;

export function MandalaArtDecor({
  variant = 1,
  size = 300,
  className = '',
  opacity = 0.2,
  spin = true,
  spinDuration = 150,
  blendMode = 'darken',
  blendModeDark = 'screen',
  dark = false,
  style = {},
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { amount: 0.1 });

  const src = VARIANT_MAP[variant] || VARIANT_MAP[1];
  const blend = dark ? blendModeDark : blendMode;

  // Enforce a minimum opacity to ensure the mandala art is clearly visible across the entire site
  const effectiveOpacity = Math.max(opacity || 0, 0.25);

  return (
    <motion.img
      ref={ref}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={isInView ? { opacity: effectiveOpacity, scale: 1 } : { opacity: 0, scale: 0.85 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      className={`absolute object-contain pointer-events-none select-none ${
        spin ? 'animate-slow-spin' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        animation: spin ? `slow-spin ${spinDuration}s linear infinite` : 'none',
        mixBlendMode: blend,
        WebkitMaskImage:
          'radial-gradient(circle closest-side, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 95%)',
        maskImage: 'radial-gradient(circle closest-side, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 95%)',
        ...style,
      }}
      loading="lazy"
    />
  );
}
