import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

import { useCart } from '../context/CartContext';

import { couponService } from '../services/domainServices';
import toast from 'react-hot-toast';
import { useProducts, useCategories, useDynamicFilters } from '../hooks/useProductQueries';
import { useVisualSearch } from '../hooks/useVisualSearch';
import { useWebsiteContent } from '../hooks/useWebsiteContent';
import { useScrollDirection } from '../hooks/useScrollDirection';
import { useMediaQuery } from '../hooks/useMediaQuery';
import '../styles/visual-search.css';

import logger from '../utils/logger';
import { persistentStorage } from '../utils/persistentStorage';

export function ProductListing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setClaimedCoupon } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const visualSearch = useVisualSearch();

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const videoRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleVisualFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) visualSearch.handleImageSelect(file, 'upload');
    },
    [visualSearch],
  );

  const handleVisualCameraCapture = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) visualSearch.handleImageSelect(file, 'camera');
    },
    [visualSearch],
  );

  const handleVisualDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleVisualDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleVisualDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleVisualDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        visualSearch.handleImageSelect(file, 'drag_drop');
      }
    },
    [visualSearch],
  );

  const startCamera = useCallback(async () => {
    const isMobileDevice =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    if (isMobileDevice || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1024 }, height: { ideal: 1024 } },
      });
      setCameraStream(stream);
      setShowCamera(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch (err) {
      cameraInputRef.current?.click();
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          if (cameraStream) {
            cameraStream.getTracks().forEach((t) => t.stop());
            setCameraStream(null);
          }
          setShowCamera(false);
          visualSearch.handleImageSelect(file, 'camera');
        }
      },
      'image/jpeg',
      0.9,
    );
  }, [cameraStream, visualSearch]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  }, [cameraStream]);

  // Clean up camera on unmount/close
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  // Handle visual parameter from URL and sessionStorage
  useEffect(() => {
    const isVisualSearchTriggered = searchParams.get('visual') === 'true';
    const pendingImage = sessionStorage.getItem('pending_visual_search_image');

    if (isVisualSearchTriggered || pendingImage) {
      // Helper to convert base64 to file
      const dataURLtoFile = (dataurl, filename) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
      };

      visualSearch.open();

      if (pendingImage) {
        try {
          const file = dataURLtoFile(pendingImage, 'visual-search.jpg');
          visualSearch.handleImageSelect(file, 'upload');
        } catch (err) {
          logger.error('Failed to convert base64 visual search image', err);
        }
        sessionStorage.removeItem('pending_visual_search_image');
      }

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('visual');
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, visualSearch, setSearchParams]);

  // Clear textual filters in URL when visual search results are loaded
  useEffect(() => {
    if (visualSearch.results) {
      setCurrentPage(1);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          let changed = false;
          if (next.has('search')) {
            next.delete('search');
            changed = true;
          }
          if (next.has('category')) {
            next.delete('category');
            changed = true;
          }
          if (next.has('page')) {
            next.delete('page');
            changed = true;
          }
          return changed ? next : prev;
        },
        { replace: true },
      );
      setSearchQuery('');
      setDebouncedSearch('');
      setActiveCategory('All');
    }
  }, [visualSearch.results, setSearchParams]);

  // Reset visual search results if the user performs a new textual search or switches category
  useEffect(() => {
    const s = searchParams.get('search');
    const cat = searchParams.get('category');
    if ((s || cat) && visualSearch.results) {
      visualSearch.reset();
    }
  }, [searchParams, visualSearch]);

  // Combine visual search results
  const unifiedResults = useMemo(() => {
    if (!visualSearch.results) return [];
    const items = [];
    const seen = new Set();

    if (visualSearch.results.bestMatch) {
      items.push({ ...visualSearch.results.bestMatch, _isExactMatch: true });
      seen.add(visualSearch.results.bestMatch.id || visualSearch.results.bestMatch._id);
    }

    if (visualSearch.results.similarProducts) {
      visualSearch.results.similarProducts.forEach((p) => {
        const id = p.id || p._id;
        if (!seen.has(id)) {
          items.push(p);
          seen.add(id);
        }
      });
    }

    if (visualSearch.results.relatedProducts) {
      visualSearch.results.relatedProducts.forEach((p) => {
        const id = p.id || p._id;
        if (!seen.has(id)) {
          items.push(p);
          seen.add(id);
        }
      });
    }
    return items;
  }, [visualSearch.results]);
  const categoryParam = searchParams.get('category') || 'All';
  const searchParam = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState(() => {
    return persistentStorage.getItem('siri_product_sort', { fallback: 'Popularity' });
  });

  useEffect(() => {
    persistentStorage.setItem('siri_product_sort', sortBy);
  }, [sortBy]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(0);
  const [isStuck, setIsStuck] = useState(false);
  const navRef = React.useRef(null);
  const [activeProduct, setActiveProduct] = useState(null);

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { scrollDirection, isAtTop } = useScrollDirection();
  const isNavbarHidden = !isAtTop && scrollDirection === 'down' && !isMobile;
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(pageParam);

  useEffect(() => {
    const s = searchParams.get('search') || '';
    setActiveCategory(searchParams.get('category') || 'All');
    setCurrentPage(parseInt(searchParams.get('page') || '1', 10));

    // Only update internal search state if the URL changed from outside
    // (e.g. from the Intelligent Search Overlay)
    if (s !== searchQuery && s !== debouncedSearch) {
      setSearchQuery(s);
      setDebouncedSearch(s);
    }
  }, [searchParams]);

  // Reset pagination page to 1 when visual search results are loaded
  useEffect(() => {
    if (visualSearch.results) {
      setCurrentPage(1);
    }
  }, [visualSearch.results]);

  // Auto-scroll on mobile/tablet to the top of the page when search query changes (banners are hidden)
  useEffect(() => {
    const hasSearch = searchParams.get('search');

    // Do not scroll if the user is actively typing in the listing page's search input box (prevents flickering)
    const isTypingInPageSearch =
      document.activeElement?.getAttribute('placeholder') === 'Search masterworks...';

    if (isMobile && hasSearch && !isTypingInPageSearch) {
      const timer = setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams, isMobile]);

  const [promoCoupon, setPromoCoupon] = useState(null);
  const [countdown, setCountdown] = useState({ D: '02', H: '14', M: '42', S: '00' });

  useEffect(() => {
    couponService
      .getAll()
      .then((res) => {
        if (res.success && res.data) {
          const list = res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
          const activeList = list.filter(
            (c) =>
              c.isActive &&
              new Date() <= new Date(c.expiryDate) &&
              c.displayLocations &&
              c.displayLocations.includes('banner'),
          );
          if (activeList.length > 0) {
            activeList.sort((a, b) => b.discountValue - a.discountValue);
            setPromoCoupon(activeList[0]);
          } else {
            setPromoCoupon(null);
          }
        }
      })
      .catch((err) => {
        logger.warn('Failed to fetch coupons for promo banner', err);
      });
  }, []);

  useEffect(() => {
    const targetDate = promoCoupon
      ? new Date(promoCoupon.expiryDate)
      : (() => {
          const tomorrow = new Date();
          tomorrow.setHours(23, 59, 59, 999);
          return tomorrow;
        })();

    const interval = setInterval(() => {
      const now = new Date();
      const diff = targetDate - now;

      if (diff <= 0) {
        setCountdown({ D: '00', H: '00', M: '00', S: '00' });
        clearInterval(interval);
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        setCountdown({
          D: String(d).padStart(2, '0'),
          H: String(h).padStart(2, '0'),
          M: String(m).padStart(2, '0'),
          S: String(s).padStart(2, '0'),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [promoCoupon]);

  const handleClaimOffer = () => {
    const code = promoCoupon ? promoCoupon.code : 'SIRI40';
    navigator.clipboard.writeText(code);
    setClaimedCoupon(code);
    toast.success(
      (t) => (
        <div className="flex flex-col gap-1 p-1">
          <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-green-700">
              local_activity
            </span>
            Coupon claimed successfully!
          </span>
          <span className="text-[10px] text-on-surface-variant font-mono">
            Code "<strong className="text-primary font-bold">{code}</strong>" copied to clipboard.
          </span>
          <span className="text-[10px] text-green-800 font-semibold mt-1">
            🎟️ We will automatically apply this coupon at checkout!
          </span>
        </div>
      ),
      { duration: 5000, position: 'bottom-right' },
    );
  };

  const websiteContent = useWebsiteContent();
  const shopContent = websiteContent?.shopPage || {
    hero: {
      title: 'Heritage Collection',
      subtitle: 'Handcrafted Decor',
      description: 'Handcrafted luxury event decor blending tradition.',
      backgroundImage:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC6Cy1TlK9jjSUwKlKlXEL_AKlV3Ff5c2VdyViS7GGN3dgR1UB3SgmAto5fKc__pxujkfieY8wFl8MLAhbv7fZHW-oIWdXX0Xqg7SaMj5Szj9w6aGsuChZguzRLBppvcE_7OyVd9N7Ldchm0izPUhXOQGyYaQUsd43cUxBLr5ift2YUa0I_rr4_34hldd6L-V9MeNbxa-BUn2gvZq7JQypKg2Wl6-8TPta6D_ZooOmuUfcwSJJUjNe8-voUHsu7mBKM_CeD9YFd204',
    },
    promo: {
      title: '',
      highlightText: 'Up to 40% Off',
      description: 'Exclusive handcrafted seasonal collections. Limited stock available.',
      backgroundImage:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuArmLX9xra0m1GxmrjS8xH0pXUpTrKa18fhO9gW8NY160WAZ5MfXc157OoFlIivj6H_WT6aMZVWNjLvqixrhrBG2ryiAU15p_ZC42em1Dzj1w8ukwUFzndsHouARkcvS5wRRDyDVaOaIHwbiV5vUgkbNfc6zFl8XAYOQBERj5JYLZZOPpjaoiUd4B_6zT7iQQYhbyHU5Q5geiCAvvn2hga0_UsahQbwxSy3eLhHFEKPHc897yWc_fLyCPjkZ0wcfIcXDcMrPumI35w',
      badgeText: 'Limited Time Offer',
      statusText: 'Ends Soon',
      ctaText: 'Claim Offer',
      ctaLink: 'Festive Decor',
    },
  };

  const [filters, setFilters] = useState(() => {
    const saved = persistentStorage.getItem('siri_product_filters');
    if (saved && typeof saved === 'object') {
      return saved;
    }
    return {};
  });

  useEffect(() => {
    persistentStorage.setItem('siri_product_filters', filters);
  }, [filters]);

  const sortMap = {
    Popularity: 'rating',
    'Price: Low to High': 'price_asc',
    'Price: High to Low': 'price_desc',
    'New Arrivals': 'newest',
  };

  // Debounced search to prevent API calls on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const currentSearchInUrl = searchParams.get('search') || '';
    if (debouncedSearch !== currentSearchInUrl) {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (debouncedSearch) {
            params.set('search', debouncedSearch);
          } else {
            params.delete('search');
          }
          params.delete('page');
          params.delete('spellcheck');
          return params;
        },
        { replace: true },
      );
    }
  }, [debouncedSearch, setSearchParams, searchParams]);

  const queryParams = {
    page: currentPage,
    limit: 16,
    search: debouncedSearch,
    category: activeCategory !== 'All' ? activeCategory : undefined,
    sort: sortMap[sortBy] || 'newest',
    spellcheck: searchParams.get('spellcheck') || undefined,
  };

  if (filters.priceRange && Array.isArray(filters.priceRange) && filters.priceRange.length > 0) {
    let min = Infinity;
    let max = -Infinity;
    filters.priceRange.forEach((range) => {
      const parts = range.split('-');
      const currentMin = parseInt(parts[0], 10) || 0;
      const currentMax = parts[1] ? parseInt(parts[1], 10) : Infinity;
      if (currentMin < min) min = currentMin;
      if (currentMax > max) max = currentMax;
    });
    if (min !== Infinity) queryParams.minPrice = min;
    if (max !== -Infinity && max !== Infinity) queryParams.maxPrice = max;
  }

  // Inject all other dynamic filters into queryParams
  Object.keys(filters).forEach((key) => {
    if (key !== 'priceRange' && Array.isArray(filters[key]) && filters[key].length > 0) {
      queryParams[key] = filters[key].join(',');
    }
  });

  const { data: productsData, isLoading: loading, isFetching, isError } = useProducts(queryParams);
  const { data: filterGroups = [] } = useDynamicFilters(queryParams);

  useEffect(() => {
    if (isError) {
      toast.error('Failed to load products.');
    }
  }, [isError]);

  const totalPages = visualSearch.results ? 1 : productsData?.totalPages || 1;
  const totalCount = visualSearch.results ? unifiedResults.length : productsData?.totalCount || 0;

  // Fetch categories dynamically from API via TanStack Query
  const { data: categoriesData = [] } = useCategories();
  const categories = useMemo(() => {
    return ['All', ...categoriesData];
  }, [categoriesData]);

  useEffect(() => {
    const measure = () => {
      const topNav = document.querySelector('.top-navbar');
      let currentNavHeight = navbarHeight;
      if (topNav) {
        currentNavHeight = topNav.getBoundingClientRect().height;
        setNavbarHeight(currentNavHeight);
      }

      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        const topThreshold = parseFloat(navRef.current.style.top) || 0;
        // Simply check if the element has reached its sticky top position
        setIsStuck(rect.top <= topThreshold + 1);
      }
    };
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    measure();
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [navbarHeight]);

  useEffect(() => {
    if (isFilterOpen) {
      document.body.classList.add('filters-open');
    } else {
      document.body.classList.remove('filters-open');
    }
    return () => document.body.classList.remove('filters-open');
  }, [isFilterOpen]);

  // Data is now fetched using React Query automatically when dependencies change.

  const products = useMemo(() => {
    if (visualSearch.results) return unifiedResults;
    return productsData?.data || productsData?.products || [];
  }, [visualSearch.results, unifiedResults, productsData]);

  const openQuickView = React.useCallback((e, product) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveProduct(product);
    setIsQuickViewOpen(true);
  }, []);

  const handleCategorySelect = React.useCallback(
    (cat) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (cat === 'All') {
          params.delete('category');
        } else {
          params.set('category', cat);
        }
        params.delete('page');
        return params;
      });
      setActiveCategory(cat);
      setCurrentPage(1);
      setTimeout(() => {
        const element = document.getElementById('artisan-collection');
        if (element) {
          const yOffset = -80;
          const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 50);
    },
    [setSearchParams],
  );

  const toggleFilter = React.useCallback((type, value) => {
    setFilters((prev) => {
      const current = prev[type] || [];
      const next = current.includes(value)
        ? current.filter((i) => i !== value)
        : [...current, value];

      if (next.length === 0) {
        const newFilters = { ...prev };
        delete newFilters[type];
        return newFilters;
      }
      return { ...prev, [type]: next };
    });
  }, []);

  const clearAllFilters = React.useCallback(() => {
    setFilters({});
    setActiveCategory('All');
    setSearchQuery('');
    setSearchParams({});
    if (visualSearch.results) {
      visualSearch.reset();
    }
  }, [setSearchParams, visualSearch]);

  const { cartCount, setIsCartOpen } = useCart();

  return (
    <div className="bg-surface min-h-screen">
      <SEO
        title="Heritage Collection | Premium Handcrafted Indian Decor"
        description="Explore Siri Arts & Crafts' exclusive e-commerce boutique of traditional Telugu wedding presentation trays, custom pooja accessories, and handcrafted decors."
      />
      {/* Editorial Hero */}
      {!(isMobile && searchParam) && (
        <section className="relative min-h-[320px] md:h-[70vh] flex items-center overflow-hidden bg-on-surface-variant">
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <CloudinaryImage
              src={shopContent.hero.backgroundImage}
              alt="Hero Background"
              className="w-full h-full object-cover"
              containerClassName="w-full h-full"
              loading="eager"
              eager={true}
              fetchPriority="high"
              width={1600}
              height={800}
              sizes="100vw"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-surface" />

          {/* Top-right decorative art anchor */}
          <MandalaArtDecor
            variant={2}
            size={500}
            className="-top-20 -right-20 hidden lg:block"
            opacity={0.12}
            spinDuration={240}
          />
          <MandalaArtDecor
            variant={2}
            size={250}
            className="-top-10 -right-10 lg:hidden"
            opacity={0.15}
            spinDuration={240}
          />

          <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop w-full relative z-10 text-center">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-label-sm text-surface tracking-[0.4em] uppercase mb-6 block"
            >
              {shopContent.hero.subtitle}
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-headline-xl text-[32px] sm:text-[42px] md:text-[56px] lg:text-[72px] text-surface mb-4 md:mb-8 text-gold leading-tight"
            >
              {shopContent.hero.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="font-body-lg text-[13px] md:text-[16px] lg:text-[18px] text-surface/80 max-w-xl mx-auto font-light leading-relaxed px-4"
            >
              {shopContent.hero.description}
            </motion.p>
          </div>
        </section>
      )}

      {/* Sticky Search / Filter / Category Navigation Bar */}
      <nav
        ref={navRef}
        className={`sticky ${isMobile && searchParam ? 'mt-6' : '-mt-12 md:-mt-16'} mb-4 md:mb-6 transition-all duration-300 ${isStuck ? 'px-0' : 'px-3 md:px-margin-desktop'}`}
        style={{ top: isNavbarHidden ? '0px' : `${navbarHeight}px`, zIndex: 49 }}
      >
        <div
          className={`transition-all duration-300 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 pointer-events-auto mx-auto ${
            isStuck
              ? 'bg-white/90 backdrop-blur-xl rounded-none border-b border-black/5 shadow-sm py-3 md:py-4 lg:py-2 px-3 md:px-margin-desktop w-full max-w-none'
              : 'bg-transparent border-none shadow-none rounded-[2rem] px-2 py-3 md:p-4 lg:p-2 w-full max-w-max-width'
          }`}
        >
          {/* Search Bar & Mobile Filter Toggle */}
          <div className="w-full lg:w-72 xl:w-80 flex items-center gap-1.5 shrink-0">
            <div className="flex-1 h-11 lg:h-9">
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onCameraClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open-global-search', { detail: { mode: 'visual' } }),
                  );
                }}
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open-global-search', {
                      detail: { mode: 'text', query: searchQuery },
                    }),
                  );
                }}
                placeholder="Search masterworks..."
                className="w-full !h-full !rounded-full bg-surface-bright/90 backdrop-blur-md shadow-sm !px-3 lg:!px-4 text-[13px] lg:text-[12px] flex items-center border border-outline-variant/30 outline-none focus:outline-none"
              />
            </div>
            {/* Mobile/Tablet Filter Toggle */}
            <button
              onClick={() => setIsFilterOpen(true)}
              aria-label="Open filters"
              className="lg:hidden flex items-center justify-center w-11 h-11 rounded-full bg-on-surface text-surface shadow-md transition-all active:scale-[0.98] active:opacity-90 shrink-0 outline-none focus:outline-none focus-visible:outline-none"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>

          {/* Desktop-Only Layout Integration (Tabs + Sort) */}
          <div className="hidden lg:flex items-center justify-between gap-6 flex-1 min-w-0">
            {/* Category Tabs Area - Fluid scrollable area */}
            <div className="flex-1 overflow-hidden flex justify-start lg:justify-center">
              <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategorySelect}
              />
            </div>

            {/* Actions Group: Sort (Right-aligned) */}
            <div className="flex items-center shrink-0 lg:-mt-[6px]">
              <div className="w-48 xl:w-52 h-11 lg:h-9">
                <CustomDropdown
                  options={[
                    { value: 'Popularity', label: 'Popularity' },
                    {
                      value: 'Price: Low to High',
                      label: 'Price: Low to High',
                    },
                    {
                      value: 'Price: High to Low',
                      label: 'Price: High to Low',
                    },
                    { value: 'New Arrivals', label: 'New Arrivals' },
                  ]}
                  value={sortBy}
                  onChange={setSortBy}
                  className="w-full h-full"
                  buttonClassName="w-full h-full !rounded-full border !border-outline-variant/30 shadow-sm !bg-surface-bright/90 backdrop-blur-md !py-0 !px-5 lg:!px-4 text-[12px] lg:text-[11px]"
                />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Promo Banner - Hide when searching on mobile */}
      {!(isMobile && searchParam) && shopContent?.promo?.isActive !== false && (
        <PromoBanner
          backgroundImage={shopContent.promo.backgroundImage}
          badgeText={
            promoCoupon ? `Active Promo: ${promoCoupon.code}` : shopContent.promo.badgeText
          }
          statusText={shopContent.promo.statusText}
          title={shopContent.promo.title}
          highlightText={
            promoCoupon
              ? promoCoupon.discountType === 'percentage'
                ? `${promoCoupon.discountValue}% Off`
                : `₹${promoCoupon.discountValue} Off`
              : shopContent.promo.highlightText
          }
          description={
            promoCoupon
              ? `Use code ${promoCoupon.code} at checkout to save.`
              : shopContent.promo.description
          }
          ctaText={shopContent.promo.ctaText}
          onCtaClick={() => {
            if (promoCoupon) {
              handleClaimOffer();
            } else {
              const link = shopContent.promo.ctaLink;
              if (link && link.startsWith('/')) {
                navigate(link);
              } else if (link && !link.includes(' ')) {
                const el = document.getElementById(link);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                else navigate('/coupons');
              } else {
                const el = document.getElementById('artisan-collection');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }}
          timer={
            promoCoupon
              ? [
                  { l: 'D', v: countdown.D },
                  { l: 'H', v: countdown.H },
                  { l: 'M', v: countdown.M },
                  { l: 'S', v: countdown.S },
                ]
              : null
          }
        />
      )}

      {/* Main Grid Section */}
      <main
        id="artisan-collection"
        className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop relative pb-8 md:pb-24"
      >
        <MandalaElement
          className="absolute top-[20%] -right-[10%] opacity-[0.03]"
          size={600}
          variant={2}
        />
        <div className="flex flex-col lg:flex-row gap-0 lg:gap-8 xl:gap-12">
          {/* Sidebar Filter - Handles both Desktop Sidebar and Mobile Drawer */}
          <aside className="w-full lg:w-64 xl:w-72 flex-shrink-0 lg:sticky lg:top-32 h-fit">
            <FilterPanel
              filterGroups={filterGroups}
              currentFilters={filters}
              onToggleFilter={toggleFilter}
              onClearAll={clearAllFilters}
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6 md:mb-10">
              <div className="flex flex-col gap-1">
                <h2 className="font-headline-md text-on-surface font-bold text-[24px] md:text-[32px]">
                  The Artisan Collection
                </h2>
                <p className="font-body-md text-on-surface-variant/60 font-medium">
                  {totalCount} unique pieces designed for you
                </p>
              </div>
            </div>

            {/* Mobile/Tablet inline category tabs (hidden on desktop where they appear in sticky nav) */}
            <div className="mb-10 overflow-x-auto no-scrollbar lg:hidden">
              <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategorySelect}
              />
            </div>

            {productsData?.correctedQuery && (
              <div className="mb-8 px-6 py-4 bg-primary/5 text-primary rounded-[20px] border border-primary/10 text-[14px] font-medium flex items-center gap-2.5 shadow-sm">
                <span className="material-symbols-outlined text-[20px] text-primary">
                  lightbulb
                </span>
                <span>
                  Showing results for{' '}
                  <Link
                    to={`/collections?search=${encodeURIComponent(productsData.correctedQuery)}`}
                    className="font-bold underline hover:text-primary-dark"
                  >
                    {productsData.correctedQuery}
                  </Link>
                  . Search instead for{' '}
                  <Link
                    to={`/collections?search=${encodeURIComponent(searchQuery)}&spellcheck=false`}
                    className="underline text-on-surface-variant/80 hover:text-on-surface"
                  >
                    {searchQuery}
                  </Link>
                </span>
              </div>
            )}

            {visualSearch.results && (
              <div className="mb-8 p-5 bg-primary/5 border border-primary/10 rounded-[24px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
                <div className="flex items-center gap-4">
                  {visualSearch.previewUrl && (
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-outline-variant/30 shadow-inner shrink-0">
                      <img
                        src={visualSearch.previewUrl}
                        alt="Scanned visual query"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-on-surface text-[16px] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        image_search
                      </span>
                      Visual Search Results
                    </h3>
                    <p className="text-on-surface-variant/70 text-[13px] mt-1 font-light">
                      Showing best matches from our catalog for your uploaded inspiration image.
                    </p>
                  </div>
                </div>
                <button
                  onClick={visualSearch.reset}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-full text-[13px] font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center gap-1.5 outline-none"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  Clear Visual Search
                </button>
              </div>
            )}

            <div id="product-results-wrapper">
              <AnimatePresence>
                {visualSearch.isOpen && visualSearch.phase !== 'results' && (
                  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end bg-black/60 backdrop-blur-md overflow-hidden p-0 md:p-4 animate-fade-in">
                    {/* Backdrop Click close */}
                    <div className="absolute inset-0 z-0" onClick={visualSearch.close} />

                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 30, stiffness: 280 }}
                      className="relative z-10 bg-surface-bright rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full md:w-[calc(100%-40px)] max-w-[420px] mx-auto border-t md:border border-outline-variant/20 p-6 mt-auto md:mb-8"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/10 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              photo_camera
                            </span>
                          </div>
                          <h2 className="text-on-surface font-display font-bold text-[17px]">
                            Visual Search
                          </h2>
                        </div>
                        <button
                          onClick={visualSearch.close}
                          className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center transition-all cursor-pointer text-on-surface-variant/70 animate-none outline-none focus:outline-none"
                          aria-label="Close visual search"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>

                      {/* ═══ PHASE: Idle (Upload/Camera Select) ═══ */}
                      {visualSearch.phase === 'idle' && (
                        <div className="w-full flex flex-col gap-5">
                          {/* Hidden Inputs */}
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleVisualFileSelect}
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                          />
                          <input
                            type="file"
                            ref={cameraInputRef}
                            onChange={handleVisualCameraCapture}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                          />

                          {showCamera ? (
                            <div className="vs-camera-viewfinder w-full aspect-square relative bg-black flex flex-col justify-end rounded-2xl overflow-hidden">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-6 z-10">
                                <button
                                  onClick={stopCamera}
                                  className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white border border-white/20 active:scale-90 transition-transform cursor-pointer"
                                >
                                  <span className="material-symbols-outlined">close</span>
                                </button>
                                <button
                                  onClick={capturePhoto}
                                  className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-primary border-4 border-primary/20 active:scale-90 transition-transform cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[32px]">
                                    photo_camera
                                  </span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Drag and Drop Zone */}
                              <div
                                onDragEnter={handleVisualDragEnter}
                                onDragOver={handleVisualDragOver}
                                onDragLeave={handleVisualDragLeave}
                                onDrop={handleVisualDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`vs-upload-zone ${isDragging ? 'dragging' : ''}`}
                              >
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-[32px]">
                                      cloud_upload
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-on-surface font-semibold text-[15px]">
                                      Upload an image
                                    </p>
                                    <p className="text-on-surface-variant/60 text-[12px] mt-1">
                                      Drag and drop or click to browse
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Camera Action Row */}
                              <div className="flex gap-3">
                                <button
                                  onClick={startCamera}
                                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors text-on-surface-variant font-bold text-[13px] uppercase tracking-wider cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    photo_camera
                                  </span>
                                  Use Camera
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* ═══ PHASE: Preview + Scanning ═══ */}
                      {(visualSearch.phase === 'preview' || visualSearch.phase === 'scanning') &&
                        visualSearch.previewUrl && (
                          <div className="w-full flex flex-col items-center animate-fade-in">
                            {/* Image with Cinematic Gradient Scanning Effects */}
                            <div
                              className={`vs-image-scanner w-full aspect-square${visualSearch.phase === 'scanning' ? ' scanning' : ''}`}
                            >
                              <img
                                src={visualSearch.previewUrl}
                                alt="Uploaded for visual search"
                                className="w-full h-full object-cover rounded-2xl"
                                style={{ position: 'relative', zIndex: 1 }}
                              />
                              {visualSearch.phase === 'scanning' && (
                                <div className="vs-mesh-overlay">
                                  <div className="vs-blob-1" />
                                  <div className="vs-blob-2" />
                                </div>
                              )}
                            </div>

                            {/* Progress Bar */}
                            {visualSearch.phase === 'scanning' && (
                              <div className="w-full mt-6 space-y-3">
                                <div className="flex items-center justify-between px-1">
                                  <p className="text-on-surface-variant/80 text-[12px] font-bold tracking-[0.1em] uppercase">
                                    {visualSearch.scanProgress < 35
                                      ? 'Extracting features...'
                                      : visualSearch.scanProgress < 75
                                        ? 'Identifying object...'
                                        : 'Finding closest matches...'}
                                  </p>
                                  <span className="text-primary text-[12px] font-bold">
                                    {Math.round(visualSearch.scanProgress)}%
                                  </span>
                                </div>
                                <div className="w-full h-[3px] bg-outline-variant/30 rounded-full overflow-hidden">
                                  <div
                                    className="vs-progress-bar"
                                    style={{ width: `${visualSearch.scanProgress}%` }}
                                  />
                                </div>
                                <div className="pt-4 flex justify-center">
                                  <button
                                    onClick={visualSearch.reset}
                                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-outline-variant/30 hover:bg-surface-container-low transition-colors text-on-surface-variant/70 text-[10px] uppercase font-bold tracking-[0.15em]"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      close
                                    </span>
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      {/* ═══ PHASE: Error ═══ */}
                      {visualSearch.phase === 'error' && (
                        <div className="w-full text-center animate-fade-in">
                          <div className="py-4">
                            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-5 border border-error/20">
                              <span className="material-symbols-outlined text-[32px] text-error">
                                error
                              </span>
                            </div>
                            <h3 className="text-on-surface-variant font-display text-[22px] font-bold mb-2">
                              Search Failed
                            </h3>
                            <p className="text-on-surface-variant/60 text-[13px] leading-relaxed mb-8">
                              {visualSearch.error || 'Something went wrong. Please try again.'}
                            </p>
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={visualSearch.retry}
                                className="btn-outline bg-white hover:bg-surface-container-lowest"
                              >
                                Retry
                              </button>
                              <button onClick={visualSearch.close} className="btn-primary">
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12">
                  {[...Array(6)].map((_, i) => (
                    <ProductCard key={i} loading={true} />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <>
                  <div
                    className={`grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-x-4 md:gap-x-8 gap-y-8 md:gap-y-12 transition-opacity duration-300 ${isFetching ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}
                  >
                    {products.map((product, index) => (
                      <ProductCard
                        key={product.id || product._id}
                        {...product}
                        eager={index < 4}
                        onQuickView={openQuickView}
                      />
                    ))}
                  </div>

                  {/* Interactive Numbered Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-16 text-center">
                      <span className="font-label-sm text-[11px] text-on-surface uppercase tracking-[0.3em] font-bold block mb-4">
                        Showing Page {currentPage} of {totalPages}
                      </span>
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={(page) => {
                          setCurrentPage(page);
                          setSearchParams((prev) => {
                            const params = new URLSearchParams(prev);
                            if (page === 1) {
                              params.delete('page');
                            } else {
                              params.set('page', String(page));
                            }
                            return params;
                          });
                          setTimeout(() => {
                            const el = document.getElementById('artisan-collection');
                            if (el) {
                              const y = el.getBoundingClientRect().top + window.scrollY - 80;
                              window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                          }, 50);
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-32 md:py-48 bg-surface-container-low/30 rounded-[40px] border border-dashed border-outline-variant/30 px-6 animate-fade-in">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-luxury/5 border border-black/5">
                    <span className="material-symbols-outlined text-[40px] text-on-surface-variant/20">
                      filter_list_off
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-on-surface mb-3">No products found</h3>
                  <p className="font-body-md text-on-surface-variant/50 font-light mb-10 max-w-md mx-auto">
                    Try adjusting your filters or search terms to find what you're looking for.
                  </p>
                  <button onClick={clearAllFilters} className="btn-primary">
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subtle background art anchor at the bottom */}
        <MandalaArtDecor
          variant={1}
          size={700}
          className="-bottom-40 -left-40 hidden lg:block z-0"
          opacity={0.2}
          spinDuration={180}
        />
        <MandalaArtDecor
          variant={1}
          size={350}
          className="-bottom-20 -left-20 lg:hidden z-0"
          opacity={0.25}
          spinDuration={180}
        />
      </main>

      <QuickViewModal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        product={activeProduct}
      />
    </div>
  );
}
