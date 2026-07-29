import { Link, useLocation } from 'react-router-dom';
import { m as motion } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { prefetchManager } from '../../utils/performance/prefetchManager';

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
      : { label: 'Login', icon: 'login', onClick: openAuthModal },
  ];

  const isActive = (path) => path && location.pathname === path;

  if (isCartOpen) return null;

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bottom-nav lg:hidden fixed bottom-3 left-3 right-3 z-[var(--z-overlay)] bg-[#faf8f2]/95 backdrop-blur-2xl border border-[#b38235]/15 rounded-full h-[65px] px-2 flex items-center justify-evenly select-none shadow-[0_8px_32px_rgba(179,130,53,0.12)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {navItems.map((item) => {
        const active = item.isCart
          ? isCartOpen || location.pathname === '/cart'
          : isActive(item.path);

        return (
          <div
            key={item.label || item.path}
            className="relative flex flex-col items-center justify-center h-full flex-1"
          >
            {item.isCart ? (
              <button
                onMouseEnter={() => prefetchManager.prefetchRoute('/cart', { kind: 'hover' })}
                onClick={() => setIsCartOpen(true)}
                aria-label="Open shopping bag"
                className="relative z-10 flex flex-col items-center justify-center w-full h-full group cursor-pointer active:scale-95 transition-all"
              >
                <NavIcon
                  active={active}
                  icon={item.icon}
                  label={item.label}
                  badgeCount={cartCount}
                />
              </button>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                aria-label={`Open ${item.label}`}
                className="relative z-10 flex flex-col items-center justify-center w-full h-full group cursor-pointer active:scale-95 transition-all"
              >
                <NavIcon active={false} icon={item.icon} label={item.label} />
              </button>
            ) : (
              <Link
                to={item.path}
                onMouseEnter={() => prefetchManager.prefetchRoute(item.path, { kind: 'hover' })}
                aria-label={`Navigate to ${item.label}`}
                aria-current={active ? 'page' : undefined}
                className="relative z-10 flex flex-col items-center justify-center w-full h-full group cursor-pointer active:scale-95 transition-all"
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

function NavIcon({ active, icon, label, badgeCount }) {
  const activeColorClass = 'text-black';
  const inactiveColorClass = 'text-black';

  return (
    <div className={`flex flex-col items-center justify-center transition-all duration-300 mt-0.5`}>
      <div className="relative flex items-center justify-center">
        <span
          className={`material-symbols-outlined text-[24px] ${active ? `font-fill ${activeColorClass}` : inactiveColorClass} transition-colors`}
          style={{ fontVariationSettings: active ? "'wght' 400" : "'wght' 200" }}
        >
          {icon}
        </span>
        {badgeCount > 0 && <CartBadge count={badgeCount} />}
      </div>
      {label && (
        <span
          className={`text-[9px] uppercase font-bold tracking-[0.05em] mt-1 transition-colors duration-300 ${active ? activeColorClass : inactiveColorClass}`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function CartBadge({ count }) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1.5 -right-2.5 w-[16px] h-[16px] bg-[#ff3b30] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm border-2 border-[#faf8f2] z-10"
    >
      {count}
    </motion.span>
  );
}
