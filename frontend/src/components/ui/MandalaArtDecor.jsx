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

  return (
    <motion.img
      ref={ref}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={isInView ? { opacity, scale: 1 } : { opacity: 0, scale: 0.85 }}
      transition={{ duration: 1.5, ease: 'easeOut' }}
      className={`absolute object-contain rounded-full pointer-events-none select-none ${
        spin ? 'animate-slow-spin' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        animation: spin ? `slow-spin ${spinDuration}s linear infinite` : 'none',
        mixBlendMode: blend,
        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 65%)',
        maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 65%)',
        ...style,
      }}
      loading="lazy"
    />
  );
}
