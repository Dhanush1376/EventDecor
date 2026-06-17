import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useProducts } from '../../hooks/useProductQueries';
import { useRecommendationTracker } from '../../hooks/useRecommendationTracker';
import { SEO } from '../seo/SEO';
import { ProductCard } from '../ui/ProductCard';
import { QuickViewModal } from '../ui/QuickViewModal';
import { WishlistPageSkeleton } from '../ui/Skeleton';

export function WishlistView({ isEmbedded = false }) {
  const { items, removeItem, toggleItem, loading: wishlistLoading } = useWishlist();
  const { addItem: addToCart } = useCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [activeTab, setActiveTab] = useState('all');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [notification, setNotification] = useState('');

  // Track wishlist view
  useRecommendationTracker({
    targetType: 'page',
    targetId: 'wishlist',
    source: 'wishlist',
  });

  const { data: trendingData = {}, isPending: trendingLoading } = useProducts({
    limit: 4,
    sort: 'Popularity',
  });
  const trendingProducts =
    trendingData?.data ||
    trendingData?.products ||
    trendingData?.items ||
    (Array.isArray(trendingData) ? trendingData : []);

  const sortOptions = [
    { value: 'latest', label: 'Latest Added' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
  ];

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Provide default types if missing
  const enhancedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      category: item.category || 'Event Decor',
      itemType:
        item.itemType ||
        (item.setupTimeHours !== undefined || item.inclusions ? 'event' : 'product'),
      imageSrc: item.imageSrc || item.image || item.images?.[0] || '',
    }));
  }, [items]);

  // Search & Sort logic
  const filteredItems = useMemo(() => {
    let result = [...enhancedItems];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) => item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
      );
    }

    if (activeTab !== 'all') {
      result = result.filter((item) => item.itemType === activeTab);
    }

    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    }
    return result;
  }, [enhancedItems, searchQuery, sortBy, activeTab]);

  const handleMoveToBag = (item) => {
    addToCart({
      id: item.id,
      title: item.title,
      price: item.price,
      imageSrc: item.imageSrc,
      variant: item.variant || 'Default',
      quantity: 1,
    });
    removeItem(item.id, item.variant);
    triggerNotification(`Moved "${item.title}" to your Bag`);
  };

  if (wishlistLoading) {
    return <WishlistPageSkeleton />;
  }

  const containerClasses = isEmbedded
    ? 'w-full text-on-surface'
    : 'max-w-[1440px] mx-auto px-4 sm:px-8';

  return (
    <div className={containerClasses}>
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
            <span className="material-symbols-outlined text-[18px] text-green-600 font-fill">
              check_circle
            </span>
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        {/* Breadcrumb & Header - Hidden when empty to clean up the interface */}
        {enhancedItems.length > 0 && (
          <>
            {!isEmbedded && (
              <nav className="text-[11px] text-secondary mb-6 flex items-center gap-2 tracking-wider uppercase font-bold">
                <Link to="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
                <span>/</span>
                <span className="text-on-surface">My Wishlist</span>
              </nav>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-outline-variant/50 mb-8">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-[#1a1c1a]">
                  My Wishlist
                  <span className="font-body text-lg font-normal text-[#685c57]">
                    {' '}
                    ({enhancedItems.length} items)
                  </span>
                </h2>
                {/* Partition Tabs */}
                <div className="flex items-center gap-6 mt-4">
                  {['all', 'product', 'event'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-1 text-[13px] font-bold uppercase tracking-wider transition-all duration-300 border-b-2 ${
                        activeTab === tab
                          ? 'text-[#1a1c1a] border-[#1a1c1a]'
                          : 'text-[#685c57]/60 border-transparent hover:text-[#685c57]'
                      }`}
                    >
                      {tab === 'all' ? 'All' : tab === 'product' ? 'Products' : 'Events'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {/* Editorial Search Bar */}
                <div className="relative flex items-center w-full sm:w-80 group">
                  <div className="absolute inset-0 bg-surface-container-low rounded-full border border-outline-variant/30 group-focus-within:border-primary group-focus-within:bg-surface transition-all duration-300 shadow-luxury/2 pointer-events-none" />
                  <span className="material-symbols-outlined absolute left-4 text-[20px] text-on-surface/30 group-focus-within:text-primary transition-colors">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search my wishlist..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-transparent text-[13px] outline-none focus:outline-none focus:ring-0 border-none rounded-full text-on-surface placeholder:text-on-surface/20 font-medium relative z-10"
                    style={{ outline: 'none', boxShadow: 'none' }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-primary/10 transition-colors z-20 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-on-surface/40">
                        close
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {enhancedItems.length === 0 ? (
          <div className="space-y-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-2xl mx-auto py-16 md:py-24"
            >
              {/* Minimalist Premium Icon Container */}
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 mx-auto relative">
                <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl" />
                <span className="material-symbols-outlined text-primary text-[30px] relative z-10">
                  favorite
                </span>
              </div>

              <h2 className="font-display text-[22px] text-on-surface tracking-tight mb-2">
                Your wishlist is empty.
              </h2>
              <p className="font-body text-[13px] text-secondary/60 font-light max-w-[220px] mx-auto leading-relaxed mb-8">
                Explore our collections and save your favorite items here.
              </p>

              <div className="flex justify-center">
                <Link
                  to="/collections"
                  className="group inline-flex items-center gap-2 text-on-surface hover:text-primary transition-colors py-2 font-label text-[11px] uppercase tracking-[0.2em] font-bold border-b-2 border-on-surface hover:border-primary"
                >
                  <span>Explore Collections</span>
                  <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </motion.div>

            {/* Recommendations */}
            <div className="pt-12 border-t border-outline-variant/20">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-display text-xl md:text-2xl font-bold text-on-surface">
                  Trending Masterpieces
                </h3>
                <Link
                  to="/collections"
                  className="text-[11px] font-bold text-primary uppercase tracking-widest hover:underline"
                >
                  View All
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {trendingLoading
                  ? [...Array(4)].map((_, i) => <ProductCard key={i} loading={true} />)
                  : trendingProducts.map((prod) => (
                      <ProductCard
                        key={prod._id || prod.id}
                        {...prod}
                        onQuickView={(e) => {
                          e.preventDefault();
                          setQuickViewProduct(prod);
                        }}
                      />
                    ))}
              </div>
            </div>
          </div>
        ) : (
          /* Grid Layout matching retail platforms with smooth staggered micro-animations */
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <ProductCard
                  key={`wishlist-item-${item.id}`}
                  {...item}
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

        {filteredItems.length === 0 && searchQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-[#685c57] text-sm"
          >
            No items match "{searchQuery}".
          </motion.div>
        )}
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        product={quickViewProduct}
      />
    </div>
  );
}
