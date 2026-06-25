import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';

export function AdminMobileBottomNav({ isFabOpen, setIsFabOpen, fabActions }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', icon: 'dashboard', path: '/admin' },
    { label: 'Products', icon: 'inventory_2', path: '/admin/products' },
    { label: 'Add', icon: 'add', path: '/admin/products/add', isAction: true },
    { label: 'Orders', icon: 'shopping_bag', path: '/admin/orders' },
    { label: 'Settings', icon: 'settings', path: '/admin/settings' },
  ];

  return (
    <>
      {/* FAB Mobile Overlay */}
      <AnimatePresence>
        {isFabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFabOpen(false)}
            className="fixed inset-0 z-[35] lg:hidden"
            style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
          />
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
                <AnimatePresence>
                  {isFabOpen && (
                    <>
                      {fabActions.map((action, i) => {
                        const x = (i - Math.floor(fabActions.length / 2)) * 65;
                        const y = -80;

                        return (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, x, y: y + 15, scale: 0.9 }}
                            animate={{ opacity: 1, x, y, scale: 1 }}
                            exit={{ opacity: 0, x, y: y + 15, scale: 0.9 }}
                            transition={{ duration: 0.1, ease: 'easeOut' }}
                            onClick={() => {
                              navigate(action.path);
                              setIsFabOpen(false);
                            }}
                            className="absolute top-1 w-10 h-10 rounded-full flex items-center justify-center shadow-[var(--admin-shadow-lg)] bg-[var(--admin-surface)] text-[var(--admin-text-primary)] hover:text-[var(--admin-accent)] border border-[var(--admin-border-subtle)]"
                            style={{ left: 'calc(50% - 20px)' }}
                            title={action.label}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {action.icon}
                            </span>
                            <span
                              className="absolute -bottom-6 text-[9px] font-semibold whitespace-nowrap opacity-90 shadow-sm"
                              style={{
                                background: 'var(--admin-surface)',
                                padding: '2px 6px',
                                borderRadius: '12px',
                                border: '1px solid var(--admin-border-subtle)',
                              }}
                            >
                              {action.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </>
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setIsFabOpen(!isFabOpen)}
                  className="w-11 h-11 relative z-[61] rounded-full flex items-center justify-center shadow-[var(--admin-shadow-md)] hover:scale-105 active:scale-95 transition-all cursor-pointer min-h-0"
                  style={{
                    background: isFabOpen ? 'var(--admin-surface)' : 'var(--admin-accent)',
                    color: isFabOpen ? 'var(--admin-accent)' : 'white',
                    border: '2px solid var(--admin-surface)',
                  }}
                  title="Create New"
                >
                  <motion.span
                    animate={{ rotate: isFabOpen ? 45 : 0 }}
                    transition={{ duration: 0.1, ease: 'easeOut' }}
                    className="material-symbols-outlined text-[20px] font-bold"
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
