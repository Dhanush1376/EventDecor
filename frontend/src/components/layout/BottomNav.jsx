import { Link, useLocation } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
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

  if (isCartOpen) return null;

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bottom-nav lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-overlay)] bg-[#F5F5F7]/85 backdrop-blur-[32px] saturate-[180%] border-[0.5px] border-black/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] rounded-full h-[72px] px-2 flex items-center justify-center gap-1 sm:gap-3 select-none w-max max-w-[calc(100%-2rem)]"
    >
      {navItems.map((item) => {
        const active = item.isCart
          ? isCartOpen || location.pathname === '/cart'
          : isActive(item.path);

        return (
          <div
            key={item.label || item.path}
            className="relative flex flex-col items-center justify-center"
          >
            {active && (
              <motion.div
                layoutId="bottom-nav-active-pill"
                className="absolute inset-0 bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.06)] border-[0.5px] border-black/[0.04] z-0"
                transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
              />
            )}

            {item.isCart ? (
              <button
                onMouseEnter={() => prefetchManager.prefetchRoute('/cart', { kind: 'hover' })}
                onClick={() => setIsCartOpen(true)}
                aria-label="Open shopping bag"
                className="relative z-10 flex flex-col items-center justify-center w-[60px] h-[60px] group cursor-pointer active:scale-95 transition-transform"
              >
                <NavIcon active={active} icon={item.icon} label={item.label} />
                {cartCount > 0 && <CartBadge count={cartCount} />}
              </button>
            ) : item.isAuth ? (
              <button
                onClick={openAuthModal}
                aria-label="Sign in to your account"
                className="relative z-10 flex flex-col items-center justify-center w-[60px] h-[60px] group cursor-pointer active:scale-95 transition-transform"
              >
                <NavIcon active={active} icon={item.icon} label={item.label} />
              </button>
            ) : (
              <Link
                to={item.path}
                onMouseEnter={() => prefetchManager.prefetchRoute(item.path, { kind: 'hover' })}
                aria-label={`Navigate to ${item.label}`}
                className="relative z-10 flex flex-col items-center justify-center w-[60px] h-[60px] group active:scale-95 transition-transform cursor-pointer"
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
  const activeColorClass = 'text-black';
  return (
    <div
      className={`flex flex-col items-center justify-center transition-all duration-300 ${active ? `${activeColorClass} scale-[1.05]` : 'text-black/70 group-hover:text-black'}`}
    >
      <span className={`material-symbols-outlined text-[24px] ${active ? 'font-fill' : ''}`}>
        {icon}
      </span>
      <span
        className={`text-[9px] uppercase font-bold tracking-widest mt-1 transition-all duration-300 ${active ? activeColorClass : 'text-black/70 group-hover:text-black'}`}
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
      className="absolute top-1 right-2 w-[18px] h-[18px] bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-md border-[1.5px] border-white z-10"
    >
      {count}
    </motion.span>
  );
}
