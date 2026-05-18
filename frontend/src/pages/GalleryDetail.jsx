import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWishlist } from "../context/WishlistContext";
import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { ShareButton } from "../components/ui/ShareButton";
import { galleryService, productService } from "../services/domainServices";

export function GalleryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleItem, isWishlisted } = useWishlist();
  
  const [item, setItem] = useState(null);
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [moreLikeThis, setMoreLikeThis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await galleryService.getById(id);
        if (res.success) {
          setItem(res.data);
          if (res.data.linkedProducts && res.data.linkedProducts.length > 0) {
            setLinkedProducts(res.data.linkedProducts || []);
          }
        }

        // Fetch recommendations
        const recRes = await galleryService.getAll({ limit: 6 });
        if (recRes.success) {
          const recs = recRes.data.data || recRes.data.items || recRes.data || [];
          setMoreLikeThis(recs.filter(gi => (gi._id || gi.id) !== id).slice(0, 6));
        }
      } catch (err) {
        console.error("Failed to fetch discovery details", err);
        setError("Could not load discovery details.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!item)
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  const handleShopLook = () => {
    if (linkedProducts.length > 0) {
      const prod = linkedProducts[0];
      const prodId = prod._id || prod.id;
      navigate(`/product/${prodId}`);
    } else {
      navigate("/collections");
    }
  };

  const handleWishlistLook = () => {
    if (linkedProducts.length > 0) {
      const prod = linkedProducts[0];
      toggleItem({ ...prod, id: prod._id || prod.id, image: prod.imageSrc });
    }
  };

  const linkedProdId = linkedProducts.length > 0 ? (linkedProducts[0]._id || linkedProducts[0].id) : null;

  return (
    <div className="bg-surface-container-low min-h-screen selection:bg-primary/20 relative pt-[56px] md:pt-24 pb-32 md:pb-20 overflow-hidden">
      {/* Top-right decorative art anchor */}
      <MandalaArtDecor
        variant={2}
        size={400}
        className="-top-20 -right-20 hidden lg:block absolute"
        opacity={0.1}
        spinDuration={240}
      />
      <MandalaArtDecor
        variant={2}
        size={200}
        className="-top-10 -right-10 lg:hidden absolute"
        opacity={0.12}
        spinDuration={240}
      />
      <SEO title={item.title} description={item.description} />
      {/* Breadcrumbs (Integrated) */}

      <nav
        className="hidden md:flex items-center justify-center gap-2 font-label text-[12px] uppercase tracking-widest mb-6 text-on-surface/40"
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
        <span className="text-black font-bold">{item.title}</span>
      </nav>

      {/* Mobile-Only Navigation - Moved below the navbar to prevent overlap */}
      <nav className="md:hidden fixed top-[72px] left-0 right-0 z-[110] px-4 py-2 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto w-9 h-9 rounded-full bg-white/90 backdrop-blur-md hover:bg-gray-100 flex items-center justify-center transition-all shadow-md"
        >
          <span className="material-symbols-outlined text-black text-[20px]">
            arrow_back
          </span>
        </button>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleWishlistLook}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md transition-all active:scale-90"
          >
            <motion.span
              animate={{
                scale:
                  linkedProdId && isWishlisted(linkedProdId)
                    ? [1, 1.3, 1]
                    : 1,
                color:
                  linkedProdId && isWishlisted(linkedProdId)
                    ? "#ff2d55"
                    : "#1a1817",
              }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
              className="material-symbols-outlined text-[20px]"
              style={{
                fontVariationSettings:
                  linkedProdId && isWishlisted(linkedProdId)
                    ? "'FILL' 1"
                    : "'FILL' 0",
              }}
            >
              favorite
            </motion.span>
          </button>
          <ShareButton 
            url={typeof window !== 'undefined' ? window.location.href : ''} 
            title={`${item.title} - Siri Arts & Crafts Gallery`}
            description={item.description}
            variant="custom"
            size="custom"
            iconOnly={true}
            className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md text-black transition-all"
          />
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto md:px-4">
        <div className="flex flex-col lg:flex-row gap-8 items-start relative">
          {/* Main Focus Card (Standard Laptop Scale, No z-index overlapping) */}
          <div className="w-full lg:flex-[1.5] lg:sticky lg:top-24 z-0 md:z-auto">
            <div className="bg-white md:rounded-[32px] overflow-hidden md:shadow-xl flex flex-col border border-black/5">
              {/* Image Section */}
              <div className="w-full relative bg-[#f9f8f6]">
                <img
                  onError={handleImageError}
                  src={item.image}
                  alt={item.title}
                  className="w-full h-auto object-cover max-h-[85vh] md:max-h-[55vh] mx-auto block"
                  loading="eager"
                  width={1200}
                  height={800}
                />

                {/* Desktop Only Actions - Inlined to avoid navbar overlap */}
                <div className="hidden md:flex absolute top-4 right-4 flex-col gap-2">
                  <button
                    onClick={handleWishlistLook}
                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-primary/10 transition-all text-black active:scale-90"
                  >
                    <motion.span
                      animate={{
                        scale:
                          linkedProdId && isWishlisted(linkedProdId)
                            ? [1, 1.3, 1]
                            : 1,
                        color:
                          linkedProdId && isWishlisted(linkedProdId)
                            ? "#ff2d55"
                            : "#1a1817",
                      }}
                      transition={{
                        duration: 0.3,
                        type: "spring",
                        stiffness: 300,
                      }}
                      className="material-symbols-outlined text-[18px]"
                      style={{
                        fontVariationSettings:
                          linkedProdId && isWishlisted(linkedProdId)
                            ? "'FILL' 1"
                            : "'FILL' 0",
                      }}
                    >
                      favorite
                    </motion.span>
                  </button>
                  <ShareButton 
                    url={typeof window !== 'undefined' ? window.location.href : ''} 
                    title={`${item.title} - Siri Arts & Crafts Gallery`}
                    description={item.description}
                    variant="custom"
                    size="custom"
                    iconOnly={true}
                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-all text-black"
                  />
                </div>
              </div>

              {/* Information Section */}
              <div className="w-full p-6 md:p-10 bg-white">
                <div className="flex items-center justify-between gap-4 mb-8 md:mb-10">
                  <div className="space-y-1 md:space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-label text-[9px] md:text-[11px] uppercase tracking-[0.3em] text-primary font-bold">
                        {item.category}
                      </span>
                      <div className="h-px w-4 md:w-6 bg-primary/20" />
                      <span className="font-display text-[10px] md:text-base text-black/30 line-clamp-1">
                        {item.style}
                      </span>
                    </div>
                    <h1 className="font-display text-[20px] md:text-[32px] text-black leading-tight font-bold tracking-tight">
                      {item.title}.
                    </h1>
                  </div>

                  <button
                    onClick={handleShopLook}
                    className="bg-primary text-white h-11 md:h-auto px-5 md:px-8 md:py-3.5 rounded-full font-label text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold shadow-lg hover:shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px] md:text-[18px]">
                      shopping_bag
                    </span>
                    <span className="hidden sm:inline">Shop look</span>
                    <span className="sm:hidden text-[9px]">Shop</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-6">
                    <div className="relative p-6 md:p-8 bg-surface-bright rounded-[28px] border border-outline-variant/10">
                      <span className="material-symbols-outlined absolute -top-3 -left-3 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-md border-4 border-white text-[12px]">
                        format_quote
                      </span>
                      <p className="font-body text-[15px] md:text-[17px] text-on-surface/80 font-medium leading-relaxed mb-4">
                        {item.description}
                      </p>
                      <p className="font-body text-on-surface/40 leading-relaxed text-[12px] md:text-[13px] font-medium">
                        {item.story}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="p-6 md:p-7 rounded-[24px] bg-primary/5 border border-primary/10 space-y-3">
                      <h4 className="font-body text-lg text-black font-bold leading-none">
                        Custom Studio
                      </h4>
                      <p className="font-body text-black/40 text-[11px] leading-relaxed font-medium">
                        Collaborate with our studio artisans to recreate this
                        vision for your space.
                      </p>
                      <Link
                        to="/contact"
                        className="block text-center bg-black text-white py-3 md:py-3 rounded-full font-label text-[11px] uppercase tracking-widest font-bold hover:bg-primary transition-all"
                      >
                        Inquire
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[380px] shrink-0 p-6 md:p-0">
            <h3 className="font-label text-[11px] uppercase tracking-[0.3em] text-black font-bold mb-6 px-2">
              Discovery Feed
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {moreLikeThis.map((sim) => (
                <Link
                  key={sim.id}
                  to={`/gallery/${sim.id}`}
                  className="block group mb-4"
                >
                  <div className="relative rounded-[20px] overflow-hidden bg-white shadow-lg aspect-[3/4]">
                    <img
                      onError={handleImageError}
                      src={sim.image}
                      alt={sim.title}
                      className="w-full h-full object-cover transition-transform duration-[1s] group-hover:scale-110"
                      loading="lazy"
                      width={400}
                      height={533}
                    />

                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-3 px-2">
                    <span className="font-label text-[11px] uppercase tracking-widest text-primary font-bold block mb-1">
                      {sim.category}
                    </span>

                    <h4 className="font-display text-xs md:text-sm text-black leading-tight line-clamp-1">
                      {sim.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Subtle background art anchor at the bottom */}
        <MandalaArtDecor
          variant={1}
          size={500}
          className="-bottom-20 -left-20 hidden lg:block z-0"
          opacity={0.15}
          spinDuration={180}
        />
        <MandalaArtDecor
          variant={1}
          size={250}
          className="-bottom-10 -left-10 lg:hidden z-0"
          opacity={0.2}
          spinDuration={180}
        />
      </main>

      {/* Mobile Floating Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[120] p-4 bg-gradient-to-t from-[#efefef] via-[#efefef]/95 to-transparent">
        <div className="max-w-md mx-auto bg-black rounded-[28px] p-2 flex items-center gap-2 shadow-2xl border border-white/5">
          <button
            onClick={handleWishlistLook}
            className={`w-14 h-14 rounded-[22px] flex items-center justify-center transition-all active:scale-90 ${linkedProdId && isWishlisted(linkedProdId) ? "bg-primary/20 text-white" : "bg-white/10 text-white"}`}
          >
            <motion.span
              animate={{
                scale:
                  linkedProdId && isWishlisted(linkedProdId)
                    ? [1, 1.3, 1]
                    : 1,
                color:
                  linkedProdId && isWishlisted(linkedProdId)
                    ? "#ff2d55"
                    : "#ffffff",
              }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
              className="material-symbols-outlined text-[24px]"
              style={{
                fontVariationSettings:
                  linkedProdId && isWishlisted(linkedProdId)
                    ? "'FILL' 1"
                    : "'FILL' 0",
              }}
            >
              favorite
            </motion.span>
          </button>
          <button
            onClick={handleShopLook}
            className="flex-1 bg-primary text-white h-14 rounded-[22px] font-label text-[11px] uppercase tracking-[0.3em] font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[20px]">
              shopping_bag
            </span>
            Shop Look
          </button>
        </div>
      </div>

      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay z-[400] bg-marble" />
    </div>
  );
}
