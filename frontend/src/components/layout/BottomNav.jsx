import { Link, useLocation } from 'react-router-dom';
import { m as motion } from 'framer-motion';
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
      : { label: 'Login', icon: 'login', onClick: openAuthModal },
  ];

  const isActive = (path) => path && location.pathname === path;

  if (isCartOpen) return null;

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bottom-nav lg:hidden fixed bottom-2 left-2 right-2 z-[var(--z-overlay)] bg-white/10 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.3)] rounded-full h-[60px] px-2 flex items-center justify-evenly select-none"
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
            {item.isCart ? (
              <button
                onMouseEnter={() => prefetchManager.prefetchRoute('/cart', { kind: 'hover' })}
                onClick={() => setIsCartOpen(true)}
                aria-label="Open shopping bag"
                className="relative z-10 flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full group cursor-pointer active:scale-95 transition-all"
              >
                <NavIcon active={active} icon={item.icon} label={item.label} />
                {cartCount > 0 && <CartBadge count={cartCount} />}
              </button>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                aria-label={`Open ${item.label}`}
                className="relative z-10 flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full group cursor-pointer active:scale-95 transition-all"
              >
                <NavIcon active={false} icon={item.icon} label={item.label} />
              </button>
            ) : (
              <Link
                to={item.path}
                onMouseEnter={() => prefetchManager.prefetchRoute(item.path, { kind: 'hover' })}
                aria-label={`Navigate to ${item.label}`}
                aria-current={active ? 'page' : undefined}
                className="relative z-10 flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full group cursor-pointer active:scale-95 transition-all"
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
      className={`flex flex-col items-center justify-center transition-all duration-300 ${active ? `${activeColorClass} scale-[1.05]` : 'text-black/70 group-hover:text-black group-hover:-translate-y-0.5'}`}
    >
      <span className={`material-symbols-outlined text-[20px] ${active ? 'font-fill' : ''}`}>
        {icon}
      </span>
      <span
        className={`text-[9px] uppercase font-bold tracking-wider mt-1 transition-all duration-300 ${active ? activeColorClass : 'text-black/70 group-hover:text-black'}`}
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
      className="absolute top-1 right-2 w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md border-[1.5px] border-white z-10"
    >
      {count}
    </motion.span>
  );
}
