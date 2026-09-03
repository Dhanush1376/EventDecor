import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Camera,
  Heart,
  ShoppingCart,
  LogIn,
  Info,
  Settings,
  User,
  Package,
  MapPin,
  LogOut,
  Menu,
  ShoppingBag,
  ChevronDown,
  X,
} from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SiriLogo } from '../ui/SiriLogo';
import { MandalaElement } from '../ui/MandalaElement';
import React, { Suspense, useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { adminInviteService, eventService } from '../../services/domainServices';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { useSearchOverlay } from '../../hooks/useSearchOverlay';
import { prefetchManager } from '../../utils/performance/prefetchManager';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useVisualSearch } from '../../hooks/useVisualSearch';
import { customOrderService } from '../../services/api/customOrderService';
import { productService } from '../../services/api/productService';
import { lazyWithRetry as lazy } from '../../utils/performance/lazyWithRetry';
import { useConfig } from '../../context/ConfigContext';

const IntelligentSearchOverlay = lazy(() =>
  import('../search/IntelligentSearchOverlay').then((m) => ({
    default: m.IntelligentSearchOverlay,
  })),
);
const VisualSearchOverlay = lazy(() =>
  import('../search/VisualSearchOverlay').then((m) => ({ default: m.VisualSearchOverlay })),
);

// Search caching is now handled by useSearchOverlay hook

