import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { OptimizedImage } from '../ui';
import { useRazorpay } from '../../hooks/useRazorpay';
import toast from 'react-hot-toast';

const GPSMap = React.lazy(() => import('../../pages/GPSMapLazy'));

export function OrderDetail() {
  const {
    selectedOrder: order,
    selectedItem: item,
    _selectedOrderItemIndex,
    isPriceDetailsOpen,
    setIsPriceDetailsOpen,
    downloadInvoice,
    setReviewingProduct,
    user,
  } = useDashboard();
  const { resumePayment } = useRazorpay();
  const [isResuming, setIsResuming] = React.useState(false);

  if (!order || !item) return null;

  const prodTitle =
    item.title ||
    (typeof item.productId === 'object' ? item.productId?.title : null) ||
    'Artisanal Piece';
  const prodPrice =
    item.price || (typeof item.productId === 'object' ? item.productId?.price : 0) || 0;
  const prodImage =
    item.imageSrc ||
    (typeof item.productId === 'object'
      ? item.productId?.imageSrc || item.productId?.images?.[0]
      : null) ||
    '';
  const prodVariant = item.variant || 'Default';
  const discount =
    order.discount ||
    (item.originalPrice ? Math.max(0, (item.originalPrice - item.price) * item.quantity) : 0);
  const status = order.orderStatus || 'Confirmed';
  const isDelivered = status?.toLowerCase() === 'delivered';

  return (
    <div className="space-y-6 text-left">
      {/* Product Summary Hero Card */}
      <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-4 sm:p-6 shadow-2xs hover:shadow-xs transition-all duration-300">
        <div className="flex flex-row items-start gap-4 sm:gap-6">
          <div className="w-24 h-32 sm:w-40 sm:h-52 rounded-lg overflow-hidden bg-surface-container border border-outline-variant/25 shrink-0 shadow-sm relative group/image">
            <OptimizedImage
              src={prodImage}
              alt={prodTitle}
              containerClassName="w-full h-full"
              className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300" />
          </div>
          <div className="flex-1 text-left space-y-3 w-full min-w-0">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[8px] sm:text-[9px] bg-primary/10 text-primary px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-bold uppercase tracking-widest border border-primary/20 inline-block">
                  Siri Atelier Piece
                </span>
                <span className="text-[8px] sm:text-[9px] text-secondary font-mono tracking-wider">
                  ID: {order._id}
                </span>
              </div>
              <h3 className="font-display font-medium text-base sm:text-2xl text-on-surface leading-tight">
                {prodTitle}
              </h3>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
              <div className="bg-surface-container/60 border border-outline-variant/30 text-secondary text-[9px] sm:text-[10px] px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full font-medium">
                Variant: <strong className="text-on-surface font-semibold">{prodVariant}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-surface-container/60 flex flex-wrap items-baseline gap-3 sm:gap-6">
              <div className="space-y-0.5">
                <span className="block text-[8px] uppercase tracking-wider font-bold text-secondary">
                  Purchase Price
                </span>
                <span className="text-base sm:text-xl font-bold text-primary font-body">
                  ₹{(prodPrice * (item.quantity || 1)).toLocaleString()}
                </span>
              </div>
              {item.originalPrice && item.originalPrice > prodPrice && (
                <div className="space-y-0.5">
                  <span className="block text-[8px] uppercase tracking-wider font-bold text-secondary">
                    Original Value
                  </span>
                  <span className="text-xs sm:text-sm text-secondary line-through font-light font-body">
                    ₹{(item.originalPrice * (item.quantity || 1)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Tracker & Stamp Seal */}
      <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-6 shadow-2xs relative overflow-hidden">
        {/* Left Tracker */}
        <div className="w-full space-y-5 text-left pr-16 pr-24">
          <div className="flex items-center gap-3">
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ring-4 ${
                status?.toLowerCase() === 'delivered'
                  ? 'bg-emerald-600 ring-emerald-100'
                  : 'bg-amber-600 ring-amber-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <h4 className="font-bold text-xs sm:text-sm text-on-surface uppercase tracking-widest pr-4 sm:pr-0">
              {status?.toLowerCase() === 'delivered'
                ? 'Item Delivered Successfully'
                : `Order Journey Status: ${status}`}
            </h4>
          </div>

          <div className="relative pl-1">
            {/* Dotted Connection Line */}
            <div className="absolute left-3 top-2 bottom-2 w-0.5 border-l border-dashed border-outline-variant/60" />

            <div className="space-y-5 pl-7 text-xs">
              {/* Event 1 */}
              <div className="relative">
                <span className="absolute -left-7 top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary-container/20" />
                <strong className="text-on-surface block font-bold">Order Confirmed</strong>
                <span className="text-[10px] text-secondary font-light">
                  Dispatched into production ledger
                </span>
                <span className="block text-[9px] text-secondary/70 font-mono mt-0.5">
                  {new Date(order.createdAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <span
                  className={`absolute -left-7 top-1 w-2.5 h-2.5 rounded-full ${order.updatedAt ? 'bg-primary ring-4 ring-primary-container/20' : 'bg-outline-variant'}`}
                />
                <strong className="text-on-surface block font-bold">Processed & Shipped</strong>
                <span className="text-[10px] text-secondary font-light">
                  In transit with Courier Logistics
                </span>
                {order.trackingNumber && (
                  <span className="block text-[9px] text-[#8c7335] font-semibold uppercase mt-0.5">
                    AWB: {order.trackingNumber}
                  </span>
                )}
              </div>

              {/* Event 3 */}
              <div className="relative">
                <span
                  className={`absolute -left-7 top-1 w-2.5 h-2.5 rounded-full ${status?.toLowerCase() === 'delivered' ? 'bg-emerald-600 ring-4 ring-emerald-100' : 'bg-outline-variant'}`}
                />
                <strong className="text-on-surface block font-bold">Delivery Completed</strong>
                <span className="text-[10px] text-secondary font-light">
                  Signature check & hand-off validation active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Overlapping Gold Seal Stamp (Wax Seal Style) */}
        <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 origin-top-right">
          <motion.div
            initial={{ rotate: -12, scale: 0.95 }}
            animate={{ rotate: 8 }}
            whileHover={{ rotate: 20, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 220, damping: 12 }}
            className="cursor-pointer select-none"
          >
            <svg
              className="w-20 h-20 sm:w-26 sm:h-26 text-[#8c7335] drop-shadow-md"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M40 70 L30 95 L50 85 L70 95 L60 70" fill="#8c7335" opacity="0.8" />
              <path d="M45 70 L38 90 L50 82 L62 90 L55 70" fill="#8c7335" />
              <circle cx="50" cy="50" r="38" stroke="#8c7335" strokeWidth="2.5" fill="#fcfbf7" />
              <circle
                cx="50"
                cy="50"
                r="34"
                stroke="#8c7335"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
              <circle cx="50" cy="50" r="28" fill="#8c7335" opacity="0.05" />
              <text
                x="50"
                y="46"
                textAnchor="middle"
                fill="#5a481f"
                fontSize="8"
                fontWeight="bold"
                letterSpacing="1.5"
              >
                {status?.toUpperCase() === 'DELIVERED'
                  ? 'DELIVERED'
                  : status?.toUpperCase() || 'CONFIRMED'}
              </text>
              <text
                x="50"
                y="58"
                textAnchor="middle"
                fill="#8c7335"
                fontSize="6"
                fontWeight="bold"
                letterSpacing="1"
              >
                SIRI ARTISAN
              </text>
              <polygon
                points="50,62 52,66 56,66 53,68 54,72 50,70 46,72 47,68 44,66 48,66"
                fill="#8c7335"
              />
            </svg>
          </motion.div>
        </div>
      </div>

      {/* Loyalty Review Callout */}
      <div
        className={`bg-gradient-to-br from-amber-500/8 to-amber-500/2 border border-[#8c7335]/20 rounded-lg p-5 shadow-2xs space-y-4 text-left transition-all ${!isDelivered ? 'opacity-85' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg border shadow-3xs shrink-0 flex items-center justify-center ${
              isDelivered
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'bg-stone-100 border-stone-200 text-stone-500'
            }`}
          >
            {isDelivered ? (
              <svg
                className="w-4.5 h-4.5 fill-amber-600 text-amber-600 shrink-0"
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ) : (
              <svg
                className="w-4.5 h-4.5 fill-none stroke-current"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            )}
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
              Rate this Artisan Masterpiece
            </h4>
            <p className="text-[10px] text-amber-800 font-light font-body">
              {isDelivered
                ? 'Share your review to win 50 Loyalty Coins instantly on your account!'
                : 'This review panel unlocks once your item is successfully delivered.'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={isDelivered ? { scale: 1.2 } : {}}
                whileTap={isDelivered ? { scale: 0.9 } : {}}
                onClick={() =>
                  isDelivered &&
                  setReviewingProduct({
                    productId: item.productId?._id || item.productId,
                    productTitle: prodTitle,
                  })
                }
                disabled={!isDelivered}
                className={`p-1 flex items-center justify-center bg-transparent border-0 outline-0 ${
                  isDelivered
                    ? 'text-amber-500 hover:text-amber-600 cursor-pointer'
                    : 'text-stone-300 cursor-not-allowed'
                }`}
              >
                <svg className="w-4.5 h-4.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </motion.button>
            ))}
          </div>
          <button
            onClick={() =>
              isDelivered &&
              setReviewingProduct({
                productId: item.productId?._id || item.productId,
                productTitle: prodTitle,
              })
            }
            disabled={!isDelivered}
            className={`p-2.5 rounded-full border transition-all ${
              isDelivered
                ? 'text-[#8c7335] border-[#8c7335]/30 hover:bg-[#8c7335] hover:text-white cursor-pointer hover:shadow-2xs active:scale-95 bg-transparent'
                : 'text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed'
            }`}
            title={isDelivered ? 'Write detailed review' : 'Unlocks after delivery'}
          >
            <svg
              className="w-4.5 h-4.5 fill-none stroke-current shrink-0"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.83 17.017a4.5 4.5 0 01-1.897 1.13L3 19l.852-2.934a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Split Panels: Delivery Address & Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* Address Card */}
        <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface mb-4 flex items-center gap-2 border-b border-surface-container pb-2">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                />
              </svg>
              <span>Shipping Destination</span>
            </h4>
            {order.shippingAddress ? (
              <div className="space-y-3 text-xs leading-relaxed">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold border border-primary/20">
                    {order.shippingAddress.name
                      ? order.shippingAddress.name.substring(0, 2).toUpperCase()
                      : 'SI'}
                  </div>
                  <strong className="text-on-surface font-bold">
                    {order.shippingAddress.name}
                  </strong>
                </div>
                <p className="text-secondary font-light pl-9">
                  {order.shippingAddress.addressString || order.shippingAddress.address},{' '}
                  {order.shippingAddress.locality},<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                  <strong className="text-on-surface font-semibold">
                    {order.shippingAddress.pincode}
                  </strong>
                </p>
                <div className="pl-9 text-secondary font-medium text-[10px] flex items-center gap-1.5 uppercase tracking-wide">
                  <svg
                    className="w-3.5 h-3.5 text-secondary shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.557-5.145-3.878-6.702-6.702l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                    />
                  </svg>
                  <span>Phone: {order.shippingAddress.phone}</span>
                </div>
              </div>
            ) : (
              <div className="text-secondary italic text-xs font-light pl-2">
                Address details currently unavailable.
              </div>
            )}
          </div>
        </div>

        {/* Coordinate Map Panel */}
        <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-surface-container pb-2">
            <span className="text-[10px] uppercase font-bold text-secondary tracking-widest block">
              Destination GPS Tracker
            </span>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-200">
              GPS Synced
            </span>
          </div>
          <div className="relative h-36 rounded-lg bg-slate-50 overflow-hidden border border-outline-variant/20 z-0">
            <React.Suspense fallback={<div className="h-full bg-slate-50 animate-pulse" />}>
              <GPSMap address={order.shippingAddress} />
            </React.Suspense>
          </div>
        </div>
      </div>

      {/* Discount Banner */}
      {discount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-lg text-xs font-medium flex items-center justify-between shadow-3xs text-left">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-emerald-600 fill-emerald-600 shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>Artisan Premium Discount Applied</span>
          </div>
          <strong className="text-emerald-950 font-body">
            Saved ₹{discount.toLocaleString()} on this order!
          </strong>
        </div>
      )}

      {/* Collapsible Payment Details Panel */}
      <div className="bg-surface-bright border border-outline-variant/30 rounded-lg overflow-hidden shadow-2xs text-left">
        <button
          onClick={() => setIsPriceDetailsOpen(!isPriceDetailsOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-container/10 transition-colors font-bold text-xs uppercase tracking-wider text-on-surface border-b border-outline-variant/15 text-left cursor-pointer bg-transparent border-0 outline-0"
        >
          <span>Order Price Breakdown</span>
          <svg
            className="w-4 h-4 text-secondary transition-transform duration-200 shrink-0"
            style={{
              transform: isPriceDetailsOpen ? 'rotate(180deg)' : 'none',
            }}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <AnimatePresence initial={false}>
          {isPriceDetailsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden bg-surface-container/10"
            >
              <div className="p-6 space-y-4 text-xs border-b border-outline-variant/10">
                <div className="space-y-2.5">
                  <div className="flex justify-between text-secondary">
                    <span>Items Subtotal</span>
                    <span className="font-body font-semibold text-on-surface">
                      ₹
                      {(
                        order.total -
                        (order.shippingFee || 0) +
                        (order.discount || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-secondary">
                    <span>Delivery & Shipping Fee</span>
                    <span className="font-body text-on-surface">
                      {order.shippingFee ? `₹${order.shippingFee}` : 'FREE'}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Premium Coupon Discount</span>
                      <span className="font-body font-semibold">
                        -₹{order.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {order.codFee > 0 && (
                    <div className="flex justify-between text-secondary">
                      <span>COD Transaction Fees</span>
                      <span className="font-body text-on-surface">₹{order.codFee}</span>
                    </div>
                  )}
                  <div className="pt-3.5 border-t border-dashed border-outline-variant/25 flex justify-between font-bold text-on-surface text-sm">
                    <span>Amount Paid</span>
                    <span className="text-primary font-body text-base">
                      ₹{(order.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-outline-variant/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 text-secondary">
                    <svg
                      className="w-3.5 h-3.5 text-secondary shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    <span className="font-semibold uppercase tracking-wider text-[9px]">
                      Payment Method: {order.paymentMethod?.toUpperCase() || 'Razorpay Online'}
                    </span>
                  </div>
                  <span className="text-[9px] text-secondary/60">
                    Sold by: Siri Arts & Crafts Private Limited
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Complete Payment Banner for Pending Orders */}
        {order.paymentStatus === 'pending' && order.paymentMethod === 'razorpay' && (
          <div className="bg-amber-50/80 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-amber-200/50">
            <span className="text-[10px] text-amber-800 font-light font-body">
              Your payment is pending. Complete it now to confirm your order.
            </span>
            <button
              disabled={isResuming}
              onClick={() => {
                setIsResuming(true);
                resumePayment(
                  order,
                  () => {
                    toast.success('Payment completed successfully. Refreshing...');
                    window.location.reload();
                  },
                  () => setIsResuming(false),
                );
              }}
              className="group flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white transition-all duration-300 rounded-lg font-bold uppercase tracking-widest text-[10px] shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98] whitespace-nowrap border-0 disabled:opacity-50"
            >
              {isResuming ? 'Processing...' : 'Complete Payment'}
            </button>
          </div>
        )}

        {/* Download Invoice Action */}
        <div className="bg-surface-container-low/40 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-outline-variant/15">
          <span className="text-[10px] text-secondary font-light font-body">
            Need an official copy? Click download to retrieve the tax invoice report.
          </span>
          <button
            onClick={() => downloadInvoice(order._id)}
            className="group flex items-center justify-center gap-2 px-6 py-3 bg-[#735c00] hover:bg-[#8c7335] text-white transition-all duration-300 rounded-lg font-bold uppercase tracking-widest text-[10px] shadow-sm hover:shadow-md cursor-pointer active:scale-[0.98] whitespace-nowrap border-0"
          >
            <svg
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            <span>Download Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* SMS Logs Update Callout */}
      <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-5 shadow-2xs text-xs flex items-center gap-3 text-left">
        <div className="bg-primary/5 p-2 rounded-lg border border-primary/10 flex items-center justify-center shrink-0">
          <svg
            className="w-3.5 h-3.5 text-primary shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p className="text-secondary font-light font-body leading-relaxed">
          Real-time dispatch and delivery status updates are forwarded automatically to{' '}
          <strong className="font-semibold text-on-surface">
            {user?.phone || 'your mobile contact'}
          </strong>{' '}
          and <strong className="font-semibold text-on-surface">{user?.email}</strong>.
        </p>
      </div>

      {/* Metadata Order Footer */}
      <div className="text-[9px] text-secondary/60 font-medium space-y-1.5 pl-2 uppercase tracking-widest text-left">
        <div>
          Ordered on:{' '}
          {new Date(order.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>
        <div>Unique ID: {order._id}</div>
        {order.trackingNumber && (
          <div>
            Courier Waybill: {order.trackingNumber} ({order.courierPartner || 'Delhivery Logistics'}
            )
          </div>
        )}
      </div>
    </div>
  );
}
