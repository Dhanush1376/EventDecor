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
              className="absolute top-4 left-4 z-10 w-9 h-9 min-h-0 p-0 aspect-square shrink-0 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-95 text-black cursor-pointer"
              aria-label="Go back"
            >
              <span className="material-symbols-outlined text-[18px] font-bold">arrow_back</span>
            </button>

            {/* Actions */}
            <div className="flex items-center justify-center absolute top-4 right-4 z-10 gap-2">
              <button
                onClick={handleWishlistLook}
                className="w-9 h-9 min-h-0 p-0 aspect-square shrink-0 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-[0.96]"
              >
                <motion.span
                  animate={{
                    scale: isLiked ? [1, 1.3, 1] : 1,
                    color: isLiked ? '#ff2d55' : '#1a1817',
                  }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
                >
                  favorite
                </motion.span>
              </button>
              <ShareButton
                url={pageUrl}
                title={item.title}
                description={item.description}
                variant="custom"
                size="custom"
                iconOnly={true}
                className="w-9 h-9 min-h-0 p-0 aspect-square shrink-0 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg text-black"
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="w-full p-6 bg-gradient-to-b from-primary/10 via-[#fdfbf7] to-white relative overflow-hidden">
            {/* Aesthetic Mobile Mandala */}
            <MandalaArtDecor
              variant={1}
              size={350}
              className="-top-16 -left-16 absolute pointer-events-none"
              opacity={0.15}
              spinDuration={200}
            />
            <div className="flex items-center justify-between gap-2 mb-8 relative z-10">
              <div className="space-y-1 flex-shrink max-w-[50%]">
                <div className="flex items-center gap-2">
                  <span className="font-label text-[9px] uppercase tracking-[0.3em] text-primary font-bold">
                    {item.category}
                  </span>
                </div>
                <h2 className="font-display text-[20px] text-black leading-tight font-bold tracking-tight">
                  {item.title}.
                </h2>
              </div>

              {/* Connecting Line */}
              <div className="flex-1 h-px bg-primary/20 mx-1 md:mx-2 min-w-[20px]" />

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleShopLook}
                  className="bg-primary text-white h-11 px-5 rounded-full font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                  <span className="hidden sm:inline">Shop look</span>
                  <span className="sm:hidden text-[9px]">Shop</span>
                </button>
              </div>
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

              <div className="p-6 rounded-3xl bg-[#2A2825] text-white relative overflow-hidden shadow-lg border border-white/5">
                <div className="relative z-10 flex flex-col items-center text-center gap-5">
                  <div>
                    <h4 className="font-headline-sm mb-1 text-[#C4A87C] font-normal tracking-wide">
                      Need a Custom Theme?
                    </h4>
                    <p className="font-body-sm text-white/90 font-medium">
                      Personalize this setup to perfectly match your vision.
                    </p>
                  </div>
                  <div className="flex flex-row gap-2 w-full">
                    <button
                      onClick={() => navigate(`/custom-orders?gallery=${item._id || item.id}`)}
                      className="bg-white text-black flex-1 px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-stone-200 transition-all whitespace-nowrap font-bold shadow-sm flex items-center justify-center"
                    >
                      Customize
                    </button>
                    <button
                      onClick={() => {
                        if (!item) return;
                        const num = '919866006648';
                        const link = `${window.location.origin}/gallery/${item._id || item.id}`;
                        const msg = encodeURIComponent(
                          `Hello, I'm interested in this gallery setup and would like to chat about it.\n\nLink: ${link}`,
                        );
                        window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
                      }}
                      className="bg-transparent border border-white/30 flex-1 text-white px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-white/10 transition-all whitespace-nowrap font-bold flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">chat</span>
                      WhatsApp
                    </button>
                  </div>
                </div>
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
              <div className="p-6 rounded-3xl bg-[#2A2825] text-white relative overflow-hidden shadow-lg border border-white/5">
                <div className="relative z-10 flex flex-col items-center text-center gap-5">
                  <div>
                    <h4 className="font-headline-sm mb-1 text-[#C4A87C] font-normal tracking-wide">
                      Need a Custom Theme?
                    </h4>
                    <p className="font-body-sm text-white/90 font-medium">
                      Personalize this setup to perfectly match your vision.
                    </p>
                  </div>
                  <div className="flex flex-row gap-2 w-full">
                    <button
                      onClick={() => navigate(`/custom-orders?gallery=${item._id || item.id}`)}
                      className="bg-white text-black flex-1 px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-stone-200 transition-all whitespace-nowrap font-bold shadow-sm flex items-center justify-center"
                    >
                      Customize
                    </button>
                    <button
                      onClick={() => {
                        if (!item) return;
                        const num = '919866006648';
                        const link = `${window.location.origin}/gallery/${item._id || item.id}`;
                        const msg = encodeURIComponent(
                          `Hello, I'm interested in this gallery setup and would like to chat about it.\n\nLink: ${link}`,
                        );
                        window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
                      }}
                      className="bg-transparent border border-white/30 flex-1 text-white px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-white/10 transition-all whitespace-nowrap font-bold flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[14px]">chat</span>
                      WhatsApp
                    </button>
                  </div>
                </div>
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
          <section className="mt-6 md:mt-12 pt-6 md:pt-12 relative px-5 md:px-0">
            {/* Minimal Floral Line Divider */}
            <div className="w-full flex justify-center mb-10 md:mb-14">
              <div className="w-full max-w-[180px] flex items-center justify-center gap-3 opacity-60">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#C4A87C] to-[#C4A87C]" />
                <span
                  className="material-symbols-outlined text-[16px] text-[#C4A87C]"
                  style={{ fontVariationSettings: "'wght' 300" }}
                >
                  local_florist
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#C4A87C] to-[#C4A87C]" />
              </div>
            </div>

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
            className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#F5F5F7]/85 backdrop-blur-[32px] saturate-[180%] border-[0.5px] border-black/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] rounded-full h-[72px] px-2 flex items-center justify-between gap-2 select-none w-[calc(100%-2rem)] max-w-[340px]"
          >
            <button
              onClick={handleWishlistLook}
              className={`w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                isLiked
                  ? 'bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] border-[0.5px] border-black/[0.04]'
                  : 'bg-transparent text-[#8E8E93] hover:text-black/60'
              }`}
            >
              <motion.span
                animate={{
                  scale: isLiked ? [1, 1.3, 1] : 1,
                  color: isLiked ? '#ff2d55' : '#8E8E93',
                }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </motion.span>
            </button>
            <button
              onClick={handleShopLook}
              className="flex-1 bg-black text-white h-[60px] rounded-full font-label-sm text-[10px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-[0_4px_12px_rgba(0,0,0,0.15)] mr-1"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
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