export function TopNavbar() {
  const { storeSettings } = useConfig();
  const { navigation } = useWebsiteContent();
  const logoText = navigation?.logo?.text || 'SIRI ARTS & CRAFTS';
  const logoWords = logoText.split(' ');
  const _firstWord = logoWords[0] || 'SIRI';
  const _restWords = logoWords.slice(1).join(' ') || 'ARTS & CRAFTS';

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [_scrolled, _setScrolled] = useState(false);
  const location = useLocation();
  const { cartCount, setIsCartOpen, _purchaseCartCount, _rentalCartCount, _setActiveCartMode } =
    useCart();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [eventCategories, setEventCategories] = useState([]);
  const [openAccordion, setOpenAccordion] = useState(null);

  useEffect(() => {
    let active = true;
    productService
      .getCategories()
      .then((res) => {
        if (active && res?.success && res.data) {
          setCategories(res.data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    eventService
      .getCategories()
      .then((res) => {
        if (active && res?.success && res.data) {
          setEventCategories(res.data.map((cat) => cat.name));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Track cart additions for bouncing animation
  const prevCartCount = React.useRef(cartCount);
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setIsCartBouncing(true);
      const timer = setTimeout(() => setIsCartBouncing(false), 500);
      prevCartCount.current = cartCount;
      return () => clearTimeout(timer);
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isMobileOrTablet = useMediaQuery('(max-width: 1023px)');
  const [_isMoreOpen, setIsMoreOpen] = useState(false);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);

  const { scrollDirection, isAtTop } = useScrollDirection();
  const hideNavbar = !isAtTop && scrollDirection === 'down';

  const searchParams = new URLSearchParams(location.search);
  const searchParam = searchParams.get('search');

  const isHomePage = location.pathname === '/';
  const isShopPage = location.pathname === '/collections';
  const isEventsPage = location.pathname === '/events';
  const isAboutPage = location.pathname === '/about';
  const isWishlistPage = location.pathname === '/wishlist';
  const isCartPage = location.pathname === '/cart';

  // Always enable transparency on shop page at the top, since hero banner is always visible
  const isTransparent = (isHomePage || isShopPage || isEventsPage) && isAtTop;

  const adminRoles = [
    'owner',
    'super_admin',
    'main_admin',
    'moderator',
    'support_admin',
    'support',
    'order_manager',
    'content_manager',
    'admin',
    'manager',
    'coordinator',
  ];

  useEffect(() => {
    let active = true;
    if (isAuthenticated && user) {
      adminInviteService
        .getMyPendingInvite()
        .then((res) => {
          if (active && res?.success && res?.data) {
            setHasPendingInvite(true);
          } else if (active) {
            setHasPendingInvite(false);
          }
        })
        .catch(() => {});
    } else {
      setHasPendingInvite(false);
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, user]);

  const [hasUnreadCustomOrders, setHasUnreadCustomOrders] = useState(false);
  const [orderViewsUpdated, setOrderViewsUpdated] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setOrderViewsUpdated((prev) => prev + 1);
    window.addEventListener('siri_order_views_updated', handleUpdate);
    return () => window.removeEventListener('siri_order_views_updated', handleUpdate);
  }, []);

  useEffect(() => {
    let active = true;
    if (isAuthenticated && user) {
      customOrderService
        .getMyOrders()
        .then((res) => {
          if (active && res?.success && res?.data) {
            const now = Date.now();
            let views = {};
            try {
              views = JSON.parse(localStorage.getItem('siri_order_views') || '{}');
            } catch (e) {}

            const hasUnread = res.data.some((order) => {
              if (!order.statusHistory || !order.statusHistory.length) return false;
              const lastUpdate = new Date(
                order.statusHistory[order.statusHistory.length - 1].timestamp,
              ).getTime();
              const lastViewTime = views[order._id || order.id] || 0;
              return now - lastUpdate < 24 * 60 * 60 * 1000 && lastUpdate > lastViewTime;
            });
            setHasUnreadCustomOrders(hasUnread);
          }
        })
        .catch(() => {});
    } else {
      setHasUnreadCustomOrders(false);
    }
    return () => {
      active = false;
    };
  }, [isAuthenticated, user, location.pathname, orderViewsUpdated]);

  // ─── INTELLIGENT SEARCH OVERLAYS ───
  const search = useSearchOverlay();
  const visualSearch = useVisualSearch();

  // Connect inline search bars across pages to the global search overlay
  useEffect(() => {
    const handleOpenGlobalSearch = (e) => {
      const mode = e.detail?.mode || 'text';
      if (mode === 'visual') {
        visualSearch.open();
      } else {
        search.handleOpen(mode);
        if (e.detail?.query != null) {
          search.setQuery(e.detail.query);
        }
      }
    };
    window.addEventListener('open-global-search', handleOpenGlobalSearch);
    return () => window.removeEventListener('open-global-search', handleOpenGlobalSearch);
  }, [search, visualSearch]);

  const mobileMenuRef = React.useRef(null);
  const mobileTriggerRef = React.useRef(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Handle mobile menu focus trap and escape key
  useEffect(() => {
    const handleGlobalEscape = (e) => {
      if (e.key === 'Escape') {
        setIsMoreOpen(false);
        setIsProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalEscape);

    if (isOpen && isMobile) {
      mobileTriggerRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';

      const focusableElements = mobileMenuRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setIsOpen(false);
        if (e.key === 'Tab' && focusableElements) {
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keydown', handleGlobalEscape);
        document.body.style.overflow = '';
        if (mobileTriggerRef.current) {
          mobileTriggerRef.current.focus();
        }
      };
    }

    return () => {
      window.removeEventListener('keydown', handleGlobalEscape);
    };
  }, [isOpen, isMobile]);

  // Purely dynamic, CMS-driven links. No hardcoded fallbacks.
  const dbLinks =
    navigation?.mainLinks
      ?.filter((link) => link.isVisible)
      .map((link) => ({
        label: link.label,
        href: link.href || link.link,
      }))
      .filter((link) => {
        if (storeSettings?.storefront?.hideGallerySection && link.href === '/gallery') {
          return false;
        }
        return true;
      }) || [];

  const navLinks = [
    { label: 'Home', href: '/', mobileOnly: true },
    ...dbLinks,
    { label: 'My Orders', href: '/dashboard/orders', mobileOnly: true },
    { label: 'Contact Us', href: '/contact', mobileOnly: true },
  ];

  const isActive = (href) => location.pathname === href;

  return (
    <>
      <nav
        className={`top-navbar fixed top-0 w-full transition-all duration-500 ${
          isTransparent
            ? 'bg-gradient-to-b from-black/90 via-black/40 to-transparent border-transparent py-2'
            : !isAtTop
              ? 'bg-surface/95 backdrop-blur-2xl border-b border-primary-container/20 py-1.5'
              : 'bg-surface/90 backdrop-blur-md py-2 border-b border-outline-variant/10'
        } ${hideNavbar ? '-translate-y-full' : 'translate-y-0'}`}
        style={{
          zIndex: 'var(--z-sticky)',
          boxShadow: isTransparent ? 'none' : !isAtTop ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        }}
      >
        {/* Background Mandala Art */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
          {!isTransparent && (
            <div className="opacity-[0.1]">
              <MandalaElement size={350} duration={240} variant={1} skipFade={true} />
            </div>
          )}
        </div>

        <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop">
          <div className="flex items-center justify-between w-full gap-4">
            {/* Exquisite Boutique Brand Logo or Page Context Header */}
            <div className="flex-shrink-0 flex justify-start min-w-0">
              {isWishlistPage || isCartPage ? (
                <button
                  onClick={() => navigate('/collections')}
                  className="group flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <ArrowLeft
                    size={24}
                    strokeWidth={1.5}
                    className="text-on-surface group-hover:-translate-x-1 transition-transform"
                  />
                  <span className="font-label text-[12px] lg:text-[13px] font-bold uppercase tracking-[0.2em] text-on-surface leading-none pt-0.5">
                    {isWishlistPage ? 'Wishlist' : 'Cart'}
                  </span>
                </button>
              ) : (
                <Link to="/" className="group flex items-center shrink-0">
                  <div className="flex flex-col justify-center">
                    {/* Desktop Layout: Side-by-side */}
                    <div className="hidden lg:flex items-center">
                      <SiriLogo size="36px" variant={isTransparent ? 'white' : 'default'} />
                    </div>

                    {/* Mobile Layout: Stacked */}
                    <div className="flex lg:hidden flex-col leading-none">
                      <SiriLogo
                        size="36px"
                        showSubtitle={false}
                        variant={isTransparent ? 'white' : 'default'}
                      />
                    </div>
                  </div>
                </Link>
              )}
            </div>

            {/* Navigation Links (Tablet/Desktop) - Enhanced with elegant active state indicator */}
            {/* Desktop Navigation (Full) */}
            <div className="hidden lg:flex flex-grow justify-center items-center">
              <ul className="flex items-center space-x-2">
                {navLinks
                  .filter((l) => !l.mobileOnly)
                  .map((link, idx) => {
                    const active = isActive(link.href);
                    return (
                      <li key={idx}>
                        <Link
                          className={`relative font-label-sm text-[10px] lg:text-[11px] uppercase tracking-[0.2em] lg:tracking-[0.25em] px-2.5 lg:px-3.5 py-2 rounded-full transition-all duration-300 flex items-center font-bold whitespace-nowrap ${
                            active
                              ? isTransparent
                                ? 'text-white bg-white/20'
                                : 'text-primary bg-primary-container/10'
                              : isTransparent
                                ? 'text-white hover:bg-white/10'
                                : 'text-on-surface hover:text-primary hover:bg-surface-container-low'
                          }`}
                          to={link.href}
                        >
                          <span className="flex items-center">
                            <span>{link.label}</span>
                            {link.label === 'Custom Orders' && hasUnreadCustomOrders && (
                              <span className="ml-0.5 relative w-1.5 h-1.5 rounded-full bg-[#ff5a00] shadow-sm"></span>
                            )}
                          </span>
                          {active && (
                            <span
                              className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isTransparent ? 'bg-white' : 'bg-primary'}`}
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>

            {/* Right side actions group */}
            <div className="flex-shrink-0 flex items-center justify-end gap-1 lg:gap-2">
              {/* Trailing Luxury Icons */}
              <div className="flex items-center gap-1 lg:gap-3">
                {/* Unified Search Bar (Tablet/Desktop) */}
                <div
                  onClick={search.handleOpen}
                  className={`hidden lg:flex items-center gap-2.5 px-4 h-10 rounded-full cursor-pointer transition-all duration-300 border backdrop-blur-md w-[200px] lg:w-[260px] group ${
                    isTransparent
                      ? 'border-white/20 hover:bg-white/10 text-white'
                      : 'border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5 text-on-surface'
                  }`}
                >
                  <Search
                    size={18}
                    strokeWidth={1.5}
                    className={`transition-colors ${isTransparent ? 'opacity-70 group-hover:opacity-100' : 'text-on-surface-variant group-hover:text-primary'}`}
                  />
                  <span
                    className={`flex-1 text-[13px] font-medium truncate select-none ${isTransparent ? 'opacity-70' : 'text-on-surface-variant/70'}`}
                  >
                    Search products...
                  </span>

                  {visualSearch.isEnabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        visualSearch.open();
                      }}
                      className={`flex items-center justify-center w-8 h-8 rounded-full relative flex-shrink-0 transition-all duration-300 hover:scale-110 ${
                        isTransparent
                          ? 'text-white hover:bg-white/20'
                          : 'text-on-surface hover:bg-black/5'
                      }`}
                      aria-label="Visual Search"
                    >
                      <Camera size={20} strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                {/* Mobile Unified Search Icon */}
                <button
                  onClick={search.handleOpen}
                  className={`lg:hidden ${isTransparent ? 'text-white hover:bg-white/10' : 'text-on-surface hover:text-primary hover:bg-primary-container/10'} transition-all duration-300 hover:scale-110 flex items-center justify-center w-10 h-10 rounded-full relative group cursor-pointer min-h-0 icon-button-touch-target`}
                  aria-label="Search Catalog"
                >
                  <Search size={24} strokeWidth={1.5} />
                </button>

                <Link
                  to="/wishlist"
                  className={`${isTransparent ? 'text-white hover:bg-white/10' : 'text-on-surface hover:text-primary hover:bg-primary/10'} transition-all duration-300 hover:scale-110 hidden lg:flex items-center justify-center w-10 h-10 rounded-full relative group cursor-pointer min-h-0 icon-button-touch-target flex-shrink-0 aspect-square`}
                  aria-label="View Wishlist"
                >
                  <Heart size={24} strokeWidth={1.5} />
                </Link>

                <motion.button
                  id="cart-trigger-desktop"
                  onMouseEnter={() => prefetchManager.prefetchRoute('/cart', { kind: 'hover' })}
                  onClick={() => {
                    navigate('/cart');
                  }}
                  animate={
                    isCartBouncing
                      ? { scale: [1, 1.25, 0.9, 1.1, 1], rotate: [0, 10, -10, 5, 0] }
                      : {}
                  }
                  transition={{ duration: 0.5 }}
                  className={`${isTransparent ? 'text-white hover:bg-white/10' : 'text-on-surface hover:text-[#d4af37] hover:bg-[#d4af37]/10'} transition-all duration-300 hover:scale-110 flex items-center justify-center w-10 h-10 rounded-full relative group cursor-pointer min-h-0 icon-button-touch-target flex-shrink-0 aspect-square`}
                  aria-label="View Bag"
                >
                  <ShoppingCart size={24} strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`absolute top-0.5 right-0.5 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs border-2 ${isTransparent ? 'border-transparent' : 'border-surface-bright'}`}
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </motion.button>

                {!isAuthenticated ? (
                  <button
                    onClick={openAuthModal}
                    className={`${isTransparent ? 'border border-white/20 hover:bg-white/10 text-white' : 'border border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5 text-on-surface hover:text-primary'} transition-all duration-300 hover:scale-110 hidden lg:flex items-center justify-center w-10 h-10 rounded-full relative group cursor-pointer min-h-0 icon-button-touch-target flex-shrink-0 aspect-square`}
                    aria-label="User Account"
                  >
                    <LogIn size={24} strokeWidth={1.5} />
                  </button>
                ) : (
                  <div className="relative hidden lg:flex items-center gap-4">
                    <div className="relative">
                      <button
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        aria-expanded={isProfileDropdownOpen}
                        aria-haspopup="true"
                        onMouseEnter={() =>
                          prefetchManager.prefetchRoute('/dashboard', { kind: 'hover' })
                        }
                        className={`${isTransparent ? 'border border-white/20 hover:bg-white/10 text-white' : 'border border-outline-variant/40 hover:border-primary/40 hover:bg-primary/5 text-on-surface hover:text-primary'} transition-all duration-300 hover:scale-110 flex items-center justify-center w-10 h-10 rounded-full relative group cursor-pointer min-h-0 icon-button-touch-target flex-shrink-0 aspect-square`}
                        aria-label="User Dropdown"
                      >
                        <span
                          className={`text-[11px] uppercase font-bold tracking-wider ${isTransparent ? 'text-white' : 'text-primary'}`}
                        >
                          {user?.name?.substring(0, 2) || user?.email?.substring(0, 2) || 'U'}
                        </span>
                        {hasPendingInvite && (
                          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm" />
                        )}
                      </button>

                      <AnimatePresence>
                        {isProfileDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsProfileDropdownOpen(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-2xl border border-outline-variant/30 rounded-2xl shadow-xl py-2.5 z-50 overflow-hidden"
                            >
                              <div className="px-4 py-2 border-b border-outline-variant/10 mb-1">
                                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider truncate">
                                  {user?.name || 'Customer'}
                                </p>
                                <p className="text-[9px] text-on-surface-variant/50 truncate font-light tracking-wide">
                                  {user?.email}
                                </p>
                              </div>

                              {hasPendingInvite && (
                                <div className="px-4 py-2 bg-rose-50 border-b border-rose-100 text-[10px] text-rose-600 font-bold flex items-center gap-1.5 animate-pulse">
                                  <Info size={15} strokeWidth={1.5} />
                                  <span>Pending Admin Invitation</span>
                                </div>
                              )}

                              {adminRoles.includes(user?.role) && (
                                <Link
                                  to="/admin"
                                  onClick={() => setIsProfileDropdownOpen(false)}
                                  className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors font-bold border-b border-outline-variant/10 mb-1.5 pb-2"
                                >
                                  <Settings size={17} strokeWidth={1.5} />
                                  <span>Admin Portal</span>
                                </Link>
                              )}

                              <Link
                                to="/dashboard?tab=profile"
                                onClick={() => setIsProfileDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-on-surface hover:bg-primary/5 hover:text-primary transition-colors font-bold"
                              >
                                <User size={17} strokeWidth={1.5} />
                                <span>My Profile</span>
                              </Link>

                              <Link
                                to="/dashboard?tab=orders"
                                onClick={() => setIsProfileDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-on-surface hover:bg-primary/5 hover:text-primary transition-colors font-bold"
                              >
                                <Package size={17} strokeWidth={1.5} />
                                <span>Orders</span>
                              </Link>

                              <Link
                                to="/dashboard?tab=addresses"
                                onClick={() => setIsProfileDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-on-surface hover:bg-primary/5 hover:text-primary transition-colors font-bold"
                              >
                                <MapPin size={17} strokeWidth={1.5} />
                                <span>Addresses</span>
                              </Link>

                              <button
                                onClick={() => {
                                  setIsProfileDropdownOpen(false);
                                  logout();
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-error hover:bg-error/5 transition-colors font-bold border-t border-outline-variant/10 mt-1.5 pt-2 cursor-pointer"
                              >
                                <LogOut size={17} strokeWidth={1.5} />
                                <span>Logout</span>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>

              <button
                onMouseEnter={() =>
                  prefetchManager.prefetchRoute('/collections', { kind: 'hover' })
                }
                onClick={() => setIsOpen(true)}
                className={`lg:hidden flex flex-col items-center justify-center gap-[5px] w-10 h-10 rounded-full transition-all duration-300 hover:scale-110 cursor-pointer min-h-0 icon-button-touch-target ${isTransparent ? 'text-white hover:bg-white/10' : 'hover:bg-primary-container/10 hover:text-primary text-on-surface'}`}
                aria-label="Open navigation menu"
                aria-expanded={isOpen}
                aria-controls="mobile-menu-drawer"
              >
                <Menu size={26} strokeWidth={1.5} className="text-current" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Full-Screen Immersive Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/35 backdrop-blur-xs z-[115] lg:hidden"
            />

            {/* Slide-out Drawer Panel */}
            <motion.div
              ref={mobileMenuRef}
              id="mobile-menu-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 250, mass: 0.8 }}
              className="fixed right-0 top-0 bottom-0 w-[85%] max-w-[450px] h-full bg-surface-bright z-[120] lg:hidden px-6 py-6 flex flex-col overflow-y-auto overflow-x-hidden shadow-[-20px_0_60px_rgba(0,0,0,0.15)] border-l border-outline-variant/10"
            >
              {/* Minimal Header */}
              <div className="flex justify-between items-center mb-12 px-2">
                <SiriLogo size="42px" />
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={32} strokeWidth={1.5} />
                </button>
              </div>

              {/* Editorial Typography List Navigation */}
              <div className="flex-grow flex flex-col justify-start items-start w-full mt-4">
                <ul className="relative z-10 flex flex-col items-start w-full border-t border-outline-variant/30">
                  {navLinks.map((link, idx) => {
                    const active = isActive(link.href);
                    const isShopLink =
                      link.label.toLowerCase() === 'shop' ||
                      link.label.toLowerCase() === 'collections' ||
                      link.label.toLowerCase() === 'shop by category';
                    const isEventsLink = link.label.toLowerCase() === 'events';
                    const hasSubMenu = isShopLink || isEventsLink;
                    const accordionId = isShopLink ? 'shop' : isEventsLink ? 'events' : null;
                    const subItems = isShopLink ? categories : isEventsLink ? eventCategories : [];

                    return (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.05 + idx * 0.05,
                          duration: 0.4,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="w-full flex flex-col items-start border-b border-outline-variant/30"
                      >
                        <div className="flex items-center justify-between w-full group">
                          {hasSubMenu ? (
                            <button
                              onClick={() =>
                                setOpenAccordion(openAccordion === accordionId ? null : accordionId)
                              }
                              className={`flex items-center justify-between font-serif uppercase tracking-wider text-[15px] transition-all duration-300 w-full text-left py-3 px-1 ${active || openAccordion === accordionId ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
                            >
                              <span>{link.label}</span>
                              <div className="flex items-center justify-center pl-5 border-l border-outline-variant/40 h-5">
                                <ChevronDown
                                  size={16}
                                  strokeWidth={1.5}
                                  className={`transition-transform duration-300 ${openAccordion === accordionId ? 'rotate-180' : ''}`}
                                />
                              </div>
                            </button>
                          ) : (
                            <Link
                              onClick={() => setIsOpen(false)}
                              className={`group flex items-center justify-start gap-3 font-serif uppercase tracking-wider text-[15px] transition-all duration-300 w-full text-left py-3 px-1 ${active ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
                              to={link.href}
                            >
                              <span className="text-left relative flex items-center justify-start gap-2 w-full">
                                <span>{link.label}</span>
                                {link.label === 'Custom Orders' && hasUnreadCustomOrders && (
                                  <span className="relative w-2 h-2 rounded-full bg-[#ff5a00] shadow-sm"></span>
                                )}
                              </span>
                            </Link>
                          )}
                        </div>

                        {/* Accordion Content */}
                        {hasSubMenu && (
                          <AnimatePresence>
                            {openAccordion === accordionId && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden w-full flex flex-col items-start space-y-5 px-1 pb-5 pt-2"
                              >
                                {isShopLink && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.05, duration: 0.3 }}
                                    className="w-full"
                                  >
                                    <Link
                                      to={link.href}
                                      onClick={() => setIsOpen(false)}
                                      className="font-serif text-[15px] capitalize text-on-surface hover:text-primary transition-all duration-300 text-left w-full block"
                                    >
                                      View All
                                    </Link>
                                  </motion.div>
                                )}
                                {subItems.map((cat, i) => {
                                  const categoryName = typeof cat === 'string' ? cat : cat.name;
                                  return (
                                    <motion.div
                                      key={i}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.05 + (i + 1) * 0.03, duration: 0.3 }}
                                      className="w-full"
                                    >
                                      <Link
                                        to={
                                          isShopLink
                                            ? `/collections?category=${encodeURIComponent(categoryName)}`
                                            : `/events?type=${encodeURIComponent(categoryName)}`
                                        }
                                        onClick={() => setIsOpen(false)}
                                        className="font-serif text-[15px] capitalize text-on-surface hover:text-primary transition-all duration-300 text-left w-full block"
                                      >
                                        {categoryName.toLowerCase()}
                                      </Link>
                                    </motion.div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}
                      </motion.li>
                    );
                  })}
                  {isAuthenticated && adminRoles.includes(user?.role) && (
                    <motion.li
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.05 + navLinks.length * 0.05,
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="flex justify-start w-full bg-[#F5F2EC] border-b border-outline-variant/30"
                    >
                      <Link
                        onClick={() => setIsOpen(false)}
                        className="group flex items-center justify-start gap-3 font-serif uppercase tracking-wider text-[15px] transition-all duration-300 w-full text-left py-3 px-1 text-on-surface hover:text-primary"
                        to="/admin"
                      >
                        <span>Admin Portal</span>
                        {hasPendingInvite && (
                          <span className="relative w-2 h-2 rounded-full bg-[#ff5a00] shadow-sm"></span>
                        )}
                      </Link>
                    </motion.li>
                  )}
                </ul>
              </div>

              {/* Ultra-Minimal Footer */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mt-auto w-full px-2 pb-12 pt-8"
              >
                <div className="w-full mt-4">
                  <div className="flex items-center justify-between w-full px-1">
                    {/* Left Group: Utilities */}
                    <div className="flex items-center gap-4 sm:gap-7">
                      <Link
                        to="/wishlist"
                        onClick={() => setIsOpen(false)}
                        className="flex flex-col items-center gap-2 text-on-surface hover:text-primary transition-colors group"
                      >
                        <Heart
                          size={24}
                          strokeWidth={1.3}
                          className="group-hover:scale-105 transition-transform"
                        />
                        <span className="text-[9px] font-sans uppercase tracking-[0.2em]">
                          Wishlist
                        </span>
                      </Link>

                      <motion.button
                        onClick={() => {
                          setIsOpen(false);
                          setIsCartOpen(true);
                        }}
                        animate={isCartBouncing ? { scale: [1, 1.1, 0.95, 1.05, 1] } : {}}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col items-center gap-2 text-on-surface hover:text-primary transition-colors relative cursor-pointer group"
                      >
                        <div className="relative">
                          <ShoppingBag
                            size={24}
                            strokeWidth={1.3}
                            className="group-hover:scale-105 transition-transform"
                          />
                          {cartCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm">
                              {cartCount}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-sans uppercase tracking-[0.2em]">Bag</span>
                      </motion.button>

                      {isAuthenticated && (
                        <Link
                          to="/dashboard"
                          onClick={() => setIsOpen(false)}
                          className="flex flex-col items-center gap-2 text-on-surface hover:text-primary transition-colors group"
                        >
                          <User
                            size={24}
                            strokeWidth={1.3}
                            className="group-hover:scale-105 transition-transform"
                          />
                          <span className="text-[9px] font-sans uppercase tracking-[0.2em]">
                            Profile
                          </span>
                        </Link>
                      )}
                    </div>

                    {/* Right Group: Authentication */}
                    <div className="flex items-center">
                      {!isAuthenticated ? (
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            openAuthModal();
                          }}
                          className="flex flex-col items-center gap-2 text-on-surface hover:text-primary transition-colors group cursor-pointer"
                        >
                          <LogIn
                            size={24}
                            strokeWidth={1.3}
                            className="group-hover:scale-105 transition-transform"
                          />
                          <span className="text-[9px] font-sans uppercase tracking-[0.2em]">
                            Sign In
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            logout();
                          }}
                          className="flex flex-col items-center gap-2 text-on-surface hover:text-error transition-colors group cursor-pointer"
                        >
                          <LogOut
                            size={24}
                            strokeWidth={1.3}
                            className="group-hover:scale-105 transition-transform"
                          />
                          <span className="text-[9px] font-sans uppercase tracking-[0.2em]">
                            Sign Out
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {(search.isOpen || visualSearch.isOpen) && (
        <Suspense fallback={null}>
          <IntelligentSearchOverlay
            isOpen={search.isOpen}
            initialMode={search.initialMode}
            query={search.query}
            setQuery={search.setQuery}
            suggestions={search.suggestions}
            predictedCategories={search.predictedCategories}
            trendingSearches={search.trendingSearches}
            recentSearches={search.recentSearches}
            discoveryData={search.discoveryData}
            onRemoveRecent={search.removeRecentSearch}
            loading={search.loading}
            activeIndex={search.activeIndex}
            setActiveIndex={search.setActiveIndex}
            onClose={search.handleClose}
            onKeyDown={search.handleKeyDown}
            onSelectSuggestion={search.selectSuggestion}
            onExecuteSearch={search.executeSearch}
            onClearRecent={search.clearRecentSearches}
            correctedQuery={search.correctedQuery}
            visualSearch={visualSearch}
          />
          <VisualSearchOverlay
            isOpen={visualSearch.isOpen}
            phase={visualSearch.phase}
            previewUrl={visualSearch.previewUrl}
            results={visualSearch.results}
            error={visualSearch.error}
            scanProgress={visualSearch.scanProgress}
            scanStatus={visualSearch.scanStatus}
            onClose={visualSearch.close}
            onImageSelect={(file, mode) => visualSearch.handleImageSelect(file, mode || 'upload')}
            onRetry={visualSearch.retry}
            onReset={visualSearch.reset}
          />
        </Suspense>
      )}
    </>
  );
}
