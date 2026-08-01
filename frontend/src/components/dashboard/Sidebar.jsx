import {
  Camera,
  ShoppingBag,
  ChevronRight,
  PackageCheck,
  Compass,
  CornerDownLeft,
  User,
  CalendarDays,
  LogOut,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage } from '../ui';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    logout,
    openAuthModal,
    fileInputRef,
    handleAvatarClick,
    handleAvatarChange,
    isUploadingAvatar,
    wishlistItems,
    cartCount,
    addresses,
    addressText,
    phoneText,
    mobileShowContent,
    setMobileShowContent,
  } = useDashboard();

  const path = location.pathname;
  let activeTab = null;
  if (path.includes('/orders')) activeTab = 'orders';
  else if (path.includes('/rentals')) activeTab = 'rentals';
  else if (path.includes('/events')) activeTab = 'bookings';
  else if (path.includes('/addresses')) activeTab = 'addresses';
  else if (path.includes('/settings')) activeTab = 'preferences';
  else if (path.includes('/collections')) activeTab = 'collections';
  else if (path.includes('/shopping-bag')) activeTab = 'shopping-bag';
  else if (path.includes('/wallet')) activeTab = 'loyalty';
  else if (path.includes('/returns')) activeTab = 'returns';
  else if (path.includes('/profile')) activeTab = 'profile';

  const handleTabClick = (tabName, route) => {
    navigate(route);
    setMobileShowContent(true);
  };

  return (
    <div
      className={`col-span-1 lg:col-span-2 lg:col-span-3 space-y-4 ${mobileShowContent ? 'hidden lg:block' : 'block'}`}
    >
      {/* Dynamic Avatar & Basic Info Card */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 flex flex-col items-center text-center shadow-xs relative group overflow-hidden">
        {/* Profile Image with Edit Overlay */}
        <div
          onClick={handleAvatarClick}
          className="w-20 h-20 rounded-full border border-outline-variant/50 relative overflow-hidden bg-surface-container flex items-center justify-center cursor-pointer shadow-sm group/avatar hover:border-primary transition-colors"
        >
          {isUploadingAvatar && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <div className="skeleton-box inline-block w-6 h-6 rounded-md" />
            </div>
          )}

          {user?.avatar ? (
            <OptimizedImage
              src={user.avatar}
              alt={user.name || 'Avatar'}
              className="w-full h-full object-cover"
              priority={true}
            />
          ) : (
            <span className="font-display text-[26px] text-primary font-light">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AT'}
            </span>
          )}

          {/* Edit Camera Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity duration-300">
            <Camera className="text-[18px]" strokeWidth={1.5} />
          </div>
        </div>

        {/* Secret input for upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarChange}
          accept="image/*"
          className="hidden"
        />

        <div className="mt-3 w-full">
          {!user ? (
            <>
              <span className="font-label-sm text-[11px] text-secondary font-bold tracking-widest uppercase block">
                Welcome, Guest
              </span>
              <button
                onClick={openAuthModal}
                className="text-xs font-bold text-primary hover:underline mt-1 block w-full text-center cursor-pointer bg-transparent border-none outline-none"
              >
                Login
              </button>
            </>
          ) : (
            <>
              <strong className="text-sm text-on-surface block truncate font-bold">
                {user.name}
              </strong>
              <span className="text-[11px] text-secondary block truncate font-light mb-2">
                {user.email}
              </span>

              <div className="flex flex-col gap-1 items-center">
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full border tracking-wider font-semibold uppercase ${
                    user.isVerified
                      ? 'bg-green-50/70 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {user.isVerified ? 'Verified Session' : 'Pending Verification'}
                </span>

                {user.createdAt && (
                  <span className="text-[9px] text-secondary/50 font-medium">
                    Joined{' '}
                    {new Date(user.createdAt).toLocaleString('default', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account Suite Selector tabs */}
      <div
        role="tablist"
        aria-label="Artisan Navigation Hub"
        className="bg-surface-bright border border-outline-variant/40 rounded-lg shadow-xs overflow-hidden"
      >
        <div className="border-b border-surface-container">
          <div className="px-4 py-3 bg-surface-container-low text-secondary font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
            <ShoppingBag className="text-sm text-primary" strokeWidth={1.5} />
            Orders
          </div>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'orders'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('orders', '/dashboard/orders')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'orders'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>My Order History</span>
            <ChevronRight className="text-xs" strokeWidth={1.5} />
          </motion.button>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'rentals'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('rentals', '/dashboard/rentals')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'rentals'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>My Rentals</span>
            <PackageCheck className="text-xs text-[#8c7335]" strokeWidth={1.5} />
          </motion.button>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'custom'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('custom', '/dashboard/custom-orders')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'custom'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>My Custom Orders</span>
            <Compass className="text-xs text-secondary" strokeWidth={1.5} />
          </motion.button>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'returns'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('returns', '/dashboard/returns')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'returns'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>Returns & Exchanges</span>
            <CornerDownLeft className="text-xs text-secondary" strokeWidth={1.5} />
          </motion.button>
        </div>

        <div className="border-b border-surface-container">
          <div className="px-4 py-3 bg-surface-container-low text-secondary font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
            <User className="text-sm text-primary" strokeWidth={1.5} />
            Profile
          </div>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'profile'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('profile', '/dashboard/profile')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'profile'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>Profile Settings</span>
            <ChevronRight className="text-xs" strokeWidth={1.5} />
          </motion.button>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'bookings'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('bookings', '/dashboard/events')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'bookings'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>My Event Bookings</span>
            <CalendarDays className="text-xs text-[var(--color-gold-dark)]" strokeWidth={1.5} />
          </motion.button>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'addresses'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('addresses', '/dashboard/addresses')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'addresses'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>Addresses</span>
            <span className="text-[11px] text-secondary font-bold">
              ({addresses ? addresses.length : 0})
            </span>
          </motion.button>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'preferences'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('preferences', '/dashboard/settings')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'preferences'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>Settings</span>
            <ChevronRight className="text-xs" strokeWidth={1.5} />
          </motion.button>
        </div>

        <div className="border-b border-surface-container">
          <div className="px-4 py-3 bg-surface-container-low text-secondary font-bold text-[11px] uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">folder_special</span>
            Collections
          </div>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'collections'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('collections', '/wishlist')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'collections'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>Curated Wishlist</span>
            <span className="text-[11px] font-bold text-primary font-semibold">
              ({wishlistItems ? wishlistItems.length : 0})
            </span>
          </motion.button>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'shopping-bag'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('shopping-bag', '/cart')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'shopping-bag'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>My Shopping Bag</span>
            <span className="text-[11px] font-bold text-primary font-semibold">({cartCount})</span>
          </motion.button>

          <motion.button
            role="tab"
            aria-selected={activeTab === 'loyalty'}
            whileHover={{ x: 3 }}
            onClick={() => handleTabClick('loyalty', '/dashboard/wallet')}
            className={`w-full text-left px-8 py-2.5 font-medium text-[12px] flex items-center justify-between transition-colors cursor-pointer outline-none ${
              activeTab === 'loyalty'
                ? 'text-primary font-bold bg-primary/5 border-l-2 border-primary'
                : 'text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span>Siri Coins & Wallet</span>
            <span className="material-symbols-outlined text-xs text-[var(--color-gold-dark)]">
              stars
            </span>
          </motion.button>
        </div>

        <motion.button
          whileHover={{
            backgroundColor: 'var(--color-error-container)',
            color: 'var(--color-on-error-container)',
          }}
          onClick={() => {
            logout();
            setTimeout(() => navigate('/'), 400);
          }}
          className="w-full text-left px-4 py-3.5 text-error font-bold text-[11px] uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer outline-none"
        >
          <LogOut className="text-sm" strokeWidth={1.5} />
          Logout
        </motion.button>

        <div className="flex flex-col gap-1.5 p-4 text-on-surface-variant/40 font-label-sm text-[10px] uppercase tracking-widest font-bold border-t border-surface-container">
          <span className="max-w-md">Address: {addressText}</span>
          <span>Phone: +91 {phoneText}</span>
        </div>
      </div>
    </div>
  );
}
