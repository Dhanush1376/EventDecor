import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { m as motion } from 'framer-motion';

export function ProductInfo({ product, atcRef, maxQuantity = 10 }) {
  const navigate = useNavigate();
  const { attemptAddToCart } = useCart();
  const { toggleItem, isWishlisted } = useWishlist();
  const { runProtectedAction } = useAuth();
  const [quantity, setQuantity] = React.useState(1);
  const [added, setAdded] = React.useState(false);
  const [startingChat, setStartingChat] = React.useState(false);

  const handleWhatsAppChat = () => {
    if (!product) return;
    const num = '919866006648';
    const productLink = `${window.location.origin}/product/${product._id || product.id}`;
    const baseMsg = `Hello, I'm interested in this product and would like to chat about it.\n\nProduct Link: ${productLink}`;
    const msg = encodeURIComponent(baseMsg);
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  const canPurchase = !product?.availabilityMode || product.availabilityMode !== 'rent_only';
  const canRent =
    product?.rentalEnabled &&
    (product.availabilityMode === 'rent_only' || product.availabilityMode === 'both');

  if (!product) return null;

  const oldPrice = product?.oldPrice || 0;
  const discount =
    oldPrice > 0 && product?.price ? Math.round(((oldPrice - product.price) / oldPrice) * 100) : 0;
  const wishlisted = isWishlisted(product?._id || product?.id);

  const handleWishlist = () => {
    if (!product) return;
    runProtectedAction(() => {
      toggleItem({
        id: product._id || product.id,
        title: product.title,
        price: product.price,
        imageSrc: product.imageSrc || product.image,
      });
    });
  };

  const handleAddToCart = () => {
    runProtectedAction(() => {
      attemptAddToCart({
        id: product._id || product.id,
        title: product.title,
        price: product.price,
        imageSrc: product.imageSrc || product.image,
        formattedPrice: `Rs. ${product.price?.toLocaleString()}`,
        quantity: quantity,
        type: 'purchase',
        isNonRefundable: product.isNonRefundable,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    });
  };

  const handleRentNow = () => {
    runProtectedAction(() => {
      attemptAddToCart({
        id: product._id || product.id,
        title: product.title,
        price:
          product.rentalPricing?.daily ||
          product.rentalPricing?.weekly ||
          product.rentalPricing?.monthly ||
          product.price,
        imageSrc: product.imageSrc || product.image,
        formattedPrice: `Rs. ${product.price?.toLocaleString()}`,
        quantity: quantity,
        type: 'rental',
        deposit: product.securityDeposit || 0,
        isNonRefundable: product.isNonRefundable,
      });
      navigate('/cart');
    });
  };

  return (
    <div className="flex flex-col gap-6 md:gap-7 lg:sticky lg:top-32">
      {/* Category & Badge Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <span className="font-label text-[11px] md:text-[12px] text-primary uppercase tracking-[0.4em] font-medium">
            {product.category || 'Artisanal Collection'}
          </span>
          <span className="w-1 h-1 rounded-full bg-primary/40"></span>
          <span className="font-label text-[11px] md:text-[12px] text-on-surface/50 uppercase tracking-widest font-normal">
            Heritage Series
          </span>
        </div>
        <div className="flex gap-2">
          <div className="relative group/badge">
            <div className="w-9 h-9 rounded-full bg-primary-container/10 border border-primary-container/20 flex items-center justify-center shadow-sm cursor-default hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[16px] text-primary">
                workspace_premium
              </span>
            </div>
            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-on-surface text-surface text-[12px] uppercase tracking-widest rounded-md opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold shadow-xl">
              Bestseller
            </span>
          </div>
          <div className="relative group/badge">
            <div className="w-9 h-9 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shadow-sm cursor-default hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[16px] text-on-surface">draw</span>
            </div>
            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-on-surface text-surface text-[12px] uppercase tracking-widest rounded-md opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold shadow-xl">
              Handmade
            </span>
          </div>
        </div>
      </div>

      {/* Product Title & Metadata - Luxury Editorial */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 md:space-y-3 flex-1">
          <h2 className="flex flex-col gap-1.5 font-display text-[26px] sm:text-[30px] md:text-[38px] text-on-surface leading-[1.1] tracking-[-0.01em] font-light">
            <span>{product.title}</span>
            {(product.teluguTitle || product.nameTE || product.teluguName) && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-on-surface/70 font-display text-[18px] sm:text-[22px] md:text-[26px] font-extralight">
                  {product.teluguTitle || product.nameTE || product.teluguName}
                </span>
                <span className="w-8 sm:w-12 h-px bg-primary/40 shrink-0"></span>
                <span
                  className="material-symbols-outlined text-[14px] sm:text-[16px] text-primary/60 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
              </div>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {(product.reviewCount || product.reviews || 0) > 0 && (
              <button
                onClick={() => {
                  const el = document.getElementById('reviews-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2.5 hover:opacity-80 active:scale-98 transition-all cursor-pointer text-left outline-none"
              >
                <div className="flex items-center gap-0.5 text-primary-container">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-[13px] sm:text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="font-body-sm text-on-surface/60 font-semibold text-[12px] sm:text-[13px] underline decoration-dotted decoration-primary/45 hover:text-primary transition-colors">
                  {product.reviewCount || product.reviews} Verified Reviews
                </span>
              </button>
            )}

            {(product.reviewCount || product.reviews || 0) > 0 && product.isFeatured && (
              <span className="w-1 h-1 rounded-full bg-on-surface/20"></span>
            )}

            {product.isFeatured && (
              <span className="font-label-sm text-[11px] sm:text-[12px] text-green-700 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                Trending this week
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pricing & Shipping */}
      <div className="py-2 border-b border-outline-variant/10">
        <div className="flex flex-wrap items-baseline gap-3 mb-4">
          <span className="font-body text-[24px] sm:text-[32px] text-on-surface font-medium">
            Rs. {product.price?.toLocaleString()}
          </span>
          {oldPrice && (
            <span className="font-body-sm text-on-surface/40 font-medium line-through text-[13px] sm:text-[15px]">
              Rs. {oldPrice.toLocaleString()}
            </span>
          )}
          <span className="text-primary font-label-sm text-[11px] sm:text-[12px] font-bold">
            ({discount}% off)
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-on-surface/70">
            <span className="material-symbols-outlined text-[18px] text-primary/60">
              local_shipping
            </span>
            <span className="font-body-sm text-[13px] sm:text-[14px] font-medium italic">
              All India premium shipping included
            </span>
          </div>
          <div className="flex items-center gap-3 text-on-surface/70">
            <span className="material-symbols-outlined text-[18px] text-primary/60">
              event_available
            </span>
            <span className="font-body-sm text-[13px] sm:text-[14px] font-medium italic">
              Delivered nationwide in 3-5 working days
            </span>
          </div>
          {product.isNonRefundable && (
            <div className="flex items-start gap-3 mt-4 p-3.5 bg-[#fffbeb] rounded-xl border border-[#fde68a]">
              <span className="material-symbols-outlined text-[18px] text-[#d97706] mt-0.5 shrink-0">
                block
              </span>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold text-[#b45309] uppercase tracking-wider">
                  Non-Refundable Item
                </span>
                <span className="text-[12px] text-[#92400e] font-medium italic">
                  Returns and refunds are not available for this product.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rental Pricing Section */}
      {canRent && product.rentalPricing && (
        <div className="py-6 border-b border-outline-variant/10">
          <div className="p-5 rounded-2xl bg-[#fdfbf7] border border-[#e0d6b8] shadow-sm relative overflow-hidden group">
            {/* Decorative subtle pattern or gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#f5ecd5]/50 to-transparent rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="material-symbols-outlined text-[18px] text-[#8c7335]">
                  event_available
                </span>
                <span className="font-label-sm text-[11px] sm:text-[12px] text-[#8c7335] uppercase tracking-[0.25em] font-extrabold">
                  Available for Rent
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {product.rentalPricing.daily > 0 && (
                  <div className="px-3 py-3 bg-white rounded-xl border border-[#e0d6b8]/50 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <span className="block text-[15px] sm:text-[17px] font-bold text-[#2a2c2a]">
                      ₹{product.rentalPricing.daily.toLocaleString()}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-[#5a5c5a] uppercase tracking-widest font-bold mt-0.5 block">
                      per day
                    </span>
                  </div>
                )}
                {product.rentalPricing.weekly > 0 && (
                  <div className="px-3 py-3 bg-white rounded-xl border border-[#e0d6b8]/50 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <span className="block text-[15px] sm:text-[17px] font-bold text-[#2a2c2a]">
                      ₹{product.rentalPricing.weekly.toLocaleString()}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-[#5a5c5a] uppercase tracking-widest font-bold mt-0.5 block">
                      per week
                    </span>
                  </div>
                )}
                {product.rentalPricing.monthly > 0 && (
                  <div className="px-3 py-3 bg-white rounded-xl border border-[#e0d6b8]/50 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <span className="block text-[15px] sm:text-[17px] font-bold text-[#2a2c2a]">
                      ₹{product.rentalPricing.monthly.toLocaleString()}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-[#5a5c5a] uppercase tracking-widest font-bold mt-0.5 block">
                      per month
                    </span>
                  </div>
                )}
              </div>

              {product.securityDeposit > 0 && (
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#e0d6b8]/50 shadow-sm mt-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#8c7335]">
                      lock
                    </span>
                    <span className="text-[11px] sm:text-[12px] font-bold text-[#5a5c5a] uppercase tracking-wider">
                      Security Deposit:
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[14px] font-bold text-[#2a2c2a]">
                      ₹{product.securityDeposit.toLocaleString()}
                    </span>
                    {product.isDepositRefundable && (
                      <span className="block text-[9px] text-green-700 uppercase tracking-widest font-bold mt-0.5">
                        (Fully Refundable)
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-[#fdfbf7] rounded-xl border border-dashed border-[#e0d6b8]">
                <span className="material-symbols-outlined text-[16px] text-[#8c7335] shrink-0 mt-0.5">
                  calendar_month
                </span>
                <p className="text-[11px] text-[#5a5c5a] leading-relaxed">
                  <strong className="text-[#2a2c2a] uppercase tracking-wider">Availability:</strong>{' '}
                  You can select your exact rental dates during the checkout process. Real-time
                  availability will be verified before payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Description Section */}
      <div className="space-y-2 mt-2">
        <h3 className="font-label-sm text-[10px] text-on-surface/35 uppercase tracking-[0.25em] font-medium">
          About this Item
        </h3>
        <p className="font-body-md text-on-surface/80 font-normal leading-relaxed text-[14px] sm:text-[15px]">
          {product.description ||
            'A beautiful handmade item that mixes traditional Indian design with modern style.'}
        </p>
      </div>

      {/* Action CTA Stack */}
      <div className="space-y-6 mt-4">
        {canPurchase && product.stock != null && product.stock <= 5 && product.stock > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-[#fcfbf9] border border-primary/20 shadow-sm">
            <span className="material-symbols-outlined text-primary text-[16px] animate-pulse font-bold">
              bolt
            </span>
            <span className="font-label-sm text-[10px] text-primary uppercase tracking-[0.2em] font-bold">
              {product.stock === 1
                ? 'LAST PIECE IN COLLECTION'
                : `ONLY ${product.stock} LEFT IN COLLECTION`}
            </span>
          </div>
        )}

        {/* Action Buttons */}

        <div className="grid grid-cols-2 gap-3">
          {canPurchase && (
            <button
              ref={atcRef}
              onClick={handleAddToCart}
              className={`!py-3 rounded-full flex items-center justify-center gap-2 group cursor-pointer shadow-xl transition-all font-bold px-4 ${
                added
                  ? 'bg-[#e0d6b8] text-[#1a1c1a]'
                  : 'bg-black text-white hover:bg-[#e0d6b8] hover:text-[#1a1c1a]'
              }`}
            >
              {added ? (
                <>
                  <span className="material-symbols-outlined text-[16px] shrink-0">check</span>
                  <span className="text-[11px] uppercase tracking-widest">Added</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px] group-hover:rotate-12 transition-transform shrink-0">
                    shopping_bag
                  </span>
                  <span className="text-[11px] uppercase tracking-widest">Bag</span>
                </>
              )}
            </button>
          )}
          {canRent && (
            <button
              onClick={handleRentNow}
              className={`!py-3 rounded-full flex items-center justify-center gap-2 group cursor-pointer shadow-xl transition-all font-bold px-4 bg-[#8c7335] text-white hover:bg-[#725c29]`}
            >
              <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform shrink-0">
                event_available
              </span>
              <span className="text-[11px] uppercase tracking-widest">Rent</span>
            </button>
          )}

          <button
            onClick={handleWishlist}
            className="bg-white text-black border border-black/10 !py-3 rounded-full flex items-center justify-center gap-2 group cursor-pointer font-bold px-4 hover:border-black/30 transition-all shadow-sm"
          >
            <motion.span
              animate={{
                scale: wishlisted ? [1, 1.3, 1] : 1,
                color: wishlisted ? '#ff2d55' : 'var(--color-primary)',
              }}
              whileTap={{ scale: 0.8 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
              className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-all duration-300 shrink-0"
              style={{
                fontVariationSettings: wishlisted ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              favorite
            </motion.span>
            <span className="text-[11px] uppercase tracking-widest">
              {wishlisted ? 'Saved' : 'Save'}
            </span>
          </button>
        </div>

        {/* Custom Design Consultation Card */}
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
                onClick={() =>
                  runProtectedAction(() =>
                    navigate(`/custom-orders?product=${product._id || product.id}`),
                  )
                }
                className="bg-white text-black flex-1 px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-stone-200 transition-all whitespace-nowrap font-bold shadow-sm flex items-center justify-center"
              >
                Customize
              </button>
              <button
                onClick={() => runProtectedAction(handleWhatsAppChat)}
                className="bg-transparent border border-white/30 flex-1 text-white px-2 py-2.5 rounded-full font-label-sm text-[10px] uppercase tracking-[0.15em] hover:bg-white/10 transition-all whitespace-nowrap font-bold flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">chat</span>
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Signifiers Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-outline-variant/10">
        <FeatureItem icon="draw" label="Handmade Work" />
        <FeatureItem icon="workspace_premium" label="100% Original" />
        <FeatureItem icon="all_inclusive" label="Lifetime Warranty" />
        <FeatureItem icon="public" label="Fairly Sourced" />
      </div>
    </div>
  );
}

function FeatureItem({ icon, label }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 group cursor-default">
      <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary-container/20 transition-colors shadow-2xs">
        <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
      </div>
      <span className="font-label-sm text-[11px] text-on-surface/60 uppercase tracking-widest font-normal">
        {label}
      </span>
    </div>
  );
}
