import { m as motion, useInView } from 'framer-motion';
import React from 'react';
import { MANDALA_VARIANT_URLS } from '../../constants/mandalaAssets';

/**
 * MandalaElement — Renders a high-detail mandala art image overlay.
 * Drop-in replacement: all existing props are still accepted so that
 * callers across the codebase continue to work without any changes.
 *
 * Variant mapping:
 *   1 → mandala_hero_art.png  (original lotus/paisley)
 *   2 → mandala_art_2.png     (geometric star / rangoli)
 *   3 → mandala_art_3.png     (mehndi / vine floral)
 *   4 → mandala_art_4.png     (peacock / kalamkari sunburst)
 */

const VARIANT_MAP = MANDALA_VARIANT_URLS;

export const MandalaElement = React.memo(function MandalaElement({
  className = '',
  size = 400,
  opacity = 0.12,
  _color, // accepted but ignored (images have their own color)
  rotate = true,
  duration = 60,
  variant = 1,
  skipFade = false,
}) {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { amount: 0.1 });
  const src = VARIANT_MAP[variant] || VARIANT_MAP[1];

  return (
    <motion.img
      ref={ref}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      initial={{ opacity: skipFade ? opacity : 0 }}
      animate={{ opacity }}
      transition={{ opacity: { duration: 1.5 } }}
      className={`pointer-events-none select-none z-0 object-contain rounded-full ${
        rotate ? 'animate-slow-spin' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        maxWidth: '100%',
        maxHeight: '100%',
        animation: rotate ? `slow-spin ${duration}s linear infinite` : 'none',
        mixBlendMode: 'darken',
        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 75%)',
        maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 75%)',
      }}
      loading="lazy"
    />
  );
});
