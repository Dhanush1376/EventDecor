import React, { useState, useMemo } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext';
import { navSections } from './AdminSidebarData';
import { AdminSidebarContent } from './AdminSidebarContent';
import { AdminMobileBottomNav } from './AdminMobileBottomNav';

// Module-level variable to persist scroll position across mount/unmount of sidebar drawer
let preservedSidebarScrollTop = 0;

export function AdminSidebar() {
  const { user } = useAuth();
  const { sidebarOpen, sidebarMobileOpen, setSidebarMobileOpen, products, activeRole } = useAdmin();
  const mobileSidebarRef = React.useRef(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  const [isFabOpen, setIsFabOpen] = useState(false);

  const effectiveRole = activeRole || user?.role || 'owner';

  let fabActions = [];
  if (effectiveRole === 'warehouse') {
    fabActions = [{ label: 'Scan', icon: 'qr_code_scanner', path: '/admin/warehouse' }];
  } else if (effectiveRole === 'production') {
    fabActions = [{ label: 'Start QA', icon: 'fact_check', path: '/admin/production/qa' }];
  } else if (effectiveRole === 'support') {
    fabActions = [
      { label: 'Find Order', icon: 'search', path: '/admin/enterprise-search' },
      { label: 'New Return', icon: 'assignment_return', path: '/admin/returns/new' },
    ];
  } else {
    fabActions = [
      { label: 'Coupon', icon: 'sell', path: '/admin/coupons/add' },
      { label: 'Showcase', icon: 'view_carousel', path: '/admin/events/showcases/add' },
      { label: 'Product', icon: 'inventory_2', path: '/admin/products/add' },
      { label: 'Category', icon: 'category', path: '/admin/categories/add' },
      { label: 'Campaign', icon: 'campaign', path: '/admin/campaigns/add' },
    ];
  }

  const toggleSection = (si) => {
    setCollapsedSections((prev) => ({ ...prev, [si]: !prev[si] }));
  };

  // Restore scroll position whenever a nav element (desktop or mobile) mounts
  const handleNavRef = React.useCallback((node) => {
    if (node) {
      const savedScroll = sessionStorage.getItem('adminSidebarScroll');
      if (savedScroll) preservedSidebarScrollTop = parseInt(savedScroll, 10);
      node.scrollTop = preservedSidebarScrollTop;
    }
  }, []);

  // Save scroll position on scroll
  const handleScroll = (e) => {
    preservedSidebarScrollTop = e.currentTarget.scrollTop;
    sessionStorage.setItem('adminSidebarScroll', preservedSidebarScrollTop.toString());
  };

  // Filter sections by search query
  const filteredNavSections = useMemo(() => {
    if (!sidebarSearch.trim()) return navSections;
    const q = sidebarSearch.toLowerCase().trim();
    return navSections
      .map((section) => {
        const matchedItems = section.items.filter(
          (item) => item.label.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q),
        );
        return { ...section, items: matchedItems };
      })
      .filter((section) => section.items.length > 0);
  }, [sidebarSearch]);

  // Recently edited products
  const recentlyEdited = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.slice(0, 3);
  }, [products]);

  // Focus trap on mobile
  React.useEffect(() => {
    if (sidebarMobileOpen) {
      const focusable = mobileSidebarRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable && focusable.length > 0) {
        focusable[0].focus();
      }
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setSidebarMobileOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [sidebarMobileOpen, setSidebarMobileOpen]);

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40 overflow-hidden"
        style={{
          background: 'var(--admin-surface)',
          borderRight: '1px solid var(--admin-border)',
          boxShadow: '1px 0 8px rgba(0,0,0,0.02)',
        }}
      >
        <AdminSidebarContent
          sidebarOpen={sidebarOpen}
          setSidebarMobileOpen={setSidebarMobileOpen}
          sidebarSearch={sidebarSearch}
          setSidebarSearch={setSidebarSearch}
          filteredNavSections={filteredNavSections}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          recentlyEdited={recentlyEdited}
          handleNavRef={handleNavRef}
          handleScroll={handleScroll}
        />
      </motion.aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarMobileOpen(false)}
              className="fixed inset-0 z-[100] lg:hidden"
              style={{ background: 'var(--admin-surface-overlay)', backdropFilter: 'blur(4px)' }}
            />
            <motion.aside
              ref={mobileSidebarRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 h-dvh w-[min(82vw,300px)] z-[110] lg:hidden overflow-hidden"
              style={{ background: 'var(--admin-surface)', boxShadow: 'var(--admin-shadow-2xl)' }}
            >
              <div className="absolute top-3 right-3 z-10">
                <button
                  onClick={() => setSidebarMobileOpen(false)}
                  className="p-2.5 rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] cursor-pointer min-h-0"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <AdminSidebarContent
                sidebarOpen={true}
                setSidebarMobileOpen={setSidebarMobileOpen}
                sidebarSearch={sidebarSearch}
                setSidebarSearch={setSidebarSearch}
                filteredNavSections={filteredNavSections}
                collapsedSections={collapsedSections}
                toggleSection={toggleSection}
                recentlyEdited={recentlyEdited}
                handleNavRef={handleNavRef}
                handleScroll={handleScroll}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AdminMobileBottomNav
        isFabOpen={isFabOpen}
        setIsFabOpen={setIsFabOpen}
        fabActions={fabActions}
      />
    </>
  );
}

export default AdminSidebar;
