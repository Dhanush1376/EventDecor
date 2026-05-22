/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { productService } from "../../services/domainServices";
import { useWebsiteContent } from "../../hooks/useWebsiteContent";

// ─── CACHING SEARCH SEEDS AT MODULE LEVEL ───
let cachedTrendingSearches = null;
let cachedPopularCategories = null;
let isFetchingSeeds = false;
let seedFetchPromise = null;
const searchCache = new Map();

export function TopNavbar() {
  const { navigation } = useWebsiteContent();
  const logoText = navigation?.logo?.text || "SIRI ARTS & CRAFTS";
  const logoWords = logoText.split(" ");
  const firstWord = logoWords[0] || "SIRI";
  const restWords = logoWords.slice(1).join(" ") || "ARTS & CRAFTS";

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // ─── SIRI PREDICTIVE SEARCH STATE ───
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Reset focus index when suggestions update
  useEffect(() => {
    setFocusedIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    let active = true;
    const trimmedQuery = searchQuery.trim().toLowerCase();

    if (!trimmedQuery) {
      setSuggestions([]);
      return;
    }

    // Serve instantly from cache if hit
    if (searchCache.has(trimmedQuery)) {
      setSuggestions(searchCache.get(trimmedQuery));
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await productService.getAll({ search: searchQuery.trim(), limit: 6 });
        const data = response?.data || response;
        const products = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.products)
            ? data.products
            : Array.isArray(data?.data)
              ? data.data
              : Array.isArray(data)
                ? data
                : [];

        const formattedSuggestions = products.map((product) => ({
          id: product._id || product.id,
          text: product.title,
          cat: product.category,
          imageSrc: product.imageSrc,
        }));

        searchCache.set(trimmedQuery, formattedSuggestions);

        if (active) {
          setSuggestions(formattedSuggestions);
        }
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    let active = true;

    const loadSearchSeeds = async () => {
      if (cachedTrendingSearches && cachedPopularCategories) {
        setTrendingSearches(cachedTrendingSearches);
        setPopularCategories(cachedPopularCategories);
        return;
      }

      if (isFetchingSeeds && seedFetchPromise) {
        try {
          const result = await seedFetchPromise;
          if (active && result) {
            setTrendingSearches(result.trending);
            setPopularCategories(result.categories);
          }
        } catch {
          // ignore
        }
        return;
      }

      isFetchingSeeds = true;
      seedFetchPromise = (async () => {
        try {
          const [featuredResponse, categoriesResponse] = await Promise.all([
            productService.getAll({ featured: "true", limit: 4 }),
            productService.getCategories(),
          ]);
          const featuredData = featuredResponse?.data || featuredResponse;
          const featuredProducts = Array.isArray(featuredData?.items)
            ? featuredData.items
            : Array.isArray(featuredData?.data)
              ? featuredData.data
              : [];
          const categories = categoriesResponse?.data || categoriesResponse || [];

          const trending = featuredProducts.map((product) => product.title).filter(Boolean).slice(0, 4);
          const cats = categories.filter((category) => category !== "All").slice(0, 4);
          
          cachedTrendingSearches = trending;
          cachedPopularCategories = cats;
          return { trending, categories: cats };
        } catch {
          cachedTrendingSearches = [];
          cachedPopularCategories = [];
          return { trending: [], categories: [] };
        } finally {
          isFetchingSeeds = false;
        }
      })();

      try {
        const result = await seedFetchPromise;
        if (active && result) {
          setTrendingSearches(result.trending);
          setPopularCategories(result.categories);
        }
      } catch {
        if (active) {
          setTrendingSearches([]);
          setPopularCategories([]);
        }
      }
    };

    loadSearchSeeds();

    return () => {
      active = false;
    };
  }, []);

  // Handle escape key to close search overlay
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isSearchOpen]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        e.preventDefault();
        const selectedItem = suggestions[focusedIndex];
        setIsSearchOpen(false);
        setSearchQuery("");
        navigate(selectedItem.id ? `/product/${selectedItem.id}` : `/collections?search=${encodeURIComponent(selectedItem.text)}`);
      } else if (searchQuery.trim()) {
        e.preventDefault();
        const query = searchQuery.trim();
        setIsSearchOpen(false);
        setSearchQuery("");
        navigate(`/collections?search=${encodeURIComponent(query)}`);
      }
    } else if (e.key === "ArrowDown") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % suggestions.length);
      }
    } else if (e.key === "ArrowUp") {
      if (suggestions.length > 0) {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      }
    }
  };

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
      document.body.style.overflow = "hidden";

      const focusableElements = mobileMenuRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleKeyDown = (e) => {
        if (e.key === "Escape") setIsOpen(false);
        if (e.key === "Tab" && focusableElements) {
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
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
        if (mobileTriggerRef.current) {
          mobileTriggerRef.current.focus();
        }
      };
    }
  }, [isOpen, isMobile]);

  // Premium glass floating behavior on scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const dbLinks = navigation?.mainLinks?.filter(link => link.isVisible).map(link => ({
    label: link.label,
    href: link.href || link.link
  })) || [];

  const hasOurStory = dbLinks.some(link => link.label.toLowerCase() === "our story" || link.href === "/about");
  if (!hasOurStory && dbLinks.length > 0) {
    dbLinks.unshift({ label: "Our Story", href: "/about" });
  }

  const navLinks = [
    { label: "Home", href: "/", mobileOnly: true },
    ...(dbLinks.length > 0 ? dbLinks : [
      { label: "Our Story", href: "/about" },
      { label: "Shop", href: "/collections" },
      { label: "Events", href: "/events" },
      { label: "Gallery", href: "/gallery" },
      { label: "Custom Orders", href: "/custom-orders" },
    ])
  ];

  const isActive = (href) => location.pathname === href;

  const isImmersive = false;

  return (
    <>
      <nav
        className={`top-navbar fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled
            ? "bg-surface/95 backdrop-blur-2xl border-b border-primary-container/20 py-2 shadow-md shadow-black/5"
            : isImmersive
              ? "bg-white/10 backdrop-blur-md py-3.5 border border-white/20 mt-3.5 mx-auto max-w-[95%] lg:max-w-[720px] rounded-full text-white shadow-2xl"
: "bg-surface/90 backdrop-blur-md py-2.5 border-b border-outline-variant/10 shadow-2xs"
        }`}
      >
        <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex items-center justify-between w-full gap-4">
            {/* Exquisite Boutique Brand Logo */}
            <div className="flex-shrink-0 flex justify-start min-w-0">
              <Link to="/" className="group flex items-center gap-2.5 md:gap-4 shrink-0">
                {navigation?.logo?.image ? (
                  <img
                    src={navigation.logo.image}
                    alt={logoText}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover shadow-sm transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="relative w-8 h-8 md:w-10 md:h-10 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    {/* Layered backgrounds for logo stamp */}
                    <div className="absolute inset-0 rounded-full bg-[#d4af37]/10" />
                    <div className="absolute inset-0.5 rounded-full border border-[#d4af37]/30" />

                    {/* Core Icon Container */}
                    <div className="relative w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-[#1c1a17] border border-[#d4af37] shadow-lg shadow-black/30">
                      <span className="font-display font-medium text-[13px] md:text-[16px] text-[#d4af37] tracking-tight">
                        {firstWord[0]}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col justify-center">
                  {/* Desktop Layout: Side-by-side */}
                  <div className="hidden md:flex items-center gap-1">
                    <span className="font-display text-[20px] font-bold tracking-[0.03em] text-on-surface uppercase">
                      {firstWord}
                    </span>
                    <span className="font-display text-[20px] font-bold tracking-[0.03em] text-primary uppercase">
                      {restWords ? ` ${restWords}` : ""}
                    </span>
                  </div>

                  {/* Mobile Layout: Stacked */}
                  <div className="flex md:hidden flex-col leading-none">
                    <span className="font-display text-[14px] font-bold tracking-[0.03em] text-on-surface uppercase">
                      {firstWord}
                    </span>
                    {restWords && (
                      <span className="font-display text-[8px] font-bold tracking-[0.15em] text-primary uppercase mt-0.5 whitespace-nowrap">
                        {restWords}
                      </span>
                    )}
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
                              ? isImmersive && !scrolled
                                ? "text-white bg-white/10"
                                : "text-primary bg-primary-container/10"
                              : isImmersive && !scrolled
                                ? "text-white/80 hover:text-white hover:bg-white/5"
                                : "text-on-surface hover:text-primary hover:bg-surface-container-low"
                          }`}
                          to={link.href}
                        >
                          {link.label}
                          {active && (
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
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
                          ? isImmersive && !scrolled
                            ? "text-white bg-white/10"
                            : "text-primary bg-primary-container/10"
                          : isImmersive && !scrolled
                            ? "text-white/80 hover:text-white"
                            : "text-on-surface hover:text-primary"
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
                          ? isImmersive && !scrolled
                            ? "text-white bg-white/10"
                            : "text-primary bg-primary-container/10"
                          : isImmersive && !scrolled
                            ? "text-white/80 hover:text-white"
                            : "text-on-surface hover:text-primary"
                      }`}
                    >
                      More
                      <span
                        className={`material-symbols-outlined text-[18px] transition-transform duration-300 ${isMoreOpen ? "rotate-180" : ""}`}
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
                  onClick={() => setIsSearchOpen(true)}
                  className="text-on-surface hover:text-primary transition-all duration-300 hover:scale-110 flex items-center justify-center w-9 h-9 rounded-full hover:bg-primary-container/10 relative group font-bold cursor-pointer min-h-0"
                  aria-label="Search Catalog"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    search
                  </span>
                </button>

                <Link
                  to="/wishlist"
                  className="text-on-surface hover:text-primary transition-all duration-300 hover:scale-110 hidden md:flex items-center justify-center w-9 h-9 rounded-full hover:bg-primary-container/10 relative group font-bold"
                  aria-label="View Wishlist"
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    aria-hidden="true"
                  >
                    favorite
                  </span>
                </Link>

                <button
                  id="cart-trigger-desktop"
                  onClick={() => setIsCartOpen(true)}
                  className="text-on-surface hover:text-[#d4af37] transition-all duration-300 hover:scale-110 flex items-center justify-center w-9 h-9 rounded-full hover:bg-[#d4af37]/10 relative group font-bold cursor-pointer min-h-0"
                  aria-label="View Shopping Bag"
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    aria-hidden="true"
                  >
                    shopping_bag
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
                    className="text-on-surface hover:text-primary transition-all duration-300 hover:scale-110 hidden md:flex items-center justify-center w-9 h-9 rounded-full hover:bg-primary-container/10 relative group font-bold cursor-pointer min-h-0"
                    aria-label="User Account"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      login
                    </span>
                  </button>
                ) : (
                  <div className="relative hidden md:block">
                    <button
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      className="text-on-surface hover:text-primary transition-all duration-300 hover:scale-110 flex items-center justify-center w-9 h-9 rounded-full bg-primary-container/10 border border-primary/25 relative group font-bold cursor-pointer overflow-hidden min-h-0"
                      aria-label="User Dropdown"
                    >
                      <span className="text-[10px] text-primary uppercase font-bold tracking-wider">
                        {user?.name?.substring(0, 2) || user?.email?.substring(0, 2) || "U"}
                      </span>
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
                                {user?.name || "Customer"}
                              </p>
                              <p className="text-[9px] text-on-surface-variant/50 truncate font-light tracking-wide">
                                {user?.email}
                              </p>
                            </div>

                            {(user?.role === 'admin' || user?.role === 'manager') && (
                              <Link
                                to="/admin"
                                onClick={() => setIsProfileDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10 transition-colors font-bold border-b border-outline-variant/10 mb-1.5 pb-2"
                              >
                                <span className="material-symbols-outlined text-[15px]">shield_person</span>
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
                              <span className="material-symbols-outlined text-[15px]">package_2</span>
                              <span>Orders</span>
                            </Link>

                            <Link
                              to="/dashboard?tab=addresses"
                              onClick={() => setIsProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wider text-on-surface hover:bg-primary/5 hover:text-primary transition-colors font-bold"
                            >
                              <span className="material-symbols-outlined text-[15px]">location_on</span>
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
                onClick={() => setIsOpen(true)}
                className="md:hidden flex flex-col items-center justify-center gap-[4.5px] w-9 h-9 rounded-full hover:bg-primary-container/10 hover:text-primary transition-all duration-300 hover:scale-110 cursor-pointer text-on-surface min-h-0"
                aria-label="Open navigation menu"
                aria-expanded={isOpen}
                aria-controls="mobile-menu-drawer"
              >
                <span className="w-5 h-[1.5px] bg-current" />
                <span className="w-5 h-[1.5px] bg-current" />
                <span className="w-5 h-[1.5px] bg-current" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Mobile Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-[110] lg:hidden"
            />
            <motion.div
              ref={mobileMenuRef}
              id="mobile-menu-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-[80%] max-w-sm bg-surface-bright z-[120] lg:hidden p-6 md:p-8 flex flex-col shadow-2xl border-l border-outline-variant/10 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-outline-variant/10">
                <div className="flex items-center gap-3">
                  {navigation?.logo?.image ? (
                    <img
                      src={navigation.logo.image}
                      alt={logoText}
                      className="w-10 h-10 rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-on-surface-variant flex items-center justify-center shadow-lg border border-white/5">
                      <span className="font-display font-bold text-[14px] text-white">
                        {firstWord[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col justify-center leading-none">
                    <span className="font-display text-[18px] md:text-[20px] text-on-surface font-bold tracking-[0.05em] uppercase">
                      {firstWord}
                    </span>
                    <span className="font-display text-[10px] md:text-[11px] text-primary font-bold tracking-[0.15em] uppercase mt-0.5 whitespace-nowrap">
                      {restWords}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="relative w-10 h-10 flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer group/close"
                  aria-label="Close menu"
                >
                  <span className="absolute w-6 h-[1.2px] bg-current rotate-45 transition-transform group-hover/close:rotate-[135deg]" />
                  <span className="absolute w-6 h-[1.2px] bg-current -rotate-45 transition-transform group-hover/close:-rotate-[45deg]" />
                </button>
              </div>

              <span className="font-label-sm text-[9px] uppercase tracking-[0.3em] text-primary mb-3 block font-bold">
                Navigation
              </span>

              <ul className="space-y-1.5 mb-6">
                {navLinks.map((link, idx) => {
                  const active = isActive(link.href);
                  return (
                    <li key={idx}>
                      <Link
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center justify-between font-display text-[14px] md:text-[17px] py-1.5 rounded-lg px-3 transition-all font-bold ${
                          active
                            ? "text-primary bg-primary-container/10 font-bold translate-x-2"
                            : "text-on-surface hover:text-primary hover:bg-surface/50 font-bold"
                        }`}
                        to={link.href}
                      >
                        {link.label}
                        <span className="material-symbols-outlined text-[13px] text-on-surface/50 font-bold">
                          chevron_right
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto pt-4 border-t border-outline-variant/10">
                <span className="font-label-sm text-[9px] uppercase tracking-[0.3em] text-on-surface mb-2.5 block font-bold">
                  Account & Collections
                </span>
                <div className="grid grid-cols-2 gap-2 pb-4">
                  <Link
                    to="/wishlist"
                    onClick={() => setIsOpen(false)}
                    className="flex flex-col items-center justify-center py-2 bg-surface rounded-lg hover:bg-primary-container/10 text-on-surface hover:text-primary transition-all shadow-2xs font-bold"
                  >
                    <span className="material-symbols-outlined text-[15px] mb-0.5 font-bold">
                      favorite
                    </span>
                    <span className="font-label-sm text-[9px] uppercase tracking-wider font-bold">
                      Wishlist
                    </span>
                  </Link>
                  <button
                    id="cart-trigger-mobile"
                    onClick={() => {
                      setIsOpen(false);
                      setIsCartOpen(true);
                    }}
                    className="flex flex-col items-center justify-center py-2 bg-surface rounded-lg hover:bg-primary-container/10 text-on-surface hover:text-primary transition-all shadow-2xs font-bold relative cursor-pointer"
                  >
                    <div className="relative p-0.5">
                      <span className="material-symbols-outlined text-[16px] block font-bold">
                        shopping_bag
                      </span>
                      {cartCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-[14px] h-[14px] bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-md border border-surface">
                          {cartCount}
                        </span>
                      )}
                    </div>
                    <span className="font-label-sm text-[9px] uppercase tracking-wider font-bold">
                      Bag
                    </span>
                  </button>

                  {isAuthenticated ? (
                    <>
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <Link
                          to="/admin"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-center gap-2 py-2.5 bg-primary/10 border border-primary/25 rounded-lg text-primary hover:bg-primary/20 transition-all shadow-2xs font-bold col-span-2 animate-pulse-subtle"
                        >
                          <span className="material-symbols-outlined text-[15px] font-bold">
                            shield_person
                          </span>
                          <span className="font-label-sm text-[9px] uppercase tracking-wider font-bold">
                            Admin Portal
                          </span>
                        </Link>
                      )}
                      <Link
                        to="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="flex flex-col items-center justify-center py-2 bg-surface rounded-lg hover:bg-primary-container/10 text-on-surface hover:text-primary transition-all shadow-2xs font-bold"
                      >
                        <span className="material-symbols-outlined text-[15px] mb-0.5 font-bold">
                          person
                        </span>
                        <span className="font-label-sm text-[9px] uppercase tracking-wider font-bold">
                          Profile
                        </span>
                      </Link>
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          logout();
                        }}
                        className="flex flex-col items-center justify-center py-2 bg-surface rounded-lg hover:bg-error/5 text-error transition-all shadow-2xs font-bold cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px] mb-0.5 font-bold">
                          logout
                        </span>
                        <span className="font-label-sm text-[9px] uppercase tracking-wider font-bold">
                          Sign Out
                        </span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        openAuthModal();
                      }}
                      className="flex flex-col items-center justify-center py-2.5 bg-surface rounded-lg hover:bg-primary-container/10 text-on-surface hover:text-primary transition-all shadow-2xs font-bold col-span-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px] mb-0.5 font-bold">
                        login
                      </span>
                      <span className="font-label-sm text-[9px] uppercase tracking-wider font-bold">
                        Sign In
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── PREMIUM GLASSMORPHIC SEARCH OVERLAY ─── */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex flex-col justify-start pt-16 md:pt-24 px-4"
          >
            <div className="max-w-2xl w-full mx-auto bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-primary/30 overflow-hidden p-6 md:p-8 flex flex-col">
              {/* Search Bar Input */}
              <div className="flex items-center justify-between gap-3 border-b border-outline-variant/10 pb-4">
                <div className="flex items-center gap-2 md:gap-3 flex-1 bg-surface-bright border border-outline-variant/30 rounded-full px-4 md:px-5 py-2 md:py-2.5">
                  <span className="material-symbols-outlined text-primary text-[18px] md:text-[20px] shrink-0">search</span>
                  <input
                    id="predictive-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search collections..."
                    aria-label="Search catalog items"
                    className="flex-1 bg-transparent border-none outline-none focus:ring-0 focus:outline-none focus:border-none text-[13px] md:text-[14px] text-on-surface placeholder-on-surface-variant/40 min-w-0"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search query"
                      className="text-on-surface-variant/60 hover:text-primary text-[14px] px-1 font-mono cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }}
                  aria-label="Close search overlay"
                  className="w-9 h-9 md:w-10 md:h-10 shrink-0 aspect-square bg-on-surface hover:bg-primary text-surface rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px] md:text-[18px] font-bold">close</span>
                </button>
              </div>

              {/* Suggestions list & trending */}
              <div className="flex-1 mt-6 overflow-y-auto space-y-6 min-h-[220px] scrollbar-none">
                {searchLoading ? (
                  <div className="space-y-2.5">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="h-14 rounded-2xl bg-surface-bright animate-pulse" />
                    ))}
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80">Matching Masterpieces:</span>
                    <div className="flex flex-col gap-2">
                      {suggestions.map((item, idx) => (
                        <Link
                          key={item.id || idx}
                          to={item.id ? `/product/${item.id}` : `/collections?search=${encodeURIComponent(item.text)}`}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all group ${
                            focusedIndex === idx
                              ? "bg-primary/10 border-primary/40 ring-2 ring-primary"
                              : "bg-surface-bright border-outline-variant/10 hover:border-primary/20 hover:bg-primary/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                            <span className="text-[12.5px] font-bold text-on-surface group-hover:text-primary transition-colors">{item.text}</span>
                          </div>
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-on-surface-variant/60 bg-white border border-outline-variant/10 px-2 py-0.5 rounded-full">{item.cat}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="text-center py-8 text-on-surface-variant space-y-2">
                    <span className="material-symbols-outlined text-[32px] text-on-surface/20 block mb-1">search_off</span>
                    <p className="text-[13px] font-bold text-on-surface">No Match Found</p>
                    <p className="text-[11px] text-on-surface-variant/70">Try searching for "Backdrop", "Haldi", "Tray" or "Pooja".</p>
                  </div>
                ) : (
                  <>
                    {trendingSearches.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5 font-medium">
                          <span className="material-symbols-outlined text-[15px] text-primary">trending_up</span>
                          Trending Custom Curations
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {trendingSearches.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSearchQuery(item)}
                              className="px-3.5 py-1.5 bg-surface-bright border border-outline-variant/20 hover:border-primary hover:text-primary text-on-surface text-[11px] rounded-full transition-all cursor-pointer font-bold"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Popular Categories Grid */}
                    {popularCategories.length > 0 && <div className="space-y-3 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block font-medium">Popular Collections</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {popularCategories.map((category, idx) => (
                          <Link
                            key={idx}
                            to={`/collections?category=${encodeURIComponent(category)}`}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery("");
                            }}
                            className="p-3.5 bg-surface-bright border border-outline-variant/20 hover:border-primary rounded-2xl text-center flex flex-col items-center gap-1.5 transition-all group"
                          >
                            <span className="material-symbols-outlined text-primary text-[22px] group-hover:scale-110 transition-transform">category</span>
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface">{category}</span>
                          </Link>
                        ))}
                      </div>
                    </div>}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
