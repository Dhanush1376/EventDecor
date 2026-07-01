/**
 * Design Tokens — JS-accessible constants
 * These mirror the CSS custom properties in globals.css for use in
 * Framer Motion animations, inline styles, and JS calculations.
 *
 * IMPORTANT: Keep these in sync with globals.css :root / @theme
 */

// ─── Z-Index Scale ───
export const Z_INDEX = {
  base: 0,
  raised: 1,
  sticky: 50,
  dropdown: 60,
  overlay: 90,
  drawer: 110,
  modal: 120,
  toast: 130,
  loader: 9000,
  splash: 99999,
};

// ─── Transition Presets ───
export const EASE = {
  luxury: [0.16, 1, 0.3, 1],
  smooth: [0.22, 1, 0.36, 1],
  bounce: [0.34, 1.56, 0.64, 1],
};

export const DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
};

// ─── Animation Presets for Framer Motion ───
export const MOTION_PRESETS = {
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURATION.slow, ease: EASE.smooth },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: DURATION.normal, ease: EASE.smooth },
  },
  slideInRight: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { type: 'spring', damping: 28, stiffness: 280 },
  },
  slideInBottom: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: { type: 'spring', damping: 28, stiffness: 280 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: DURATION.normal, ease: EASE.smooth },
  },
  pageEnter: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: EASE.smooth },
  },
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  },
  staggerItem: {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURATION.slow, ease: EASE.smooth },
  },
};

// ─── Breakpoints ───
export const BREAKPOINTS = {
  xs: 360,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// ─── Colors (for dynamic JS use) ───
export const COLORS = {
  primary: '#735c00',
  primaryContainer: '#d4af37',
  gold: '#d4af37',
  goldLight: '#f1d592',
  goldDark: '#c4a030',
  surface: '#faf9f6',
  surfaceBright: '#ffffff',
  surfaceWarm: '#f8f7f4',
  surfaceIvory: '#fcfbf9',
  surfaceCream: '#FDFBF7',
  surfaceDark: '#0f0e0c',
  surfaceDarkAlt: '#1c1a17',
  onSurface: '#000000',
  onSurfaceVariant: '#2d2b29',
  outline: '#7f7663',
  outlineVariant: '#d0c5af',
  error: '#ba1a1a',
};

// ─── Layout ───
export const LAYOUT = {
  maxWidth: 1440,
  navbarHeight: 60,
  navbarHeightScrolled: 52,
  bottomNavHeight: 64,
  marginDesktop: 'clamp(22px, 4.5vw, 72px)',
  marginMobile: 18,
};
