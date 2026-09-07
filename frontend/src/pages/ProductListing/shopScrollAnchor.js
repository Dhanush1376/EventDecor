import { lockScrollDirection } from '../../hooks/useScrollDirection';

/**
 * Centrally scrolls the viewport to the shop anchor position.
 * On mobile, this positions the search bar at top: 0 and the category tabs directly
 * beneath it at top: 68px, with the product grid starting immediately below.
 * On desktop, this positions the sort bar directly beneath the top navbar.
 */
export function scrollToShopAnchor({ smooth = true, forceDirection = true } = {}) {
  if (typeof window === 'undefined') return;

  const isMobileView = window.innerWidth < 1024;

  if (forceDirection && isMobileView) {
    // Keep top navbar hidden and stickiness stable during programmatic scroll
    lockScrollDirection('down', 850);
  }

  const performScroll = () => {
    if (isMobileView) {
      const anchor = document.getElementById('mobile-categories-anchor');
      const sortBar = document.getElementById('product-listing-sort-bar');
      const sortBarHeight = sortBar ? Math.round(sortBar.getBoundingClientRect().height) || 68 : 68;

      if (anchor) {
        const anchorDocTop = anchor.getBoundingClientRect().top + window.scrollY;
        const targetY = Math.max(0, Math.round(anchorDocTop - sortBarHeight));
        window.scrollTo({ top: targetY, behavior: smooth ? 'smooth' : 'instant' });
        return;
      }

      // Fallback to artisan-collection top if anchor not rendered
      const artisan = document.getElementById('artisan-collection');
      if (artisan) {
        const docTop = artisan.getBoundingClientRect().top + window.scrollY;
        const targetY = Math.max(0, Math.round(docTop - sortBarHeight));
        window.scrollTo({ top: targetY, behavior: smooth ? 'smooth' : 'instant' });
        return;
      }
    } else {
      // Desktop positioning: place sort bar right under the top navbar
      const sortBarAnchor = document.getElementById('product-listing-sort-bar-anchor');
      const sortBar = document.getElementById('product-listing-sort-bar');
      const targetEl = sortBarAnchor || sortBar;
      const topNav = document.querySelector('.top-navbar');
      const navHeight = topNav ? Math.round(topNav.getBoundingClientRect().height) : 0;

      if (targetEl) {
        const docTop = targetEl.getBoundingClientRect().top + window.scrollY;
        const targetY = Math.max(0, Math.round(docTop - navHeight));
        window.scrollTo({ top: targetY, behavior: smooth ? 'smooth' : 'instant' });
        return;
      }
    }
  };

  // Run in next animation frame to allow any pending DOM reflows to settle
  requestAnimationFrame(performScroll);
}
