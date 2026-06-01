import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { prefetchManager } from '../../utils/prefetchManager';

export function BottomNav() {
  const location = useLocation();
  const { cartCount, setIsCartOpen, isCartOpen } = useCart();
  const { isAuthenticated, openAuthModal } = useAuth();

  const navItems = [
    { label: 'Home', icon: 'home', path: '/' },
    { label: 'Shop', icon: 'storefront', path: '/collections' },
    { label: 'Wishlist', icon: 'favorite', path: '/wishlist' },
    { label: 'Events', icon: 'celebration', path: '/events' },
    isAuthenticated
      ? { label: 'Profile', icon: 'person', path: '/dashboard' }
      : { label: 'Sign In', icon: 'login', isAuth: true },
  ];

  const isActive = (path) => location.pathname === path;

  // Always render BottomNav on mobile
  if (isCartOpen) return null;

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bottom-nav lg:hidden fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[var(--z-overlay)] bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.12)] rounded-full h-[72px] md:h-[80px] w-[calc(100%-2rem)] max-w-[400px] flex items-center justify-around px-4 md:px-6 select-none"
    >
      {navItems.map((item) => {
        const active = item.isCart
          ? isCartOpen || location.pathname === '/cart'
          : isActive(item.path);

        return (
          <div key={item.label || item.path} className="flex-1 flex flex-col items-center">
            {item.isCart ? (
              <button
                onMouseEnter={() => prefetchManager.prefetchRoute('/cart', { kind: 'hover' })}
                onClick={() => setIsCartOpen(true)}
                aria-label="Open shopping bag"
                className="relative flex flex-col items-center justify-center w-12 h-12 group cursor-pointer active:scale-[0.96] transition-transform"
              >
                <NavIcon active={active} icon={item.icon} label={item.label} />
                {cartCount > 0 && <CartBadge count={cartCount} />}
              </button>
            ) : item.isAuth ? (
              <button
                onClick={openAuthModal}
                aria-label="Sign in to your account"
                className="flex flex-col items-center justify-center w-12 h-12 group cursor-pointer active:scale-[0.96] transition-transform"
              >
                <NavIcon active={active} icon={item.icon} label={item.label} />
              </button>
            ) : (
              <Link
                to={item.path}
                onMouseEnter={() => prefetchManager.prefetchRoute(item.path, { kind: 'hover' })}
                aria-label={`Navigate to ${item.label}`}
                className="flex flex-col items-center justify-center w-12 h-12 group active:scale-[0.96] transition-transform cursor-pointer"
              >
                <NavIcon active={active} icon={item.icon} label={item.label} />
              </Link>
            )}
          </div>
        );
      })}
    </motion.nav>
  );
}

function NavIcon({ active, icon, label }) {
  const activeColorClass = label === 'Wishlist' ? 'text-[#ff2d55]' : 'text-primary';
  return (
    <div
      className={`flex flex-col items-center justify-center transition-all duration-500 ${active ? `${activeColorClass} scale-110 drop-shadow-md` : 'text-black/50 group-hover:text-black'}`}
    >
      <span className={`material-symbols-outlined text-[24px] ${active ? 'font-fill' : ''}`}>
        {icon}
      </span>
      <span
        className={`text-[9px] uppercase font-bold tracking-wider mt-0.5 ${active ? activeColorClass : 'text-black/50 group-hover:text-black'}`}
      >
        {label}
      </span>
    </div>
  );
}

function CartBadge({ count }) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10"
    >
      {count}
    </motion.span>
  );
}
