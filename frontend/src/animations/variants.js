/**
 * Premium Animation System for Siri Arts & Crafts
 * Focus: Minimalism, Elegance, Luxury
 */

const shouldReduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const cinematicTransition = shouldReduceMotion
  ? { duration: 0.1 }
  : { duration: 1.2, ease: [0.22, 1, 0.36, 1] };

const uiTransition = shouldReduceMotion
  ? { duration: 0.05 }
  : { duration: 0.4, ease: [0.22, 1, 0.36, 1] };

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: cinematicTransition,
};

export const uiFadeUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: uiTransition,
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
      when: 'beforeChildren',
    },
  },
};

export const fadeUp = {
  hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: cinematicTransition,
  },
};

export const revealRight = {
  hidden: { x: shouldReduceMotion ? 0 : -40, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: shouldReduceMotion ? 0.1 : 1.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const revealLeft = {
  hidden: { x: shouldReduceMotion ? 0 : 40, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: shouldReduceMotion ? 0.1 : 1.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const hoverScale = {
  whileHover: { scale: shouldReduceMotion ? 1 : 1.02 },
  whileTap: { scale: shouldReduceMotion ? 1 : 0.98 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export const drawerTransition = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { type: 'spring', damping: 30, stiffness: 300 },
};

export const cinematicHero = {
  initial: { scale: shouldReduceMotion ? 1 : 1.1, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: {
    duration: shouldReduceMotion ? 0.1 : 2.5,
    ease: [0.22, 1, 0.36, 1],
  },
};
