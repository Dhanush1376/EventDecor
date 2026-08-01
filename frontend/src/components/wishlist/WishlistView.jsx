import { CheckCircle2, MapPin, ArrowRight, Grid3X3, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../hooks/useProductQueries';
import { useRecommendationTracker } from '../../hooks/useRecommendationTracker';
import { SEO } from '../seo/SEO';
import { ProductCard } from '../shared/ProductCard';
import { QuickViewModal } from '../ui/QuickViewModal';
import { WishlistPageSkeleton } from '../ui/Skeleton';
import { CloudinaryImage } from '../ui/CloudinaryImage';
import { useUserProfile, useUserAddresses, useAddressMutations } from '../../hooks/useUserQueries';
import { useShowcases } from '../../hooks/useShowcaseQueries';

export function WishlistView({ isEmbedded = false }) {
  const { items, _removeItem, _toggleItem, loading: wishlistLoading } = useWishlist();
  const { addItem: _addToCart } = useCart();
  const { data: addresses = [] } = useUserAddresses();
  const { data: _profile } = useUserProfile();
  const { setDefaultAddress } = useAddressMutations();

  const [sortBy, _setSortBy] = useState('latest');
  const [itemTypeFilter, setItemTypeFilter] = useState('product'); // 'product', 'event'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [notification, setNotification] = useState('');

  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);

  // Track wishlist view
  useRecommendationTracker({
    targetType: 'page',
    targetId: 'wishlist',
    source: 'wishlist',
  });

  // Calculate basic filter emptiness to avoid moving hooks below useMemo
  const isFilteredEmpty =
    items.length > 0 &&
    items.filter((i) => {
      const iType =
        i.itemType || (i.setupTimeHours !== undefined || i.inclusions ? 'event' : 'product');
      return iType === itemTypeFilter;
    }).length === 0;

  const shouldShowRecommendations = items.length === 0 || isFilteredEmpty;

  const { data: trendingData = {}, isPending: trendingLoading } = useProducts(
    { limit: 4, sort: 'Popularity' },
    { enabled: shouldShowRecommendations && itemTypeFilter !== 'event' },
  );
  const trendingProducts =
    trendingData?.data ||
    trendingData?.products ||
    trendingData?.items ||
    (Array.isArray(trendingData) ? trendingData : []);

  const { data: eventData = [], isPending: eventsLoading } = useShowcases({
    enabled: shouldShowRecommendations && itemTypeFilter === 'event',
  });
  const trendingEvents = (Array.isArray(eventData) ? eventData : eventData?.data || [])
    .slice(0, 4)
    .map((event) => ({
      ...event,
      itemType: 'event',
      imageSrc: event.image || event.imageSrc,
      price: event.rentalPrice || event.price,
    }));

  const recommendationItems = itemTypeFilter === 'event' ? trendingEvents : trendingProducts;
  const recommendationLoading = itemTypeFilter === 'event' ? eventsLoading : trendingLoading;

  const _triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Provide default types if missing
  const enhancedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      id: item.id || item._id,
      category: item.category?.name || item.category || item.eventType || 'Event Decor',
      itemType:
        item.itemType ||
        (item.setupTimeHours !== undefined || item.inclusions ? 'event' : 'product'),
      imageSrc: item.imageSrc || item.image || item.images?.[0] || '',
      quantity: item.quantity !== undefined ? item.quantity : 1, // default in stock
    }));
  }, [items]);

  const productCount = useMemo(() => {
    return enhancedItems.filter((item) => item.itemType === 'product').length;
  }, [enhancedItems]);

  const eventCount = useMemo(() => {
    return enhancedItems.filter((item) => item.itemType === 'event').length;
  }, [enhancedItems]);

  // Address lookup
  const activeAddress = useMemo(() => {
    if (!addresses || addresses.length === 0) return null;
    return addresses.find((a) => a.isDefault) || addresses[0];
  }, [addresses]);

  // Dynamic category list from items matching type filter
  const categoriesList = useMemo(() => {
    const itemsForCategories =
      itemTypeFilter === 'all'
        ? enhancedItems
        : enhancedItems.filter((item) => item.itemType === itemTypeFilter);

    const map = new Map();
    itemsForCategories.forEach((item) => {
      if (!map.has(item.category)) {
        map.set(item.category, item.imageSrc);
      }
    });

    return Array.from(map.entries()).map(([name, image]) => ({
      name,
      image,
    }));
  }, [enhancedItems, itemTypeFilter]);

  // Search & Sort logic
  const filteredItems = useMemo(() => {
    let result = [...enhancedItems];

    if (itemTypeFilter !== 'all') {
      result = result.filter((item) => item.itemType === itemTypeFilter);
    }

    if (selectedCategory) {
      result = result.filter((item) => item.category === selectedCategory);
    }

    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    }
    return result;
  }, [enhancedItems, itemTypeFilter, selectedCategory, sortBy]);

  if (wishlistLoading) {
    return <WishlistPageSkeleton />;
  }

  const containerClasses = isEmbedded
    ? 'w-full text-on-surface'
    : 'max-w-[1440px] mx-auto px-4 sm:px-8';

  return (
    <div className="w-full">
      {!isEmbedded && (
        <SEO
          title="My Wishlist"
          description="A private gallery of your favorite Siri Arts & Crafts masterpieces. Artisanal decor saved for your future heritage celebrations."
        />
      )}

      {/* Toast Notification with smooth framer entrance */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] bg-white/40 backdrop-blur-2xl border border-white/60 text-black px-6 py-3 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.08),_inset_0_1px_0_rgba(255,255,255,0.4)] text-[12px] font-bold tracking-wide flex items-center gap-2.5 whitespace-nowrap"
          >
            <CheckCircle2 className="text-[18px] text-green-600 font-fill" strokeWidth={1.5} />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address Bar - Attached perfectly below topnav */}
      {enhancedItems.length > 0 && !isEmbedded && (
        <div
          className={`w-full bg-[#fbf9f6] relative hover:bg-[#f6f2ea] transition-colors ${isAddressDropdownOpen ? 'z-50' : 'z-30'}`}
        >
          <div className="max-w-[1440px] mx-auto px-4 sm:px-8 relative">
            <div
              onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
              className="flex items-center justify-between py-3 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="text-[18px] text-primary" strokeWidth={1.5} />
                <span className="text-[11px] lg:text-xs text-[#1a1817] font-semibold truncate leading-none">
                  {activeAddress
                    ? `${activeAddress.name} - ${activeAddress.addressString || activeAddress.address}, ${activeAddress.locality || ''}, ${activeAddress.city}`
                    : 'Select a Delivery Destination'}
                </span>
              </div>
              <span className="material-symbols-outlined text-[18px] text-black/40">
                {isAddressDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
            </div>

            {/* Address Switcher Dropdown */}
            <AnimatePresence>
              {isAddressDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-4 right-4 mt-1 bg-white border border-black/10 rounded-2xl shadow-xl z-50 p-3 max-h-60 overflow-y-auto"
                >
                  <div className="text-[9px] uppercase tracking-wider font-bold text-black/40 px-2.5 pb-2 mb-1 border-b border-black/5">
                    Select Destination
                  </div>
                  {addresses && addresses.length > 0 ? (
                    addresses.map((addr) => (
                      <div
                        key={addr._id || addr.id}
                        onClick={() => {
                          setDefaultAddress(addr._id || addr.id);
                          setIsAddressDropdownOpen(false);
                        }}
                        className={`p-2.5 rounded-xl text-[11px] cursor-pointer hover:bg-neutral-50 transition-colors flex items-start gap-2 ${addr.isDefault ? 'bg-primary/5 text-primary font-bold' : 'text-black/70'}`}
                      >
                        <span className="material-symbols-outlined text-[14px] mt-0.5">
                          {addr.isDefault ? 'radio_button_checked' : 'radio_button_unchecked'}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold">
                            {addr.name} ({addr.tag})
                          </div>
                          <div className="truncate text-black/50 text-[10px]">
                            {addr.addressString || addr.address}, {addr.locality}, {addr.city}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-2.5 rounded-xl text-[11px] text-black/50 text-center">
                      No other addresses saved.
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-black/5 flex justify-end">
                    <Link
                      to="/dashboard?tab=addresses"
                      className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      Manage Addresses
                      <ArrowRight className="text-[12px]" strokeWidth={1.5} />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Full-width Filters Bar Wrapper */}
      {enhancedItems.length > 0 && (
        <div className="w-full bg-[#fbf9f6] border-b border-black/10 pb-4 pt-0 mb-4 relative z-20">
          <div className={containerClasses}>
            <div className="flex justify-center w-full relative">
              {/* Collections Segmented Switch */}
              <div className="w-full max-w-[500px] bg-white backdrop-blur-xl border border-outline-variant/20 p-1.5 rounded-full flex gap-1 items-center relative select-none overflow-visible shadow-sm mx-auto">
                {[
                  { id: 'product', label: 'Products', icon: 'shopping_bag', count: productCount },
                  { id: 'event', label: 'Events', icon: 'event', count: eventCount },
                ].map((opt) => {
                  const isActive = itemTypeFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setItemTypeFilter(opt.id);
                        setSelectedCategory(null);
                      }}
                      className={`relative flex flex-1 items-center justify-center gap-1.5 px-5 py-2.5 min-h-0 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer border-0 bg-transparent ${
                        isActive ? 'text-black' : 'text-[#685c57]/70 hover:text-black/90'
                      }`}
                    >
                      {/* Active sliding background pill */}
                      {isActive && (
                        <motion.div
                          layoutId="wishlistActiveTab"
                          className="absolute inset-0 bg-surface-container-low border border-black/5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] z-0"
                          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                        />
                      )}

                      {/* Icon & Label */}
                      <span className="material-symbols-outlined text-[16px] relative z-10">
                        {opt.icon}
                      </span>
                      <span className="relative z-10">{opt.label}</span>

                      {/* Top-Right Overlapping Badge */}
                      <span
                        className={`absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold border border-white shadow-sm transition-colors z-20 ${
                          isActive ? 'bg-orange-500 text-white' : 'bg-[#e8e3d9] text-[#685c57]'
                        }`}
                      >
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={containerClasses}>
        <div className="relative z-0">
          {/* Header - Hidden when empty */}
          {enhancedItems.length > 0 && (
            <>
              {/* Categories Carousel */}
              {categoriesList.length > 0 && (
                <div className="mb-4 border-b border-black/5 pb-4">
                  <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-2 px-1 select-none scroll-smooth">
                    {/* "All" Category Circular Item */}
                    <div
                      onClick={() => setSelectedCategory(null)}
                      className="flex flex-col items-center cursor-pointer shrink-0 group w-[72px] lg:w-[88px]"
                    >
                      <div
                        className={`w-14 h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center relative shrink-0 aspect-square bg-[#1a1a1a] shadow-inner ${
                          !selectedCategory
                            ? 'border-2 border-white ring-4 ring-black/20 scale-105 shadow-md'
                            : 'border border-outline-variant/10 shadow-xs hover:border-black/50 group-hover:scale-105'
                        }`}
                      >
                        <Grid3X3
                          className="text-white text-[24px] lg:text-[28px] font-light tracking-widest drop-shadow-sm select-none"
                          strokeWidth={1.5}
                        />
                      </div>
                      <span
                        className={`text-[9.5px] lg:text-[10px] font-bold text-center mt-2 tracking-wide transition-colors whitespace-normal leading-tight h-8 flex items-start justify-center w-full ${
                          !selectedCategory
                            ? 'text-[#1a1a1a]'
                            : 'text-black/50 group-hover:text-black'
                        }`}
                      >
                        All
                      </span>
                    </div>

                    {/* Extracted Dynamic Categories */}
                    {categoriesList.map((cat) => {
                      const isActive = selectedCategory === cat.name;
                      return (
                        <div
                          key={cat.name}
                          onClick={() => setSelectedCategory(isActive ? null : cat.name)}
                          className="flex flex-col items-center cursor-pointer shrink-0 group w-[72px] lg:w-[88px]"
                        >
                          <div
                            className={`w-14 h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden transition-all duration-300 flex items-center justify-center relative shrink-0 aspect-square ${
                              isActive
                                ? 'border-2 border-white ring-4 ring-black/20 scale-105 shadow-md'
                                : 'border border-outline-variant/10 shadow-xs hover:border-black/25 group-hover:scale-105'
                            }`}
                          >
                            <CloudinaryImage
                              src={cat.image}
                              alt={cat.name}
                              className="object-cover w-full h-full"
                              width={64}
                              height={64}
                            />
                          </div>
                          <span
                            className={`text-[9.5px] lg:text-[10px] font-bold text-center mt-2 tracking-wide transition-colors whitespace-normal leading-tight h-8 flex items-start justify-center w-full ${
                              isActive ? 'text-[#1a1a1a]' : 'text-black/50 group-hover:text-black'
                            }`}
                          >
                            {cat.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {enhancedItems.length === 0 ? (
            <div className="space-y-12">
              <div className="flex flex-col items-center justify-center min-h-[50vh] mt-6 text-center">
                <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-[#f6f5f3] flex items-center justify-center mb-6">
                  <Heart
                    className="text-[24px] lg:text-[28px] text-[#9c8965] font-light"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="font-display text-[28px] lg:text-[34px] text-[#1a1a1a] mb-3 tracking-tight leading-tight">
                  Your wishlist is empty
                </h3>
                <p className="text-[#8c8c8c] text-[13px] lg:text-[15px] font-light max-w-[320px] mb-10 leading-relaxed">
                  Discover our curated pieces and start building your dream event.
                </p>
                <Link
                  to="/collections"
                  className="group flex items-center gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] pb-2 border-b-[1.5px] border-[#1a1a1a] transition-all hover:opacity-70"
                >
                  Explore Collections
                  <ArrowRight
                    className="text-[16px] transition-transform group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </Link>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[40vh] mt-6 text-center"
            >
              <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full bg-[#f6f5f3] flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[24px] lg:text-[28px] text-[#9c8965] font-light">
                  filter_list_off
                </span>
              </div>
              <h3 className="font-display text-[28px] lg:text-[34px] text-[#1a1a1a] mb-3 tracking-tight leading-tight">
                No matches found
              </h3>
              <p className="text-[#8c8c8c] text-[13px] lg:text-[15px] font-light max-w-[320px] mb-10 leading-relaxed">
                No{' '}
                {itemTypeFilter === 'product'
                  ? 'products'
                  : itemTypeFilter === 'event'
                    ? 'events'
                    : 'items'}{' '}
                match the active filters.
              </p>
              <Link
                to={itemTypeFilter === 'event' ? '/events' : '/collections'}
                className="group flex items-center gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] pb-2 border-b-[1.5px] border-[#1a1a1a] transition-all hover:opacity-70 cursor-pointer bg-transparent"
              >
                {itemTypeFilter === 'event' ? 'Explore Events' : 'Explore Collections'}
                <ArrowRight
                  className="text-[16px] transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
            </motion.div>
          ) : (
            /* Grid Layout matching retail platforms with smooth staggered micro-animations */
            <motion.div
              layout
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 sm:gap-x-4 lg:gap-x-6 gap-y-6 sm:gap-y-8 lg:gap-y-10"
            >
              <AnimatePresence>
                {filteredItems.map((item, _index) => (
                  <ProductCard
                    key={`wishlist-item-${item.id}`}
                    {...item}
                    layoutMode="wishlist"
                    onQuickView={(e) => {
                      if (window.innerWidth >= 768) {
                        e.preventDefault();
                        setQuickViewProduct(item);
                      }
                    }}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Recommendations block placed outside the ternary so it renders for both empty and filtered empty */}
        {shouldShowRecommendations && (
          <div className="pt-16 pb-8 border-t border-outline-variant/20 mt-12 relative z-0">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl lg:text-2xl font-light tracking-tight text-on-surface font-display leading-tight">
                {itemTypeFilter === 'event' ? 'Discover Curated Events' : 'Trending Masterpieces'}
              </h3>
              <Link
                to={itemTypeFilter === 'event' ? '/events' : '/collections'}
                className="text-[9px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
              >
                View All
                <ArrowRight className="text-[12px]" strokeWidth={1.5} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 sm:gap-x-4 lg:gap-x-6 gap-y-6 sm:gap-y-8 lg:gap-y-10">
              {recommendationLoading
                ? [...Array(4)].map((_, i) => <ProductCard key={i} loading={true} />)
                : recommendationItems.map((item) => (
                    <ProductCard
                      key={item._id || item.id}
                      {...item}
                      onQuickView={(e) => {
                        e.preventDefault();
                        setQuickViewProduct(item);
                      }}
                    />
                  ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        product={quickViewProduct}
      />

      {/* Collections Drawer Modal removed */}
    </div>
  );
}
