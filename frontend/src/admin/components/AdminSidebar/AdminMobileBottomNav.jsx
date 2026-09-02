import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext';

export function AdminMobileBottomNav({ isFabOpen, setIsFabOpen, fabActions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { activeRole } = useAdmin();

  const effectiveRole = activeRole || user?.role || 'owner';

  let navItems = [];
  if (effectiveRole === 'warehouse') {
    navItems = [
      { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
      { label: 'Receive', icon: 'move_to_inbox', path: '/admin/warehouse/receive' },
      { label: 'Scan', icon: 'qr_code_scanner', path: '/admin/warehouse', isAction: true },
      { label: 'Pick', icon: 'front_hand', path: '/admin/warehouse/pick' },
      { label: 'Pack', icon: 'inventory', path: '/admin/warehouse/pack' },
    ];
  } else if (effectiveRole === 'production') {
    navItems = [
      { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
      { label: 'Work', icon: 'precision_manufacturing', path: '/admin/production' },
      { label: 'QA', icon: 'fact_check', path: '/admin/production/qa', isAction: true },
      { label: 'Ready', icon: 'box', path: '/admin/production/ready' },
      { label: 'Products', icon: 'inventory_2', path: '/admin/products' },
    ];
  } else if (effectiveRole === 'support' || effectiveRole === 'support_admin') {
    navItems = [
      { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
      { label: 'Orders', icon: 'shopping_bag', path: '/admin/orders' },
      { label: 'Search', icon: 'search', path: '/admin/enterprise-search', isAction: true },
      { label: 'Customers', icon: 'group', path: '/admin/customers' },
      { label: 'Returns', icon: 'assignment_return', path: '/admin/returns' },
    ];
  } else {
    // Owner / Manager
    navItems = [
      { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
      { label: 'Products', icon: 'inventory_2', path: '/admin/products' },
      { label: 'Add', icon: 'add', path: '/admin/products/add', isAction: true },
      { label: 'Orders', icon: 'shopping_bag', path: '/admin/orders' },
      { label: 'Customers', icon: 'group', path: '/admin/customers' },
    ];
  }

  return (
    <>
      {/* FAB Mobile Overlay & Bottom Sheet */}
      <AnimatePresence>
        {isFabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFabOpen(false)}
            className="fixed inset-0 z-[35] lg:hidden"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFabOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-[38] lg:hidden bg-white rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] pt-7 pb-[calc(var(--admin-bottom-nav-height,60px)+24px)] px-6 border-t border-black/5"
            style={
              {
                // Add a tiny bit of padding to the top for the drag handle
              }
            }
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 opacity-80" />

            <h3 className="text-center font-bold text-[var(--admin-text-primary)] mb-6 text-[12px] uppercase tracking-[0.15em] opacity-80">
              Create New
            </h3>

            <div className="grid grid-cols-3 gap-y-7 gap-x-4">
              {fabActions.map((action, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                  onClick={() => {
                    navigate(action.path);
                    setIsFabOpen(false);
                  }}
                  className="flex flex-col items-center justify-center gap-2.5 group outline-none"
                >
                  <div className="w-14 h-14 rounded-[18px] bg-[var(--admin-surface-hover)] border border-[var(--admin-border-subtle)] flex items-center justify-center text-[var(--admin-text-secondary)] group-hover:bg-[var(--admin-accent)] group-hover:text-white group-hover:border-[var(--admin-accent)] transition-all duration-300 shadow-sm group-active:scale-95 group-active:shadow-inner">
                    <span className="material-symbols-outlined text-[24px]">{action.icon}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--admin-text-secondary)] tracking-tight">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 admin-mobile-bottom-nav"
        style={{
          minHeight: 'var(--admin-bottom-nav-height)',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderTop: '1px solid var(--admin-border)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
        }}
      >
        {navItems.map((item, index) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/admin' && !item.isAction && location.pathname.startsWith(item.path));

          if (item.isAction) {
            return (
              <div key={index} className="relative w-11 flex justify-center -translate-y-3 z-[60]">
                {/* Bottom Sheet acts as FAB menu now, so we only need the toggle button here */}

                <button
                  onClick={() => setIsFabOpen(!isFabOpen)}
                  className="w-12 h-12 relative z-[61] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:scale-105 active:scale-95 transition-all cursor-pointer min-h-0"
                  style={{
                    background: isFabOpen ? 'var(--admin-surface)' : 'var(--admin-accent)',
                    color: isFabOpen ? 'var(--admin-accent)' : 'white',
                    border: '2px solid var(--admin-surface)',
                  }}
                  title="Create New"
                >
                  <motion.span
                    animate={{ rotate: isFabOpen ? 45 : 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="material-symbols-outlined text-[24px] font-bold"
                  >
                    add
                  </motion.span>
                </button>
              </div>
            );
          }

          return (
            <button
              key={index}
              onClick={() => {
                navigate(item.path);
                setIsFabOpen(false);
              }}
              className="flex flex-col items-center justify-center gap-0.5 w-14 h-full relative cursor-pointer group min-h-0"
            >
              <span
                className={`material-symbols-outlined text-[19px] transition-colors ${
                  isActive
                    ? 'text-[var(--admin-accent)]'
                    : 'text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-text-secondary)]'
                }`}
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span
                className={`text-[9px] font-medium tracking-tight ${
                  isActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-tertiary)]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
