import { Link, useLocation, useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';
import { InvoiceTemplate, OrderSuccessSkeleton, OptimizedImage } from '../components/ui';
import { useState, useEffect } from 'react';
import { handleImageError } from '../utils/imageUtils';
import { orderService, rentalService } from '../services/domainServices';
import logger from '../utils/logger';

const BarcodeSVG = ({ val }) => (
  <svg viewBox="0 0 200 40" className="w-full h-9" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="40" fill="#fff" />
    <path
      d="M 10 0 L 10 40 M 13 0 L 13 40 M 15 0 L 15 40 M 18 0 L 18 40 M 22 0 L 22 40 M 26 0 L 26 40 M 30 0 L 30 40 M 34 0 L 34 40 M 36 0 L 36 40 M 40 0 L 40 40 M 44 0 L 44 40 M 48 0 L 48 40 M 52 0 L 52 40 M 55 0 L 55 40 M 58 0 L 58 40 M 62 0 L 62 40 M 65 0 L 65 40 M 68 0 L 68 40 M 72 0 L 72 40 M 76 0 L 76 40 M 80 0 L 80 40 M 84 0 L 84 40 M 88 0 L 88 40 M 90 0 L 90 40 M 94 0 L 94 40 M 98 0 L 98 40 M 102 0 L 102 40 M 105 0 L 105 40 M 108 0 L 108 40 M 112 0 L 112 40 M 116 0 L 116 40 M 120 0 L 120 40 M 122 0 L 122 40 M 126 0 L 126 40 M 130 0 L 130 40 M 134 0 L 134 40 M 138 0 L 138 40 M 142 0 L 142 40 M 144 0 L 144 40 M 148 0 L 148 40 M 152 0 L 152 40 M 155 0 L 155 40 M 158 0 L 158 40 M 162 0 L 162 40 M 166 0 L 166 40 M 170 0 L 170 40 M 174 0 L 174 40 M 178 0 L 178 40 M 182 0 L 182 40 M 186 0 L 186 40 M 190 0 L 190 40"
      stroke="#000"
      strokeWidth="2"
    />
  </svg>
);

const safeFormatNumber = (val) => {
  if (val === undefined || val === null) return '0';
  const num = Number(val);
  return isNaN(num) ? '0' : num.toLocaleString('en-IN');
};

const safeFormatDate = (val, options) => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(
    'en-IN',
    options || {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
};

const mapOrderData = (rawOrder) => {
  if (!rawOrder) return null;
  const orderRef = rawOrder._id || rawOrder.id;
  const trackingToken = rawOrder.publicTrackingToken;
  const trackingPath = trackingToken
    ? `/track/${orderRef}?token=${encodeURIComponent(trackingToken)}`
    : `/track/${orderRef}`;

  const est = rawOrder.createdAt ? new Date(rawOrder.createdAt) : new Date();
  if (!isNaN(est.getTime())) {
    est.setDate(est.getDate() + 7);
  }
  const deliveryEstimate = !isNaN(est.getTime())
    ? est.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  return {
    _id: orderRef,
    orderId: orderRef,
    trackingPath,
    trackingToken,
    date: safeFormatDate(rawOrder.createdAt),
    totalAmount: rawOrder.total ?? rawOrder.totalAmount ?? 0,
    subtotal: rawOrder.subtotal ?? 0,
    shippingFee: rawOrder.shippingFee ?? 0,
    discount: rawOrder.discount ?? 0,
    paymentMode: rawOrder.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Razorpay Secure',
    needByDate: rawOrder.needByDate ? safeFormatDate(rawOrder.needByDate) : undefined,
    deliveryAddress: {
      name: rawOrder.shippingAddress?.name || 'Customer',
      phone: rawOrder.shippingAddress?.phone || '',
      addressString: rawOrder.shippingAddress?.address || '',
      locality: rawOrder.shippingAddress?.locality || '',
      city: rawOrder.shippingAddress?.city || '',
      state: rawOrder.shippingAddress?.state || '',
      pincode: rawOrder.shippingAddress?.pincode || '',
    },
    items: Array.isArray(rawOrder.items)
      ? rawOrder.items.map((item) => ({
          ...item,
          id: item.productId || item.id,
          deliveryEstimate,
          price: item.price ?? 0,
          quantity: item.quantity ?? 0,
          title: item.title || '',
          variant: item.variant || 'Default',
          imageSrc: item.imageSrc || '',
          type: item.type || 'purchase',
          rentalInfo: item.rentalInfo,
          deposit: item.deposit || 0,
        }))
      : [],
    depositTotal: rawOrder.depositTotal || 0,
    orderType: rawOrder.orderType || 'purchase',
  };
};

export function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const urlOrderId = searchParams.get('id');
  const stateOrder = location.state?.orderDetails?.order || location.state?.orderDetails;
  const orderId = stateOrder?._id || stateOrder?.id || urlOrderId;

  const [order, setOrder] = useState(() => mapOrderData(stateOrder));
  const [loading, setLoading] = useState(!stateOrder && !!orderId);
  const [error, setError] = useState('');
  const [showStickerModal, setShowStickerModal] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const confettiKey = `confetti_fired_${orderId}`;
    if (sessionStorage.getItem(confettiKey)) {
      return; // Already fired for this order in this session
    }
    sessionStorage.setItem(confettiKey, 'true');

    // Premium Celebration Blast
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 10000,
      colors: ['var(--color-gold-dark)', '#d4af37', '#ffe088', '#ffffff'],
    };

    import('canvas-confetti').then(({ default: confetti }) => {
      function fire(particleRatio, opts) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    });
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      if (!order) {
        const timer = setTimeout(() => {
          setError('No valid Order ID has been associated with this payment transaction.');
          setLoading(false);
        }, 0);
        return () => clearTimeout(timer);
      }
      return;
    }

    const fetchOrder = async () => {
      try {
        if (!order) {
          setLoading(true);
        }

        let foundData = null;

        try {
          const res = await orderService.getById(orderId);
          if (res.success && res.data) {
            foundData = res.data;
          }
        } catch (err) {
          // It might be a rental order instead of a purchase order
          if (
            err.response?.status === 404 ||
            err.response?.data?.message?.toLowerCase().includes('not found')
          ) {
            try {
              const rentalRes = await rentalService.getRentalById(orderId);
              if (rentalRes.success && rentalRes.data) {
                foundData = rentalRes.data;
              }
            } catch (rentalErr) {
              logger.error('Error fetching rental order details:', rentalErr);
            }
          } else {
            throw err;
          }
        }

        if (foundData) {
          setOrder(mapOrderData(foundData));
          setError('');
        } else {
          if (!order) {
            setError('Order not found or authorization failed.');
          }
        }
      } catch (err) {
        logger.error('Error fetching order details:', err);
        if (!order) {
          setError(
            err.response?.data?.message ||
              'Access denied. This order belongs to another user account.',
          );
        }
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchOrder();
    }, 0);
    return () => clearTimeout(timer);
  }, [orderId]);

  if (loading) {
    return <OrderSuccessSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center pt-12 pb-32 px-4">
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-8 max-w-md w-full text-center shadow-xs">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[28px]">lock</span>
          </div>
          <h2 className="text-lg font-bold text-on-surface mb-2">Access Restrained</h2>
          <p className="text-xs text-secondary leading-relaxed mb-6">
            {error || 'Could not retrieve order details.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-wider py-3 rounded cursor-pointer"
          >
            Track Active Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-surface-container-low min-h-screen relative pt-12 pb-32 font-body selection:bg-primary/20"
    >
      <SEO title="Order Success | Siri Arts & Crafts" />

      {/* CSS Stylesheet Inject for Clean Receipt Printing */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #invoice-print-area, #invoice-print-area * {
              visibility: visible;
            }
            #invoice-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
              color: black;
              font-family: sans-serif;
              display: block !important;
            }
          }
        `}
      </style>

      {/* Progress Header Strip */}
      <div className="bg-surface-bright border-b border-outline-variant/40 py-4 px-4 mb-8 -mt-12 print:hidden">
        <div className="max-w-xl mx-auto flex items-center justify-between text-[11px] font-bold tracking-wider text-green-700 uppercase">
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-5 h-5 rounded-full bg-green-700 text-white flex items-center justify-center text-[10px]">
              ✓
            </span>
            <span>BAG</span>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-green-700/30 mx-3" />
          <div className="flex items-center gap-1.5 opacity-60">
            <span className="w-5 h-5 rounded-full bg-green-700 text-white flex items-center justify-center text-[10px]">
              ✓
            </span>
            <span>ADDRESS</span>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-green-700/30 mx-3" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-green-700 text-white flex items-center justify-center text-[10px]">
              ✓
            </span>
            <span>SUCCESS</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10 print:hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Success Details (Main Content) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Success Celebration Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-surface-bright border border-outline-variant/40 rounded-lg p-8 md:p-12 text-center shadow-xs overflow-hidden relative"
            >
              <MandalaArtDecor
                variant={1}
                size={400}
                className="-bottom-20 -right-20 opacity-[0.03]"
              />

              <div className="w-20 h-20 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-6 border border-green-100">
                <span className="material-symbols-outlined text-[32px]">check_circle</span>
              </div>

              <h2 className="font-display text-2xl md:text-3xl text-on-surface font-bold mb-3">
                {order.orderType === 'rental' || order.items.some((i) => i.type === 'rental')
                  ? '🏷 Rental Booking Confirmed!'
                  : 'Order Confirmed!'}
              </h2>
              <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed mb-8">
                Your artisanal journey has begun. We've sent the order details to your registered
                number and email address.
              </p>

              <div className="bg-surface-container-low/50 rounded-lg p-4 inline-flex items-center gap-6 text-left border border-outline-variant/20">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-secondary tracking-widest block">
                    Order ID
                  </span>
                  <strong className="text-sm text-on-surface font-mono">{order.orderId}</strong>
                </div>
                <div className="w-px h-8 bg-outline-variant/30" />
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-secondary tracking-widest block">
                    Date
                  </span>
                  <strong className="text-sm text-on-surface font-medium">{order.date}</strong>
                </div>
              </div>

              {(order.orderType === 'rental' || order.items.some((i) => i.type === 'rental')) && (
                <div className="mt-6 bg-[#8c7335]/5 border border-[#8c7335]/20 rounded-lg p-5 text-left text-[#5a481f] shadow-inner text-sm">
                  <h4 className="font-bold text-[#8c7335] uppercase tracking-widest text-[11px] mb-4 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">info</span> Rental
                    Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[#8c7335]/80 font-bold mb-1">
                        Rental Period
                      </span>
                      <strong className="font-medium text-sm">
                        {order.items.find((i) => i.rentalInfo)?.rentalInfo
                          ? `${new Date(order.items.find((i) => i.rentalInfo).rentalInfo.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(order.items.find((i) => i.rentalInfo).rentalInfo.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                          : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[#8c7335]/80 font-bold mb-1">
                        Return Date
                      </span>
                      <strong className="font-medium text-sm">
                        {order.items.find((i) => i.rentalInfo)?.rentalInfo
                          ? new Date(
                              order.items.find((i) => i.rentalInfo).rentalInfo.endDate,
                            ).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-[#8c7335]/80 font-bold mb-1">
                        Deposit Paid
                      </span>
                      <strong className="font-medium text-sm text-green-700">
                        ₹{safeFormatNumber(order.depositTotal)}
                      </strong>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#8c7335]/10 text-[11px] leading-relaxed">
                    <strong>Return Instructions:</strong> Keep the original packaging. A return
                    pickup will be scheduled automatically on the return date. The deposit is
                    refunded upon successful inspection.
                  </div>
                </div>
              )}
            </motion.div>

            {/* Shipment Items Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg shadow-xs overflow-hidden">
              <div className="p-4 border-b border-surface-container flex items-center justify-between bg-surface-container-low/30">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Items in this shipment ({order.items.length})
                </span>
                <span className="text-[11px] text-green-700 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Confirmed
                </span>
              </div>

              <div className="divide-y divide-surface-container">
                {order.items.map((item) => (
                  <div key={item.id} className="p-4 sm:p-6 flex gap-4 sm:gap-6">
                    <div className="w-20 h-24 sm:w-24 sm:h-32 rounded-lg overflow-hidden shrink-0 border border-outline-variant/20">
                      <OptimizedImage
                        onError={handleImageError}
                        src={item.imageSrc}
                        alt="Traditional wedding event decoration"
                        className="w-full h-full object-cover"
                        sizes="(max-width: 640px) 96px, 128px"
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-on-surface line-clamp-1">
                              {item.title}
                            </h4>
                            {item.type === 'rental' && (
                              <span className="bg-[#8c7335]/10 text-[#8c7335] text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1 border border-[#8c7335]/20">
                                <span className="material-symbols-outlined text-[10px]">sell</span>{' '}
                                🏷 RENTAL
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-secondary block mt-1 font-medium italic">
                            Style: {item.variant}
                          </span>
                          {item.type === 'rental' && item.rentalInfo && (
                            <span className="text-[11px] text-[#8c7335] block mt-1 font-medium bg-[#8c7335]/10 border border-[#8c7335]/20 px-1.5 py-0.5 rounded inline-block">
                              Period: {new Date(item.rentalInfo.startDate).toLocaleDateString()} to{' '}
                              {new Date(item.rentalInfo.endDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold text-on-surface">
                          ₹{safeFormatNumber(item.price)}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-4 text-[11px] text-secondary">
                        <span className="flex items-center gap-1">
                          Qty: <strong className="text-on-surface">{item.quantity}</strong>
                        </span>
                        <span className="text-outline-variant">|</span>
                        <span className="text-green-700 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">local_shipping</span>
                          Est. Delivery: {item.deliveryEstimate}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Details */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            {/* Price Summary Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider pb-3 border-b border-outline-variant/40 mb-4">
                {order.orderType === 'rental' || order.items.some((i) => i.type === 'rental')
                  ? 'Rental Summary'
                  : 'Price Details'}
              </h3>
              <div className="space-y-3 text-xs text-on-surface">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{safeFormatNumber(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Promo Discount</span>
                  <span className="text-green-700 font-medium">
                    - ₹{safeFormatNumber(order.discount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span className="text-green-700 font-bold">
                    {order.shippingFee === 0 ? 'FREE' : `₹${safeFormatNumber(order.shippingFee)}`}
                  </span>
                </div>
                {order.depositTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      Security Deposit{' '}
                      <span className="text-[9px] text-green-600 font-bold">(Refundable)</span>
                    </span>
                    <span className="font-medium">₹{safeFormatNumber(order.depositTotal)}</span>
                  </div>
                )}
                <div className="h-[1px] bg-outline-variant/40 my-3" />
                <div className="flex justify-between items-baseline font-bold">
                  <span className="text-sm">Total Paid</span>
                  <span className="text-base text-primary">
                    ₹{safeFormatNumber(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/40">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Delivery Address
                </h3>
                <span className="material-symbols-outlined text-sm text-secondary">
                  location_on
                </span>
              </div>
              <div className="text-[12px] space-y-1.5 text-on-surface">
                <p className="font-bold text-sm">{order.deliveryAddress.name}</p>
                <p className="text-secondary leading-relaxed">
                  {order.deliveryAddress.addressString}, {order.deliveryAddress.locality}
                  <br />
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} —{' '}
                  <strong>{order.deliveryAddress.pincode}</strong>
                </p>
                <p className="pt-2 font-bold text-on-surface">
                  Mobile: {order.deliveryAddress.phone}
                </p>
              </div>
            </div>

            {/* Payment Status Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-secondary uppercase tracking-wider">
                  Payment Status
                </span>
                <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-bold border border-green-200 uppercase text-[10px]">
                  Confirmed
                </span>
              </div>
              <p className="text-[11px] text-secondary mt-3">
                Via: <strong className="text-on-surface">{order.paymentMode}</strong>
              </p>
            </div>

            {/* Required Timeline Card */}
            {order.needByDate && (
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-secondary uppercase tracking-wider">
                    Timeline Requested
                  </span>
                  <span className="bg-[var(--color-gold-dark)]/5 text-[var(--color-gold-dark)] px-2.5 py-1 rounded-full font-bold border border-[var(--color-gold-dark)]/25 uppercase text-[10px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                    Customer Request
                  </span>
                </div>
                <p className="text-[11px] text-secondary mt-3">
                  By when needed:{' '}
                  <strong className="text-on-surface font-semibold">{order.needByDate}</strong>
                </p>
              </div>
            )}

            {/* Primary Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => navigate(order.trackingPath || `/track/${order._id}`)}
                className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded text-[11px] font-bold uppercase tracking-widest transition-all shadow-md block text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">track_changes</span>
                Track Your Order
              </button>
              <button
                onClick={() => setShowStickerModal(true)}
                className="w-full bg-white border border-primary text-primary py-3.5 rounded text-[11px] font-bold uppercase tracking-widest hover:bg-primary/5 transition-all block text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                View Digital Tax Invoice
              </button>
              <Link
                to="/collections"
                className="w-full bg-surface-bright border border-outline-variant text-secondary py-3.5 rounded text-[11px] font-bold uppercase tracking-widest hover:bg-surface-container-low transition-all block text-center flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">shopping_bag</span>
                Continue Shopping
              </Link>
            </div>

            {/* Trust Footer */}
            <div className="pt-4 text-center text-[11px] text-secondary flex flex-col items-center gap-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-green-700 font-bold">
                    verified_user
                  </span>
                  Safe
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary font-bold">
                    history
                  </span>
                  Easy Returns
                </span>
              </div>
              <p className="font-medium tracking-wide">100% Authentic Artisanal Pieces</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showStickerModal && order && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStickerModal(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] no-print"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="invoice-modal-container fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] md:w-full md:max-w-3xl max-h-[calc(100vh-2rem)] md:max-h-[90vh] bg-white rounded-2xl shadow-2xl z-[101] overflow-y-auto no-scrollbar print:static print:translate-x-0 print:translate-y-0 print:h-auto print:max-w-none print:shadow-none print:bg-white"
            >
              {/* PRINT STYLE SHEET DETACHED AND ISOLATED */}
              <style type="text/css" media="print">
                {`
                  @page { size: A4 portrait; margin: 10mm; }
                  html, body { 
                    height: 100vh !important; 
                    overflow: hidden !important; 
                    margin: 0 !important; 
                    padding: 0 !important;
                  }
                  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; }
                  body * {
                    visibility: hidden !important;
                  }
                  .invoice-modal-container {
                    position: fixed !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    transform: none !important;
                    overflow: hidden !important;
                    background: transparent !important;
                    box-shadow: none !important;
                  }
                  .print-invoice-area, .print-invoice-area * {
                    visibility: visible !important;
                  }
                  .print-invoice-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    background: white !important;
                    overflow: hidden !important;
                  }
                  .no-print, .no-print * {
                    display: none !important;
                  }
                `}
              </style>

              <InvoiceTemplate order={order} onClose={() => setShowStickerModal(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
