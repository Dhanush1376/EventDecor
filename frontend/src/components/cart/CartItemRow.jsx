import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { handleImageError, getOptimizedUrl, getBlurDataUri } from '../../utils/media/imageUtils';
import { useProduct } from '../../hooks/useProductQueries';
import { customOrderService } from '../../services/domainServices';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';

export const CartItemRow = React.memo(function CartItemRow({
  item,
  activeCartMode,
  settings,
  deliveryDateStr,
  removeItem,
  updateQuantity,
  handleMoveToWishlist,
  triggerNotification,
}) {
  const itemOldPrice = item.oldPrice || item.price;
  const savingsPct =
    itemOldPrice > item.price ? Math.round(((itemOldPrice - item.price) / itemOldPrice) * 100) : 0;

  // Fetch the live Custom Order from the API to bypass stale localStorage cache
  const { data: apiCustomOrder } = useQuery({
    queryKey: ['cartCustomOrder', item.id || item._id],
    queryFn: async () => {
      const res = await customOrderService.getById(item.id || item._id);
      return res.success ? res.data : res;
    },
    enabled: item.type === 'custom',
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  const customOrderData = apiCustomOrder || item.product;

  const actualProductId =
    customOrderData?.productId?._id ||
    customOrderData?.productId ||
    item.product?._id ||
    item.product?.id ||
    item.id ||
    item._id;
  const { data: realProduct } = useProduct(actualProductId, {
    enabled: Boolean(actualProductId),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const isItemNonRefundable = Boolean(
    item.isNonRefundable ||
    item.itemType === 'event' ||
    item.type === 'custom' ||
    activeCartMode === 'rental' ||
    realProduct?.isNonRefundable ||
    realProduct?.returnSettings?.isReturnable === false ||
    realProduct?.itemType === 'event' ||
    realProduct?.category === 'Events',
  );

  // For custom orders, dynamically pull title and image from the full product object
  // or fetch from API if missing.
  let displayTitle = item.title;
  if (item.type === 'custom') {
    const betterTitle =
      realProduct?.title ||
      realProduct?.name ||
      customOrderData?.customProduct?.name ||
      customOrderData?.productSnapshot?.title ||
      customOrderData?.quotation?.items?.[0]?.name ||
      customOrderData?.productSnapshot?.name ||
      customOrderData?.occasion;

    if (betterTitle) {
      displayTitle = betterTitle;
    } else if (item.title === 'Custom Order - Event' && customOrderData?.orderId) {
      displayTitle = `Custom Order ${customOrderData.orderId}`;
    }
  }

  let displayImage = item.imageSrc;
  if (item.type === 'custom') {
    if (customOrderData || realProduct) {
      displayImage =
        realProduct?.images?.[0] ||
        realProduct?.imageSrc ||
        customOrderData?.customProduct?.images?.[0]?.url ||
        customOrderData?.customProduct?.images?.[0] ||
        customOrderData?.productSnapshot?.image ||
        customOrderData?.quotation?.items?.[0]?.image ||
        customOrderData?.referenceImages?.[0] ||
        customOrderData?.inspirationImages?.[0] ||
        customOrderData?.files?.[0]?.url ||
        item.imageSrc;
    }
    if (!displayImage) {
      // Fallback elegant image for Custom Orders without uploaded references
      displayImage =
        'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=300&auto=format&fit=crop';
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -50, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      className={`bg-surface-bright rounded-lg shadow-xs p-3.5 relative group border transition-all duration-300 ${item.stock === 0 ? 'border-red-200' : 'border-outline-variant/40 hover:border-primary/20'}`}
    >
      {/* Top Right Close Icon */}
      <button
        onClick={() => {
          removeItem(item.id || item._id, item.variant, item.type);
          triggerNotification(`Removed "${item.title}"`);
        }}
        className="absolute top-3 right-3 text-secondary/60 hover:text-on-surface transition-colors cursor-pointer w-7 h-7 min-h-0 flex items-center justify-center rounded-full hover:bg-surface-container z-10"
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>

      <div className="flex gap-3 sm:gap-4">
        {/* Left Column: Image */}
        <div className="relative w-[85px] h-[115px] sm:w-[100px] sm:h-[130px] bg-surface-container rounded-md overflow-hidden flex-shrink-0 border border-outline-variant/20">
          {item.stock === 0 && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                Out of Stock
              </span>
            </div>
          )}
          <Link to={`/product/${item.id || item._id}`} className="w-full h-full block">
            <motion.img
              onError={handleImageError}
              whileHover={{ scale: 1.05 }}
              src={
                (displayImage ? getOptimizedUrl(displayImage, 100, 130) : '') ||
                getBlurDataUri(100, 130)
              }
              alt={displayTitle}
              className={`w-full h-full object-cover transition-transform ${item.stock === 0 ? 'grayscale' : ''} text-[10px] text-secondary/50 text-center flex items-center justify-center break-words`}
            />
          </Link>
        </div>

        {/* Right Details */}
        <div className="flex-1 min-w-0 pr-8 py-1">
          {activeCartMode === 'rental' && (
            <span className="inline-block bg-primary/10 text-primary text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-[3px] mb-2 border border-primary/20">
              Rental Item
            </span>
          )}
          <Link to={`/product/${item.id || item._id}`}>
            <h3 className="font-display font-medium text-[13px] sm:text-[14px] text-on-surface line-clamp-2 leading-tight">
              {displayTitle}
            </h3>
          </Link>
          {activeCartMode === 'custom' && (
            <div className="mt-2 space-y-1">
              <span className="inline-block bg-primary/10 text-primary text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-[3px] border border-primary/20">
                Custom Order
              </span>
              <p className="text-[10px] text-secondary/80 leading-snug font-medium line-clamp-2 pr-2">
                Bespoke customized order based on approved quotation.
              </p>
            </div>
          )}

          {/* Size & Qty controls */}
          <div className="flex items-center gap-3 mt-4">
            {item.variant && item.variant !== 'Default' && (
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded px-2.5 py-1 text-[12px] font-bold text-on-surface flex items-center gap-1">
                <span className="text-secondary/70 font-medium">Size:</span> {item.variant}
              </div>
            )}

            <div
              className={`flex items-center border border-outline-variant/60 rounded-md overflow-hidden bg-surface-container-lowest h-[36px] mt-1 ${item.stock === 0 ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  updateQuantity(item.id || item._id, item.variant, item.quantity - 1);
                }}
                className="w-10 h-full flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer min-h-0"
                aria-label="Decrease quantity"
              >
                <span className="material-symbols-outlined text-[16px]">remove</span>
              </button>
              <div className="w-8 h-full flex items-center justify-center font-display text-[13px] font-bold text-on-surface border-x border-outline-variant/30 bg-surface-bright">
                {item.quantity}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  updateQuantity(item.id || item._id, item.variant, item.quantity + 1);
                }}
                disabled={item.quantity >= item.stock}
                className={`w-10 h-full flex items-center justify-center transition-colors min-h-0 ${item.quantity >= item.stock ? 'text-secondary/30 cursor-not-allowed bg-surface-container-low' : 'text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer'}`}
                aria-label="Increase quantity"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>
          </div>

          {item.quantity >= item.stock && item.stock > 0 && (
            <span className="text-[10px] text-red-500 font-medium block mt-1">
              Maximum stock reached
            </span>
          )}

          {/* Pricing & Policy below Quantity (only for purchase) */}
          {activeCartMode === 'purchase' && (
            <div className="mt-3 flex flex-col gap-2 w-full">
              {/* Pricing Row */}
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-display text-[15px] font-semibold text-on-surface">
                  ₹{item.price.toLocaleString()}
                </span>
                {itemOldPrice > item.price && (
                  <span className="font-display text-[12px] text-secondary/50 line-through font-light">
                    ₹{itemOldPrice.toLocaleString()}
                  </span>
                )}
                {savingsPct > 0 && (
                  <span className="text-[10px] font-bold text-primary">{savingsPct}% Off</span>
                )}
              </div>

              {/* Return policy & delivery forecast strip */}
              <div className="text-[11px] text-secondary w-full">
                <div className="flex flex-col gap-1.5 mt-1">
                  {isItemNonRefundable ? (
                    <div className="flex items-center gap-1.5 text-[#d97706] font-bold whitespace-nowrap text-[10px]">
                      <span className="material-symbols-outlined text-[13px]">block</span>
                      Non-Refundable
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px]">
                      <span className="material-symbols-outlined text-[13px]">keyboard_return</span>
                      <span>
                        <span className="font-display font-semibold text-on-surface text-[12px]">
                          {item.product?.returnSettings?.returnWindow ||
                            item.product?.returnSettings?.returnWindowDays ||
                            settings?.returnsExchanges?.returnWindowDays ||
                            14}{' '}
                          days
                        </span>{' '}
                        return available
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px]">
                    {Boolean(
                      item.itemType === 'event' ||
                      realProduct?.itemType === 'event' ||
                      realProduct?.category === 'Events',
                    ) ? (
                      <>
                        <span className="material-symbols-outlined text-[13px]">event</span>
                        <span>Event setup date to be confirmed</span>
                      </>
                    ) : activeCartMode === 'rental' ? (
                      <>
                        <span className="material-symbols-outlined text-[13px]">
                          local_shipping
                        </span>
                        <span>Delivery schedule to be coordinated</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[13px]">
                          local_shipping
                        </span>
                        <span>
                          Delivery by{' '}
                          <span className="text-on-surface font-display font-semibold text-[12px]">
                            {deliveryDateStr}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing & Policy below Quantity (for custom orders) */}
          {activeCartMode === 'custom' && (
            <div className="mt-3 flex flex-col gap-2 w-full">
              {/* Pricing Row */}
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-display text-[15px] font-semibold text-on-surface">
                  ₹{(item.price * item.quantity).toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-secondary uppercase tracking-widest">
                  Total Quoted Price
                </span>
              </div>

              {/* Return policy & delivery forecast strip */}
              <div className="text-[11px] text-secondary w-full">
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center gap-1.5 text-[#d97706] font-bold whitespace-nowrap text-[10px]">
                    <span className="material-symbols-outlined text-[13px]">block</span>
                    Custom Orders are Non-Refundable
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px]">
                    <span className="material-symbols-outlined text-[13px]">info</span>
                    <span>Final delivery schedule to be coordinated</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rental pricing & policy details (displayed below the photo with premium styling) */}
      {activeCartMode === 'rental' && (
        <div className="mt-3 pt-3 border-t border-outline-variant/10 flex flex-col gap-2.5 w-full text-[11px] text-secondary">
          {/* Total Due Row */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-display text-[16px] font-semibold text-on-surface">
              ₹{((item.price + (item.deposit || 0)) * item.quantity).toLocaleString()}
            </span>
            <span className="text-[9px] font-bold text-secondary uppercase tracking-widest">
              Total Due
            </span>
            <span className="text-secondary/25 mx-1 font-light">|</span>
            <span className="text-[11px] text-secondary">
              Fee: <span className="font-display font-medium">₹{item.price.toLocaleString()}</span>
            </span>
            <span className="text-secondary/25 font-light">•</span>
            <span className="text-[11px] text-primary font-bold">
              Deposit:{' '}
              <span className="font-display font-medium">
                ₹{item.deposit?.toLocaleString() || 0}
              </span>
            </span>
          </div>

          {/* Duration & Deposit details */}
          <div className="flex flex-col gap-2 mt-0.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-primary shrink-0">
                calendar_month
              </span>
              <span>
                Duration:{' '}
                <span className="font-extrabold text-primary uppercase text-[9.5px] tracking-wider ml-1">
                  Select at checkout <ArrowRight className="w-3 h-3 inline-block ml-1 -mt-0.5" />
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-[#8c7335] shrink-0">
                lock
              </span>
              <span>
                Refundable Deposit:{' '}
                <span className="font-display font-semibold text-on-surface text-[12px] ml-1">
                  ₹{item.deposit?.toLocaleString() || 0}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Button inside Card */}
      <div className="border-t border-outline-variant/30 mt-2 pt-2 text-center">
        <button
          onClick={() => handleMoveToWishlist(item)}
          className="text-[9px] font-bold text-primary uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center justify-center w-full gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[11px]">favorite_border</span>
          Move to Wishlist
        </button>
      </div>
    </motion.div>
  );
});
