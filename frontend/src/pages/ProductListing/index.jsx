import React, { useState, useEffect, Profiler } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { SEO } from '../../components/seo/SEO';
import { QuickViewModal } from '../../components/ui';
import { couponService } from '../../services/domainServices';
import { useWebsiteContent } from '../../hooks/useWebsiteContent';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { logRenderMetrics } from '../../utils/performance/profilerLogger';

import { useProductListingState } from './useProductListingState';
import { ProductListingHeader, CountdownPromo } from './ProductListingHeader';
import { ProductListingSortBar } from './ProductListingSortBar';
import { ProductListingVisualSearch } from './ProductListingVisualSearch';
import { ProductListingGrid } from './ProductListingGrid';

import '../../styles/visual-search.css';

export function ProductListing() {
  const [searchParams, setSearchParams] = useSearchParams();

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const { scrollDirection, isAtTop } = useScrollDirection();
  const isNavbarHidden = !isAtTop && scrollDirection === 'down';

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(0);
  const [isStuck, setIsStuck] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const state = useProductListingState();

  // Auto-scroll on mobile/tablet to the top of the page when search query changes
  useEffect(() => {
    const hasSearch = searchParams.get('search');
    const isTypingInPageSearch =
      document.activeElement?.getAttribute('placeholder') === 'Search masterworks...';

    if (isMobile && hasSearch && !isTypingInPageSearch) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [searchParams, isMobile]);

  const { data: promoCoupon } = useQuery({
    queryKey: ['promo-coupons'],
    queryFn: async () => {
      const res = await couponService.getAll();
      if (res.success && res.data) {
        const list = res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
        const linkedId = shopContent?.promo?.linkedCouponId;

        if (linkedId) {
          const matched = list.find((c) => c._id === linkedId || c.code === linkedId);
          if (matched && matched.isActive) {
            return matched;
          }
        }

        const activeList = list.filter(
          (c) =>
            c.isActive &&
            new Date() <= new Date(c.expiryDate) &&
            c.displayLocations &&
            c.displayLocations.includes('banner'),
        );
        if (activeList.length > 0) {
          activeList.sort((a, b) => b.discountValue - a.discountValue);
          return activeList[0];
        }
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleClaimOffer = () => {
    const code = promoCoupon ? promoCoupon.code : 'SIRI40';
    navigator.clipboard.writeText(code);
    toast.success(
      (_t) => (
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
        </div>
      ),
      { duration: 5000, position: 'bottom-right' },
    );

    if (promoCoupon) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (promoCoupon.targetType === 'categories' && promoCoupon.targetCategories?.length) {
          next.set('collection', promoCoupon.targetCategories.join(','));
        } else if (promoCoupon.targetType === 'products' && promoCoupon.targetProductIds?.length) {
          next.set('ids', promoCoupon.targetProductIds.join(','));
        }
        next.set('coupon', promoCoupon.code);
        return next;
      });
      // Scroll down to the grid
      setTimeout(() => {
        const el = document.getElementById('artisan-collection');
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 50);
    }
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

  useEffect(() => {
    if (isFilterOpen) {
      document.body.classList.add('filters-open');
    } else {
      document.body.classList.remove('filters-open');
    }
    return () => document.body.classList.remove('filters-open');
  }, [isFilterOpen]);

  const openQuickView = React.useCallback((e, product) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveProduct(product);
    setIsQuickViewOpen(true);
  }, []);

  const handleNextQuickView = React.useCallback(() => {
    if (!activeProduct || !state.products) return;
    const idx = state.products.findIndex(
      (p) => (p._id || p.id) === (activeProduct._id || activeProduct.id),
    );
    if (idx >= 0 && idx < state.products.length - 1) {
      setActiveProduct(state.products[idx + 1]);
    }
  }, [activeProduct, state.products]);

  const handlePrevQuickView = React.useCallback(() => {
    if (!activeProduct || !state.products) return;
    const idx = state.products.findIndex(
      (p) => (p._id || p.id) === (activeProduct._id || activeProduct.id),
    );
    if (idx > 0) {
      setActiveProduct(state.products[idx - 1]);
    }
  }, [activeProduct, state.products]);

  const activeProductIndex =
    activeProduct && state.products
      ? state.products.findIndex((p) => (p._id || p.id) === (activeProduct._id || activeProduct.id))
      : -1;

  return (
    <Profiler id="ProductListing" onRender={logRenderMetrics}>
      <div className="bg-surface min-h-screen">
        <SEO
          title="Shop | Siri Arts & Crafts"
          description="Shop premium handcrafted wedding decor, pooja essentials, floral decorations, and personalized gifts."
        />

        <ProductListingHeader
          isMobile={isMobile}
          searchParam={state.searchParam}
          shopContent={shopContent}
        />

        <ProductListingSortBar
          isMobile={isMobile}
          searchParam={state.searchParam}
          localSearch={state.localSearch}
          setLocalSearch={state.setLocalSearch}
          setIsFilterOpen={setIsFilterOpen}
          categories={state.categories}
          categoryParam={state.categoryParam}
          handleCategorySelect={state.handleCategorySelect}
          sortBy={state.sortBy}
          setSortBy={state.setSortBy}
          isNavbarHidden={isNavbarHidden}
          navbarHeight={navbarHeight}
          setNavbarHeight={setNavbarHeight}
          isStuck={isStuck}
          setIsStuck={setIsStuck}
        />

        <CountdownPromo
          promoCoupon={promoCoupon}
          shopContent={shopContent}
          isMobile={isMobile}
          searchParam={state.searchParam}
          handleClaimOffer={handleClaimOffer}
        />

        <ProductListingGrid
          {...state}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          openQuickView={openQuickView}
          isNavbarHidden={isNavbarHidden}
          navbarHeight={navbarHeight}
        />

        <ProductListingVisualSearch visualSearch={state.visualSearch} />

        <QuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          product={activeProduct}
          onNext={handleNextQuickView}
          onPrev={handlePrevQuickView}
          hasNext={activeProductIndex !== -1 && activeProductIndex < state.products.length - 1}
          hasPrev={activeProductIndex > 0}
        />
      </div>
    </Profiler>
  );
}
