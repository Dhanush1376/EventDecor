import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWishlist } from '../context/WishlistContext';
import { GalleryCard } from '../components/gallery/GalleryCard';
import { SEO } from '../components/seo/SEO';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';
import { ShareButton } from '../components/ui/ShareButton';
import { galleryService } from '../services/domainServices';
import { useRecommendationTracker } from '../hooks/useRecommendationTracker';
import { CloudinaryImage } from '../components/ui/CloudinaryImage';
import { GalleryDetailSkeleton } from '../components/ui/Skeleton';
import logger from '../utils/logger';

/* ─── Stagger animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ─── Linked Product Mini Card ─── */
function LinkedProductCard({ product }) {
  const prodId = product._id || product.id;
  const image = product.imageSrc || product.image || (product.images && product.images[0]);
  const price = product.price || product.basePrice;

  return (
    <Link to={`/product/${prodId}`} className="linked-product-card block group">
      <div className="relative aspect-square overflow-hidden bg-[#f5f3ef]">
        <CloudinaryImage
          src={image}
          alt={product.name || product.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          containerClassName="w-full h-full"
          loading="lazy"
          width={300}
          height={300}
          sizes="180px"
        />
      </div>
      <div className="p-3 space-y-1">
        <h5 className="font-body text-[11px] text-black font-semibold leading-tight line-clamp-2">
          {product.name || product.title}
        </h5>
        {price && (
          <span className="font-label text-[11px] text-primary font-bold">
            ₹{Number(price).toLocaleString('en-IN')}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ─── Main Gallery Detail Page ─── */
export function GalleryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleItem, isWishlisted } = useWishlist();

  const [item, setItem] = useState(null);
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [moreLikeThis, setMoreLikeThis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageUrl, setPageUrl] = useState('');
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const lastScrollY = useRef(0);

  // Track gallery view
  useRecommendationTracker({
    targetType: 'gallery',
    targetId: item?._id || item?.id,
    category: item?.category,
    style: item?.style,
  });

  // Scroll direction for mobile bottom bar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
        setIsScrollingDown(currentScrollY > lastScrollY.current && currentScrollY > 100);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch gallery item + recommendations
  useEffect(() => {
    setPageUrl(window.location.href);
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await galleryService.getById(id);
        if (res.success) {
          setItem(res.data);
          setLinkedProducts(res.data.linkedProducts || []);
        }

        // Fetch 12 recommendations for a richer discovery feed
        const recRes = await galleryService.getAll({ limit: 13 });
        if (recRes.success) {
          const recs = recRes.data.data || recRes.data.items || recRes.data || [];
          setMoreLikeThis(recs.filter((gi) => (gi._id || gi.id) !== id).slice(0, 12));
        }
      } catch (err) {
        logger.error('Failed to fetch discovery details', err);
        setError('Could not load discovery details.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) return <GalleryDetailSkeleton />;

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfbf9]">
        <div className="text-center">
          <h2 className="font-display text-2xl mb-4">Discovery not found</h2>
          <Link
            to="/gallery"
            className="text-primary underline font-label uppercase tracking-widest text-xs font-bold"
          >
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  const handleShopLook = () => {
    if (linkedProducts.length > 0) {
      navigate(`/product/${linkedProducts[0]._id || linkedProducts[0].id}`);
    } else {
      navigate('/collections');
    }
  };

  const handleWishlistLook = () => {
    if (linkedProducts.length > 0) {
      const prod = linkedProducts[0];
      toggleItem({ ...prod, id: prod._id || prod.id, image: prod.imageSrc });
    }
  };

  const linkedProdId =
    linkedProducts.length > 0 ? linkedProducts[0]._id || linkedProducts[0].id : null;
  const isLiked = linkedProdId && isWishlisted(linkedProdId);
  const formattedDate = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="bg-[#fcfbf9] min-h-screen selection:bg-primary/20 relative pt-[56px] md:pt-20 pb-32 md:pb-20 overflow-hidden">
      <SEO title={item.title} description={item.description} />

      {/* Background Mandala Art */}
      <MandalaArtDecor
        variant={2}
        size={500}
        className="-top-24 -right-24 hidden lg:block absolute"
        opacity={0.06}
        spinDuration={300}
      />

      {/* Breadcrumbs — Desktop */}
      <nav
        className="hidden md:flex items-center gap-2 font-label text-[11px] uppercase tracking-[0.25em] mb-8 text-black/30 max-w-[1340px] mx-auto px-6 lg:px-10"
        aria-label="Breadcrumb"
      >
        <Link to="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span className="opacity-30">/</span>
        <Link to="/gallery" className="hover:text-primary transition-colors">
          Gallery
        </Link>
        <span className="opacity-30">/</span>
        <span className="text-black font-bold truncate max-w-[200px]">{item.title}</span>
      </nav>

      {/* ═══════ Main Content ═══════ */}
      <main className="max-w-[1340px] mx-auto md:px-6 lg:px-10">
        {/* ─── MOBILE: Old Layout ─── */}
        <div className="md:hidden flex flex-col bg-white overflow-hidden border-b border-black/5 pb-8 mb-8">
          {/* Image/Video Section */}
          <div className="w-full relative bg-[#f9f8f6]">
            {item.video ? (
              <video
                src={item.video}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-auto object-cover max-h-[85vh] mx-auto block"
                poster={item.image}
              />
            ) : (
              <CloudinaryImage
                src={item.image}
                alt={item.title}
                className="w-full h-auto object-contain max-h-[85vh] mx-auto block"
                containerClassName="w-full h-auto max-h-[85vh] mx-auto block"
                aspectRatio="auto"
                loading="eager"
                eager={true}
                width={1200}
                height={800}
                sizes="100vw"
              />
            )}

            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="absolute top-6 left-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-95 text-black cursor-pointer"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
            </button>

            {/* Actions */}
            <div className="flex absolute top-6 right-4 z-10 gap-2">
              <button
                onClick={handleWishlistLook}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-[0.96]"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{
                    fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0",
                    color: isLiked ? '#ff2d55' : '#1a1817',
                  }}
                >
                  favorite
                </span>
              </button>
              <ShareButton
                url={pageUrl}
                title={item.title}
                description={item.description}
                variant="custom"
                size="custom"
                iconOnly={true}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg text-black"
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="w-full p-6 bg-white">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-label text-[9px] uppercase tracking-[0.3em] text-primary font-bold">
                    {item.category}
                  </span>
                  <div className="h-px w-4 bg-primary/20" />
                  <span className="font-display text-[10px] text-black/30 line-clamp-1">
                    {item.style}
                  </span>
                </div>
                <h2 className="font-display text-[20px] text-black leading-tight font-bold tracking-tight">
                  {item.title}.
                </h2>
              </div>
              <button
                onClick={handleShopLook}
                className="bg-primary text-white h-11 px-5 rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                <span className="hidden sm:inline">Shop look</span>
                <span className="sm:hidden text-[9px]">Shop</span>
              </button>
            </div>

            <div className="space-y-6 pt-8 mt-6 border-t border-black/5">
              <div className="relative p-6 bg-[#fcfbf9] rounded-[28px] border border-black/5">
                <span className="material-symbols-outlined absolute -top-3 -left-3 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-md border-4 border-white text-[12px]">
                  format_quote
                </span>
                <p className="font-body text-[15px] text-black/80 font-medium leading-relaxed mb-4">
                  {item.description}
                </p>
                <p className="font-body text-black/40 leading-relaxed text-[12px] font-medium">
                  {item.story}
                </p>
              </div>

              <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/10 space-y-3">
                <h4 className="font-body text-lg text-black font-bold leading-none">
                  Custom Studio
                </h4>
                <p className="font-body text-black/40 text-[11px] leading-relaxed font-medium">
                  Collaborate with our studio artisans to recreate this vision for your space.
                </p>
                <Link
                  to="/contact"
                  className="block text-center bg-black text-white py-3 rounded-full font-label text-[11px] uppercase tracking-[0.2em] font-bold active:scale-95 transition-all"
                >
                  Inquire
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ─── DESKTOP: Pinterest Split Layout ─── */}
        <div className="hidden md:grid gallery-detail-grid">
          {/* ─── LEFT: Hero Image ─── */}
          <div className="gallery-detail-image z-0">
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="relative md:rounded-[28px] overflow-hidden bg-[#f5f3ef] group"
              onMouseEnter={() => setImageHovered(true)}
              onMouseLeave={() => setImageHovered(false)}
            >
              {/* Image or Video */}
              {item.video ? (
                <video
                  src={item.video}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-auto object-cover block"
                  poster={item.image}
                />
              ) : (
                <CloudinaryImage
                  src={item.image}
                  alt={item.title}
                  className={`w-full h-auto object-contain block transition-transform duration-[1.5s] ease-out ${
                    imageHovered ? 'scale-[1.03]' : 'scale-100'
                  }`}
                  containerClassName="w-full h-auto block"
                  aspectRatio="auto"
                  loading="eager"
                  eager={true}
                  width={1200}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 65vw"
                />
              )}

              {/* Type Badge — top-left */}
              <div className="absolute top-4 left-4 z-10">
                <span
                  className={`px-3 py-1.5 rounded-full text-[9px] uppercase tracking-[0.2em] font-extrabold shadow-lg backdrop-blur-md border ${
                    item.type === 'real-event'
                      ? 'bg-[#C4A87C]/90 text-white border-[#C4A87C]/30'
                      : 'bg-stone-900/80 text-white border-white/15'
                  }`}
                >
                  {item.type === 'real-event' ? 'Real Event' : 'Inspiration'}
                </span>
                {item.video && (
                  <span className="ml-2 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 bg-amber-600/90 text-white text-[8px] uppercase tracking-widest font-extrabold shadow-lg inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">play_circle</span>
                    Video
                  </span>
                )}
              </div>

              {/* Mobile Back Button */}
              <button
                onClick={() => navigate(-1)}
                className="md:hidden absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-95 transition-all text-black cursor-pointer"
                aria-label="Go back"
              >
                <span className="material-symbols-outlined text-[20px] font-bold">arrow_back</span>
              </button>

              {/* Floating Action Pill — bottom-right (Desktop) */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-5 right-5 z-10 hidden md:block"
              >
                <div className="gallery-action-pill">
                  {/* Favorite */}
                  <button
                    onClick={handleWishlistLook}
                    className="gallery-action-btn"
                    aria-label="Save to wishlist"
                  >
                    <motion.span
                      animate={{
                        scale: isLiked ? [1, 1.3, 1] : 1,
                        color: isLiked ? '#ff2d55' : '#1a1817',
                      }}
                      transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                      className="material-symbols-outlined text-[20px]"
                      style={{
                        fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      favorite
                    </motion.span>
                  </button>

                  {/* Divider */}
                  <div className="w-px h-5 bg-black/10" />

                  {/* Share */}
                  <ShareButton
                    url={pageUrl}
                    title={`${item.title} - Siri Arts & Crafts Gallery`}
                    description={item.description}
                    variant="custom"
                    size="custom"
                    iconOnly={true}
                    className="gallery-action-btn"
                  />

                  {/* Divider */}
                  <div className="w-px h-5 bg-black/10" />

                  {/* Shop Look */}
                  <button
                    onClick={handleShopLook}
                    className="gallery-action-btn"
                    aria-label="Shop this look"
                  >
                    <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
                  </button>
                </div>
              </motion.div>

              {/* Mobile Actions — top-right */}
              <div className="flex md:hidden absolute top-4 right-4 z-10 gap-2">
                <button
                  onClick={handleWishlistLook}
                  className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-[0.96]"
                >
                  <motion.span
                    animate={{
                      scale: isLiked ? [1, 1.3, 1] : 1,
                      color: isLiked ? '#ff2d55' : '#1a1817',
                    }}
                    transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    favorite
                  </motion.span>
                </button>
                <ShareButton
                  url={pageUrl}
                  title={`${item.title} - Siri Arts & Crafts Gallery`}
                  description={item.description}
                  variant="custom"
                  size="custom"
                  iconOnly={true}
                  className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg text-black transition-all"
                />
              </div>
            </motion.div>
          </div>

          {/* ─── RIGHT: Detail Panel ─── */}
          <div className="px-5 md:px-0 py-6 md:py-0 space-y-7 md:space-y-8">
            {/* Category & Style Tags */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="flex items-center gap-2.5 flex-wrap"
            >
              <span className="px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] uppercase tracking-[0.2em] font-bold border border-primary/15">
                {item.category}
              </span>
              {item.style && (
                <span className="px-3.5 py-1.5 rounded-full bg-black/5 text-black/50 text-[10px] uppercase tracking-[0.2em] font-bold border border-black/5">
                  {item.style}
                </span>
              )}
              {item.event && (
                <span className="px-3.5 py-1.5 rounded-full bg-black/5 text-black/50 text-[10px] uppercase tracking-[0.2em] font-bold border border-black/5">
                  {item.event}
                </span>
              )}
            </motion.div>

            {/* Title */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
              <h1 className="font-display text-[26px] md:text-[34px] text-black leading-[1.15] font-bold tracking-tight">
                {item.title}
              </h1>
              {item.teluguTitle && (
                <p className="font-body text-[15px] text-black/35 mt-1.5 font-medium">
                  {item.teluguTitle}
                </p>
              )}
            </motion.div>

            {/* Description */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
              {item.description && (
                <div className="relative pl-5 border-l-[3px] border-primary/25">
                  <p className="font-body text-[15px] md:text-[16px] text-black/70 leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              )}
              {item.story && (
                <p className="font-body text-[13px] text-black/40 leading-relaxed mt-4 font-medium">
                  {item.story}
                </p>
              )}
            </motion.div>

            {/* Color Palette */}
            {item.colorPalette && item.colorPalette.length > 0 && (
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
                <span className="font-label text-[9px] uppercase tracking-[0.3em] text-black/30 font-bold block mb-3">
                  Color Palette
                </span>
                <div className="flex items-center gap-2">
                  {item.colorPalette.map((color, i) => (
                    <div
                      key={i}
                      className="color-swatch"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={3.5}
                className="flex flex-wrap gap-1.5"
              >
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-[#f5f3ef] text-black/40 text-[10px] font-semibold tracking-wide"
                  >
                    #{tag}
                  </span>
                ))}
              </motion.div>
            )}

            {/* Divider */}
            <div className="h-px bg-black/6" />

            {/* Shop This Look — Linked Products */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
              {linkedProducts.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-label text-[10px] uppercase tracking-[0.3em] text-black font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">
                        shopping_bag
                      </span>
                      Shop This Look
                    </span>
                    <span className="text-[10px] text-black/30 font-medium">
                      {linkedProducts.length} {linkedProducts.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="linked-products-scroll">
                    {linkedProducts.map((prod) => (
                      <LinkedProductCard key={prod._id || prod.id} product={prod} />
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  to="/collections"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-[#f5f3ef] border border-black/5 hover:border-primary/20 transition-all group"
                >
                  <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-[18px]">explore</span>
                  </span>
                  <div>
                    <span className="font-body text-[13px] text-black font-semibold block">
                      Explore Our Collection
                    </span>
                    <span className="font-body text-[11px] text-black/40">
                      Discover similar handcrafted items
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-black/20 ml-auto group-hover:text-primary transition-colors text-[18px]">
                    arrow_forward
                  </span>
                </Link>
              )}
            </motion.div>

            {/* Custom Studio CTA */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
              <div className="glass-cta rounded-[24px] p-6 md:p-7 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md">
                    <span className="material-symbols-outlined text-[18px]">palette</span>
                  </span>
                  <div>
                    <h4 className="font-body text-[15px] text-black font-bold leading-none">
                      Custom Studio
                    </h4>
                    <p className="font-body text-[11px] text-black/40 mt-0.5">
                      Recreate this vision for your space
                    </p>
                  </div>
                </div>
                <p className="font-body text-black/50 text-[12px] leading-relaxed">
                  Collaborate with our artisan studio to customize this design for your wedding,
                  celebration, or home décor.
                </p>
                <Link
                  to="/contact"
                  className="block text-center bg-black text-white py-3 rounded-full font-label text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-primary transition-all duration-300 shadow-lg hover:shadow-primary/20"
                >
                  Inquire Now
                </Link>
              </div>
            </motion.div>

            {/* Metadata Row */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}>
              <div className="flex items-center gap-5 text-black/25">
                {typeof item.views === 'number' && (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                    {item.views.toLocaleString()} views
                  </span>
                )}
                {typeof item.likes === 'number' && item.likes > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      favorite
                    </span>
                    {item.likes.toLocaleString()} likes
                  </span>
                )}
                {formattedDate && (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    {formattedDate}
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ═══════ Discovery Feed: "More Like This" ═══════ */}
        {moreLikeThis.length > 0 && (
          <section className="mt-16 md:mt-24 relative px-5 md:px-0">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-8 md:mb-10">
              <div>
                <span className="font-label text-[9px] uppercase tracking-[0.35em] text-primary font-bold block mb-2">
                  Keep Exploring
                </span>
                <h2 className="font-display text-[22px] md:text-[28px] text-black font-bold tracking-tight">
                  More Like This
                </h2>
              </div>
              <Link
                to="/gallery"
                className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/10 text-black/50 hover:border-primary hover:text-primary transition-all text-[10px] uppercase tracking-[0.2em] font-bold"
              >
                View All
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            {/* Masonry Grid — reuse the polished GalleryCard component */}
            <div className="columns-2 md:columns-3 xl:columns-4 gap-3 md:gap-4 [column-fill:_balance]">
              {moreLikeThis.map((sim) => (
                <GalleryCard key={sim._id || sim.id} item={sim} />
              ))}
            </div>

            {/* Mobile "View All" */}
            <div className="md:hidden flex justify-center mt-8">
              <Link
                to="/gallery"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg active:scale-95 transition-transform"
              >
                Explore Full Gallery
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            {/* Bottom Mandala */}
            <MandalaArtDecor
              variant={1}
              size={400}
              className="-bottom-32 -left-32 hidden lg:block z-0"
              opacity={0.06}
              spinDuration={250}
            />
          </section>
        )}
      </main>

      {/* ─── Mobile Floating Bottom Bar ─── */}
      <AnimatePresence>
        {!isScrollingDown && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="md:hidden fixed bottom-0 left-0 w-full h-[calc(68px+env(safe-area-inset-bottom,0px))] z-[100] bg-white/95 backdrop-blur-3xl border-t border-black/5 p-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))] flex items-center gap-2 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] select-none"
          >
            <button
              onClick={handleWishlistLook}
              className={`w-[56px] h-full rounded-full flex items-center justify-center transition-all active:scale-[0.96] shrink-0 ${
                isLiked ? 'bg-primary/10 text-primary' : 'bg-black/5 text-black hover:bg-black/10'
              }`}
            >
              <motion.span
                animate={{
                  scale: isLiked ? [1, 1.3, 1] : 1,
                  color: isLiked ? '#ff2d55' : '#1a1817',
                }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </motion.span>
            </button>
            <button
              onClick={handleShopLook}
              className="flex-1 bg-primary text-white h-full rounded-full font-label-sm text-[10px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 active:scale-[0.96] transition-transform shadow-md"
            >
              <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
              Shop Look
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle marble texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay z-[400] bg-marble" />
    </div>
  );
}
