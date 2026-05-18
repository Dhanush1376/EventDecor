import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

export function BottomNav() {
  const location = useLocation();
  const { cartCount, setIsCartOpen, isCartOpen } = useCart();
  const { isAuthenticated, openAuthModal } = useAuth();

  const navItems = [
    { label: "Home", icon: "home", path: "/" },
    { label: "Shop", icon: "storefront", path: "/collections" },
    { label: "Wishlist", icon: "favorite", path: "/wishlist" },
    { label: "Cart", icon: "shopping_bag", isCart: true },
    isAuthenticated
      ? { label: "Account", icon: "person", path: "/dashboard" }
      : { label: "Sign In", icon: "login", isAuth: true },
  ];

  const isActive = (path) => location.pathname === path;

  // Track if we should hide the nav based on immersive modes or gallery details
  const [shouldHide, setShouldHide] = React.useState(false);

  React.useEffect(() => {
    const checkHide = () => {
      const isGalleryDetail = location.pathname.startsWith("/gallery/");
      const isGalleryActive = document.body.classList.contains(
        "gallery-mode-active",
      );
      const isSlideshowActive =
        document.body.classList.contains("slideshow-active");
      setShouldHide(
        isGalleryDetail || isGalleryActive || isSlideshowActive || isCartOpen,
      );
    };

    checkHide();

    // Set up an observer to catch class changes on body
    const observer = new MutationObserver(checkHide);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [location.pathname, isCartOpen]);

  if (shouldHide) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bottom-nav fixed bottom-6 left-4 right-4 z-[100] lg:hidden bg-surface/95 backdrop-blur-2xl border border-outline-variant/10 shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-[32px] h-[72px] flex items-center justify-around px-4 select-none"
    >
      {navItems.map((item) => {
        const active = item.isCart
          ? isCartOpen || location.pathname === "/cart"
          : isActive(item.path);

        return (
          <div
            key={item.label || item.path}
            className="flex-1 flex flex-col items-center"
          >
            {item.isCart ? (
              <button
                onClick={() => setIsCartOpen(true)}
                aria-label="Open shopping bag"
                className="relative flex flex-col items-center group cursor-pointer"
              >
                <NavIcon active={active} icon={item.icon} />
                {cartCount > 0 && <CartBadge count={cartCount} />}
              </button>
            ) : item.isAuth ? (
              <button
                onClick={openAuthModal}
                aria-label="Sign in to your account"
                className="flex flex-col items-center group cursor-pointer"
              >
                <NavIcon active={active} icon={item.icon} />
              </button>
            ) : (
              <Link
                to={item.path}
                aria-label={`Navigate to ${item.label}`}
                className="flex flex-col items-center group"
              >
                <NavIcon active={active} icon={item.icon} />
              </Link>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

function NavIcon({ active, icon }) {
  return (
    <div
      className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-500 ${active ? "bg-primary/20 text-primary scale-110 shadow-sm" : "text-on-surface-variant"}`}
    >
      <span
        className={`material-symbols-outlined text-[26px] ${active ? "font-fill" : ""}`}
      >
        {icon}
      </span>
    </div>
  );
}

function CartBadge({ count }) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-surface z-10"
    >
      {count}
    </motion.span>
  );
}
