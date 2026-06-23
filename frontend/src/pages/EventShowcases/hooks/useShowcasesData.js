import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { showcaseService, bookingService } from '../../../services/domainServices';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useScrollDirection } from '../../../hooks/useScrollDirection';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

const CATEGORY_MAP = {
  'Telugu Heritage': 'telugu_heritage',
  'Engagement Gift': 'engagement_gift',
  'Ring Ceremony': 'ring_ceremony',
  'Tambulam Showcase': 'tambulam_showcase',
  'Coconut Decor': 'coconut_decor',
  'Jewelry Tray': 'jewelry_tray',
};

export function useShowcasesData() {
  const navigate = useNavigate();
  const { isAuthenticated, runProtectedAction } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Popularity');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(0);
  const navRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { scrollDirection, isAtTop } = useScrollDirection();
  const isNavbarHidden = !isAtTop && scrollDirection === 'down' && !isMobile;

  const [filters, setFilters] = useState({
    price: [],
    setupTime: [],
    accents: [],
  });

  const [selectedShowcase, setSelectedShowcase] = useState(null);
  const [customInclusions, setCustomInclusions] = useState([]);
  const [rentalDurationDays, setRentalDurationDays] = useState(1);
  const [selectedPaletteColor, setSelectedPaletteColor] = useState('');
  const [placementPreference, setPlacementPreference] = useState('Side-Stage Showcase Corner');
  const [uploadedReferenceUrl, setUploadedReferenceUrl] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const {
    data: showcases = [],
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ['showcases'],
    queryFn: async () => {
      const res = await showcaseService.getAll();
      if (!res.success) throw new Error('Failed to load event design packages.');
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isError) toast.error('Failed to load event design packages.');
  }, [isError]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleScroll = () => {
      const topNav = document.querySelector('.top-navbar');
      let currentNavHeight = navbarHeight;
      if (topNav) {
        currentNavHeight = topNav.getBoundingClientRect().height;
        setNavbarHeight(currentNavHeight);
      }
      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= currentNavHeight + 1);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [navbarHeight]);

  useEffect(() => {
    if (isFilterOpen) document.body.classList.add('filters-open');
    else document.body.classList.remove('filters-open');
    return () => document.body.classList.remove('filters-open');
  }, [isFilterOpen]);

  const filteredAndSortedShowcases = useMemo(() => {
    let list = [...showcases];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.subtitle?.toLowerCase().includes(q) ||
          s.inclusions?.some((inc) => inc.name?.toLowerCase().includes(q)),
      );
    }

    if (activeCategory !== 'All') {
      const mappedKey = CATEGORY_MAP[activeCategory];
      if (mappedKey) list = list.filter((s) => s.category === mappedKey);
    }

    if (filters.price.length > 0) {
      list = list.filter((s) => {
        const p = s.rentalPrice || 15000;
        return filters.price.some((range) => {
          if (range === 'Under ₹10,000') return p < 10000;
          if (range === '₹10,000 - ₹20,000') return p >= 10000 && p <= 20000;
          if (range === '₹20,000 - ₹35,000') return p >= 20000 && p <= 35000;
          if (range === 'Over ₹35,000') return p > 35000;
          return false;
        });
      });
    }

    if (filters.setupTime.length > 0) {
      list = list.filter((s) => {
        const t = s.setupTimeHours || 2;
        return filters.setupTime.some((range) => {
          if (range === 'Quick (< 2 Hours)') return t < 2;
          if (range === 'Standard (2-4 Hours)') return t >= 2 && t <= 4;
          if (range === 'Intricate (> 4 Hours)') return t > 4;
          return false;
        });
      });
    }

    if (filters.accents.length > 0) {
      list = list.filter((s) => {
        const txt = JSON.stringify(s.inclusions || []).toLowerCase();
        return filters.accents.some((acc) => txt.includes(acc.toLowerCase()));
      });
    }

    if (sortBy === 'Price: Low to High') {
      list.sort((a, b) => (a.rentalPrice || 0) - (b.rentalPrice || 0));
    } else if (sortBy === 'Price: High to Low') {
      list.sort((a, b) => (b.rentalPrice || 0) - (a.rentalPrice || 0));
    } else if (sortBy === 'Fastest Setup') {
      list.sort((a, b) => (a.setupTimeHours || 2) - (b.setupTimeHours || 2));
    } else {
      list.sort((a, b) => String(a._id || a.id).localeCompare(String(b._id || b.id)));
    }

    return list;
  }, [showcases, debouncedSearch, activeCategory, sortBy, filters]);

  const totalCount = filteredAndSortedShowcases.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const paginatedShowcases = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedShowcases.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedShowcases, currentPage]);

  const toggleFilter = (type, value) => {
    setFilters((prev) => {
      const current = prev[type] || [];
      const next = current.includes(value)
        ? current.filter((i) => i !== value)
        : [...current, value];
      return { ...prev, [type]: next };
    });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({ price: [], setupTime: [], accents: [] });
    setActiveCategory('All');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const calculateLivePrice = () => {
    if (!selectedShowcase) return 0;
    const basePrice = selectedShowcase.rentalPrice || 15000;
    const itemsAdjustment = customInclusions.reduce((acc, item) => {
      if (!item.selected) return acc - basePrice * 0.05;
      if (item.qty > item.defaultQty) return acc + (item.qty - item.defaultQty) * (basePrice * 0.1);
      return acc;
    }, 0);
    const durationMultiplier =
      rentalDurationDays === 1
        ? 1
        : rentalDurationDays === 2
          ? 1.5
          : 1.5 + (rentalDurationDays - 2) * 0.4;
    return Math.round(Math.max(basePrice * 0.5, basePrice + itemsAdjustment) * durationMultiplier);
  };

  const handleBookRental = async () => {
    if (!isAuthenticated) {
      runProtectedAction(() => handleBookRental());
      return;
    }
    if (!bookingDate) {
      toast.error('Please select a target ceremony date!');
      return;
    }

    const loadId = toast.loading('Reserving showcase arrangement crates...');
    try {
      const finalAddons = customInclusions
        .filter((i) => i.selected)
        .map((i) => ({ name: `${i.name} (Qty: ${i.qty})`, price: 0 }));

      const bookingData = {
        title: `Rent: ${selectedShowcase.title}`,
        eventType: selectedShowcase.category || 'Showcase Rental',
        date: bookingDate,
        timing: { start: '09:00 AM', end: '09:00 PM' },
        guestCount: 100,
        venue: {
          address: `Showcase Placement: ${placementPreference}. Notes: ${customNote}`,
          isOutdoor: false,
        },
        customization: {
          themeColor: `Color Profile: ${selectedPaletteColor}`,
          floralPreference: 'Matching Traditional Silk-Thread Accents',
          additionalRequests: `Showcase Duration: ${rentalDurationDays} Days. Note: ${customNote}. Image Reference: ${uploadedReferenceUrl}`,
        },
        selectedAddons: finalAddons,
      };

      const res = await bookingService.create(bookingData);
      toast.dismiss(loadId);
      if (res.success) {
        toast.success('Decor Showcase reserved! Track setup times in your dashboard.');
        setSelectedShowcase(null);
        navigate('/dashboard');
      }
    } catch (_err) {
      toast.dismiss(loadId);
      toast.error('Failed to place rental inquiry.');
    }
  };

  return {
    showcases,
    loading,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    sortBy,
    setSortBy,
    isFilterOpen,
    setIsFilterOpen,
    isSticky,
    navbarHeight,
    navRef,
    currentPage,
    setCurrentPage,
    isMobile,
    isNavbarHidden,
    filters,
    toggleFilter,
    clearAllFilters,
    totalCount,
    totalPages,
    paginatedShowcases,
    selectedShowcase,
    setSelectedShowcase,
    customInclusions,
    setCustomInclusions,
    rentalDurationDays,
    setRentalDurationDays,
    selectedPaletteColor,
    setSelectedPaletteColor,
    placementPreference,
    setPlacementPreference,
    uploadedReferenceUrl,
    setUploadedReferenceUrl,
    customNote,
    setCustomNote,
    bookingDate,
    setBookingDate,
    aiSuggestions,
    calculateLivePrice,
    handleBookRental,
  };
}
