import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { adminInviteService } from '../../services/domainServices';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { useSearchOverlay } from '../../hooks/useSearchOverlay';
import { IntelligentSearchOverlay } from '../search/IntelligentSearchOverlay';
import { prefetchManager } from '../../utils/prefetchManager';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { SiriLogo } from '../ui/SiriLogo';
import { MandalaElement } from '../ui/MandalaElement';
import { MandalaArtDecor } from '../ui/MandalaArtDecor';
// Search caching is now handled by useSearchOverlay hook

export function TopNavbar() {
  const { navigation } = useWebsiteContent();
  const logoText = navigation?.logo?.text || 'SIRI ARTS & CRAFTS';
  const logoWords = logoText.split(' ');
  const firstWord = logoWords[0] || 'SIRI';
  const restWords = logoWords.slice(1).join(' ') || 'ARTS & CRAFTS';

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { cartCount, setIsCartOpen, purchaseCartCount, rentalCartCount, setActiveCartMode } =
    useCart();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isMobileOrTablet = useMediaQuery('(max-width: 1023px)');
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [hasPendingInvite, setHasPendingInvite] = useState(false);

  const { scrollDirection, isAtTop } = useScrollDirection();
  const hideNavbar = !isAtTop && scrollDirection === 'down' && !isMobileOrTablet;

  const searchParams = new URLSearchParams(location.search);
  const searchParam = searchParams.get('search');

  const isHomePage = location.pathname === '/';
  const isShopPage = location.pathname === '/collections';
  const isEventsPage = location.pathname === '/events';
  const isAboutPage = location.pathname === '/about';

  // Disable transparency on shop page if on mobile with an active search (since hero is hidden)
  const isTransparent =
    (isHomePage || (isShopPage && !(isMobile && searchParam)) || isEventsPage || isAboutPage) &&
    isAtTop;

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

  // ─── INTELLIGENT SEARCH OVERLAY (Powered by useSearchOverlay hook) ───
  const search = useSearchOverlay();

  const mobileMenuRef = React.useRef(null);
  const mobileTriggerRef = React.useRef(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Handle mobile menu focus trap and escape key
  useEffect(() => {
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
        document.body.style.overflow = '';
        if (mobileTriggerRef.current) {
          mobileTriggerRef.current.focus();
        }
      };
    }
  }, [isOpen, isMobile]);

  // Purely dynamic, CMS-driven links. No hardcoded fallbacks.
  const dbLinks =
    navigation?.mainLinks
      ?.filter((link) => link.isVisible)
      .map((link) => ({
        label: link.label,
        href: link.href || link.link,
      })) || [];

  const navLinks = [{ label: 'Home', href: '/', mobileOnly: true }, ...dbLinks];

  const isActive = (href) => location.pathname === href;

  return (
    <>
      <nav
        className={`top-navbar fixed top-0 w-full transition-all duration-500 ${
          isTransparent
            ? 'bg-gradient-to-b from-black/50 to-transparent border-transparent py-2'
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

        <h1 className="sr-only">Siri Arts & Crafts</h1>
        <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex items-center justify-between w-full gap-4">
            {/* Exquisite Boutique Brand Logo */}
            <div className="flex-shrink-0 flex justify-start min-w-0">
              <Link to="/" className="group flex items-center shrink-0">
                <div className="flex flex-col justify-center">
                  {/* Desktop Layout: Side-by-side */}
                  <div className="hidden md:flex items-center">
                    <SiriLogo size="36px" variant={isTransparent ? 'white' : 'default'} />
                  </div>

                  {/* Mobile Layout: Stacked */}
                  <div className="flex md:hidden flex-col leading-none">
                    <SiriLogo
                      size="36px"
                      showSubtitle={false}
                      variant={isTransparent ? 'white' : 'default'}
                    />
                  </div>
                </div>
              </Link>
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
                          {link.label}
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

            {/* Tablet Navigation (Condensed with More) */}
            <div className="hidden md:flex lg:hidden flex-grow justify-center items-center space-x-2">
              {navLinks
                .filter((l) => !l.mobileOnly)
                .slice(0, 3)
                .map((link, idx) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={idx}
                      className={`relative font-label-sm text-[10px] uppercase tracking-[0.15em] px-2.5 py-2 rounded-full transition-all duration-300 flex items-center font-bold whitespace-nowrap ${
                        active
                          ? isTransparent
                            ? 'text-white bg-white/20'
                            : 'text-primary bg-primary-container/10'
                          : isTransparent
                            ? 'text-white hover:bg-white/10'
                            : 'text-on-surface hover:text-primary'
                      }`}
                      to={link.href}
                    >
                      {link.label}
                    </Link>
                  );
                })}

              <div className="relative">
                {(() => {
                  const isMoreActive = navLinks
                    .filter((l) => !l.mobileOnly)
                    .slice(3)
                    .some((link) => isActive(link.href));
                  return (
                    <button
                      onClick={() => setIsMoreOpen(!isMoreOpen)}
                      className={`font-label-sm text-[10px] uppercase tracking-[0.15em] px-2.5 py-2 rounded-full transition-all duration-300 flex items-center font-bold cursor-pointer ${
                        isMoreActive
                          ? isTransparent
                            ? 'text-white bg-white/20'
                            : 'text-primary bg-primary-container/10'
                          : isTransparent
                            ? 'text-white hover:bg-white/10'
                            : 'text-on-surface hover:text-primary'
                      }`}
                    >
                      More
                      <span
                        className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isMoreOpen ? 'rotate-180' : ''}`}
                      >
                        expand_more
                      </span>
                    </button>
                  );
                })()}

                <AnimatePresence>
                  {isMoreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-surface-bright border border-outline-variant/20 rounded-2xl shadow-xl py-2 z-[60]"
                    >
                      {navLinks
                        .filter((l) => !l.mobileOnly)
                        .slice(3)
                        .map((link, idx) => (
                          <Link
                            key={idx}
                            to={link.href}
                            onClick={() => setIsMoreOpen(false)}
                            className="flex items-center px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-on-surface hover:bg-primary-container/10 hover:text-primary transition-colors font-bold"
                          >
                            {link.label}
                          </Link>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right side actions group */}
            <div className="flex-shrink-0 flex items-center justify-end gap-1 md:gap-2">
              {/* Trailing Luxury Icons */}
              <div className="flex items-center gap-1 md:gap-1.5">
                <button
                  onClick={search.handleOpen}
                  className={`${isTransparent ? 'text-white hover:bg-white/10' : 'text-on-surface hover:text-primary hover:bg-primary-container/10'} transition-all duration-300 hover:scale-110 flex items-center justify-center w-9 h-9 rounded-full relative group cursor-pointer min-h-0 icon-button-touch-target`}
                  aria-label="Search Catalog (⌘K)"
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: "'wght' 200" }}
                  >
                    search
                  </span>
                </button>

                <Link
                  to="/wishlist"
                  className={`${isTransparent ? 'text-white hover:bg-white/10' : 'text-on-surface hover:text-primary hover:bg-primary-container/10'} transition-all duration-300 hover:scale-110 hidden md:flex items-center justify-center w-9 h-9 rounded-full relative group icon-button-touch-target`}
                  aria-label="View Wishlist"
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'wght' 200" }}
                  >
                    favorite
                  </span>
                </Link>

                <button
                  id="cart-trigger-desktop"
                  onMouseEnter={() => prefetchManager.prefetchRoute('/cart', { kind: 'hover' })}
                  onClick={() => {
                    navigate('/cart');
                  }}
                  className={`${isTransparent ? 'text-white hover:bg-white/10' : 'text-on-surface hover:text-[#d4af37] hover:bg-[#d4af37]/10'} transition-all duration-300 hover:scale-110 flex items-center justify-center w-9 h-9 rounded-full relative group cursor-pointer min-h-0 icon-button-touch-target`}
                  aria-label="View Bag"
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    aria-hidden="true"
                    style={{ fontVariationSettings: "'wght' 200" }}
                  >
                    shopping_cart
                  </span>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1 w-3.5 h-3.5 bg-primary-container text-on-primary-container text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </button>

                {!isAuthenticated ? (
                  <button
                    onClick={openAuthModal}
                    className={`${isTransparent ? 'text-white hover:bg-white/10' : 'text-on-surface hover:text-primary hover:bg-primary-container/10'} transition-all duration-300 hover:scale-110 hidden md:flex items-center justify-center w-9 h-9 rounded-full relative group cursor-pointer min-h-0 icon-button-touch-target`}
                    aria-label="User Account"
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: "'wght' 200" }}
                    >
                      login
                    </span>
                  </button>
                ) : (
                  <div className="relative hidden md:block">
                    <button
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      onMouseEnter={() =>
                        prefetchManager.prefetchRoute('/dashboard', { kind: 'hover' })
                      }
                      className={`w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer transition-colors relative icon-button-touch-target flex-shrink-0 aspect-square min-h-0 ${isTransparent ? 'bg-white/20 border-white/30 hover:bg-white/30 text-white' : 'bg-primary/10 border-primary/20 hover:bg-primary/20 text-primary'}`}
                      aria-label="User Dropdown"
                    >
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider ${isTransparent ? 'text-white' : 'text-primary'}`}
                      >
                        {user?.name?.substring(0, 2) || user?.email?.substring(0, 2) || 'U'}
                      </span>
                      {hasPendingInvite && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm" />
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
                                <span className="material-symbols-outlined text-[13px]">info</span>
                                <span>Pending Admin Invitation</span>
                              </div>
                            )}

                            {adminRoles.includes(user?.role) && (
                              <Link
                                to="/admin"
                                onClick={() => setIsProfileDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors font-bold border-b border-outline-variant/10 mb-1.5 pb-2"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  settings
                                </span>
                                <span>Admin Portal</span>
                              </Link>
                            )}

                            <Link
                              to="/dashboard?tab=profile"
                              onClick={() => setIsProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-on-surface hover:bg-primary/5 hover:text-primary transition-colors font-bold"
                            >
                              <span className="material-symbols-outlined text-[15px]">person</span>
                              <span>My Profile</span>
                            </Link>

                            <Link
                              to="/dashboard?tab=orders"
                              onClick={() => setIsProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-on-surface hover:bg-primary/5 hover:text-primary transition-colors font-bold"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                package_2
                              </span>
                              <span>Orders</span>
                            </Link>

                            <Link
                              to="/dashboard?tab=addresses"
                              onClick={() => setIsProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-on-surface hover:bg-primary/5 hover:text-primary transition-colors font-bold"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                location_on
                              </span>
                              <span>Addresses</span>
                            </Link>

                            <button
                              onClick={() => {
                                setIsProfileDropdownOpen(false);
                                logout();
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-error hover:bg-error/5 transition-colors font-bold border-t border-outline-variant/10 mt-1.5 pt-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">logout</span>
                              <span>Logout</span>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              <button
                onMouseEnter={() =>
                  prefetchManager.prefetchRoute('/collections', { kind: 'hover' })
                }
                onClick={() => setIsOpen(true)}
                className={`md:hidden flex flex-col items-center justify-center gap-[4.5px] w-9 h-9 rounded-full transition-all duration-300 hover:scale-110 cursor-pointer min-h-0 icon-button-touch-target ${isTransparent ? 'text-white hover:bg-white/10' : 'hover:bg-primary-container/10 hover:text-primary text-on-surface'}`}
                aria-label="Open navigation menu"
                aria-expanded={isOpen}
                aria-controls="mobile-menu-drawer"
              >
                <span className="w-5 h-[1.2px] bg-current" />
                <span className="w-5 h-[1.2px] bg-current" />
                <span className="w-5 h-[1.2px] bg-current" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Full-Screen Immersive Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={mobileMenuRef}
            id="mobile-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 w-full h-full bg-surface-bright z-[120] lg:hidden px-6 py-6 flex flex-col overflow-y-auto overflow-x-hidden"
          >
            {/* Decorative Mandala Background - Positioned to bleed off the right edge */}
            <MandalaArtDecor
              variant={2}
              size={700}
              opacity={0.06}
              className="absolute -top-[10%] -right-[40%] pointer-events-none"
              spinDuration={200}
              blendMode="multiply"
            />

            {/* Minimal Header */}
            <div className="flex justify-between items-center mb-12 px-2">
              <SiriLogo size="32px" />
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <span
                  className="material-symbols-outlined text-[32px] font-light"
                  style={{ fontVariationSettings: "'wght' 200" }}
                >
                  close
                </span>
              </button>
            </div>

            {/* Massive Luxury Typography Navigation */}
            <div className="flex-grow flex flex-col justify-center px-4 mb-12">
              <ul className="space-y-5 relative z-10">
                {navLinks.map((link, idx) => {
                  const active = isActive(link.href);
                  return (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.1 + idx * 0.05,
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <Link
                        onClick={() => setIsOpen(false)}
                        className={`group flex items-center font-label font-bold uppercase tracking-[0.2em] text-[16px] md:text-[20px] transition-all duration-500 ${
                          active
                            ? 'text-primary'
                            : 'text-on-surface hover:text-primary hover:translate-x-2'
                        }`}
                        to={link.href}
                      >
                        {link.label}
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </div>

            {/* Ultra-Minimal Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-auto px-4 pb-8"
            >
              <div className="w-full h-[1px] bg-outline-variant/30 mb-8" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <Link
                    to="/wishlist"
                    onClick={() => setIsOpen(false)}
                    className="text-on-surface hover:text-primary transition-colors"
                  >
                    <span
                      className="material-symbols-outlined text-[24px] font-light"
                      style={{ fontVariationSettings: "'wght' 200" }}
                    >
                      favorite
                    </span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setIsCartOpen(true);
                    }}
                    className="text-on-surface hover:text-primary transition-colors relative cursor-pointer"
                  >
                    <span
                      className="material-symbols-outlined text-[24px] font-light"
                      style={{ fontVariationSettings: "'wght' 200" }}
                    >
                      shopping_bag
                    </span>
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-primary-container text-on-primary-container text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                        {cartCount}
                      </span>
                    )}
                  </button>
                  {isAuthenticated && (
                    <Link
                      to="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="text-on-surface hover:text-primary transition-colors"
                    >
                      <span
                        className="material-symbols-outlined text-[24px] font-light"
                        style={{ fontVariationSettings: "'wght' 200" }}
                      >
                        person
                      </span>
                    </Link>
                  )}
                  {isAuthenticated && adminRoles.includes(user?.role) && (
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className="text-primary hover:text-primary/70 transition-colors"
                      aria-label="Admin Portal"
                    >
                      <span
                        className="material-symbols-outlined text-[24px] font-light"
                        style={{ fontVariationSettings: "'wght' 200" }}
                      >
                        settings
                      </span>
                    </Link>
                  )}
                </div>

                {!isAuthenticated ? (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      openAuthModal();
                    }}
                    className="font-label text-[11px] uppercase tracking-[0.2em] font-bold border-b border-on-surface pb-1 text-on-surface hover:text-primary hover:border-primary transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="font-label text-[11px] uppercase tracking-[0.2em] font-bold border-b border-on-surface pb-1 text-on-surface hover:text-error hover:border-error transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── INTELLIGENT AI-POWERED SEARCH OVERLAY ─── */}
      <IntelligentSearchOverlay
        isOpen={search.isOpen}
        query={search.query}
        setQuery={search.setQuery}
        suggestions={search.suggestions}
        predictedCategories={search.predictedCategories}
        trendingSearches={search.trendingSearches}
        recentSearches={search.recentSearches}
        loading={search.loading}
        activeIndex={search.activeIndex}
        setActiveIndex={search.setActiveIndex}
        onClose={search.handleClose}
        onKeyDown={search.handleKeyDown}
        onSelectSuggestion={search.selectSuggestion}
        onExecuteSearch={search.executeSearch}
        onRemoveRecent={search.removeRecentSearch}
        onClearRecent={search.clearRecentSearches}
        correctedQuery={search.correctedQuery}
      />
    </>
  );
}
