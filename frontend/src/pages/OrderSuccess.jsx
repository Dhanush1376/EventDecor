import {
  Lock,
  CheckCircle2,
  BadgeCheck,
  Truck,
  MapPin,
  Calendar,
  GitCommit,
  Receipt,
  ShoppingBag,
  ShieldCheck,
  History,
  Check,
  Clock,
  Package,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SEO } from '../components/seo/SEO';
import { MandalaArtDecor } from '../components/ui/MandalaArtDecor';
import { InvoiceTemplate, OrderSuccessSkeleton, OptimizedImage } from '../components/ui';
import { useState, useEffect } from 'react';
import { handleImageError } from '../utils/media/imageUtils';
import { orderService, rentalService } from '../services/domainServices';
import logger from '../utils/core/logger';

const _BarcodeSVG = ({ _val }) => (
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

  // 1. First extract and normalize items without mutating or contaminating their types
  let items = [];
  const est = rawOrder.createdAt ? new Date(rawOrder.createdAt) : new Date();
  if (!isNaN(est.getTime())) {
    est.setDate(est.getDate() + 7);
  }
  const defaultDeliveryEstimate = !isNaN(est.getTime())
    ? est.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  const rentalDeliveryEstimate = rawOrder.rentalStartDate
    ? `Delivery by ${new Date(rawOrder.rentalStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    : defaultDeliveryEstimate;

  const checkItemRental = (item) => {
    if (!item) return false;
    if (item.type === 'rental' || item.isRental === true) return true;
    if (item.rentalInfo && (item.rentalInfo.startDate || item.rentalInfo.durationDays)) return true;
    if (item.rentalStartDate || item.rentalEndDate) return true;
    if (item.rentalDurationDays) return true;
    if (rawOrder.orderType === 'rental' && item.type !== 'purchase') return true;
    return false;
  };

  if (Array.isArray(rawOrder.items) && rawOrder.items.length > 0) {
    items = rawOrder.items.map((item) => {
      const itemIsRental = checkItemRental(item);
      const itemDeliveryEst =
        item.deliveryEstimate ||
        (itemIsRental && (item.rentalStartDate || rawOrder.rentalStartDate)
          ? `Delivery by ${new Date(item.rentalStartDate || rawOrder.rentalStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
          : defaultDeliveryEstimate);

      return {
        ...item,
        id: item.productId || item.id || item._id,
        deliveryEstimate: itemDeliveryEst,
        price: itemIsRental ? (item.rentalPrice ?? item.price ?? 0) : (item.price ?? 0),
        quantity: item.quantity ?? item.qty ?? 1,
        title: item.title || item.name || '',
        variant:
          item.variant ||
          (itemIsRental
            ? item.durationDays
              ? `${item.durationDays} Day Rental`
              : 'Rental'
            : 'Default'),
        imageSrc: item.imageSrc || item.image || '',
        type: itemIsRental ? 'rental' : 'purchase',
        isRental: itemIsRental,
        rentalInfo: itemIsRental
          ? item.rentalInfo || {
              startDate: item.rentalStartDate || rawOrder.rentalStartDate,
              endDate: item.rentalEndDate || rawOrder.rentalEndDate,
              durationDays:
                item.durationDays ||
                item.rentalDurationDays ||
                rawOrder.durationDays ||
                rawOrder.rentalRate?.rentalDurationDays ||
                1,
            }
          : null,
        deposit: itemIsRental
          ? item.deposit || item.securityDeposit || (rawOrder.securityDeposit ?? 0)
          : 0,
      };
    });
  } else {
    // Check if rawOrder is a single rental record (from RentalOrder schema without items array)
    const isSingleRentalRecord = Boolean(
      rawOrder.rentalOrderId ||
      rawOrder.orderType === 'rental' ||
      rawOrder.isRental === true ||
      (rawOrder.rentalStartDate && rawOrder.rentalEndDate) ||
      (typeof rawOrder.rentalCharge === 'number' && rawOrder.rentalCharge > 0),
    );

    if (isSingleRentalRecord) {
      items = [
        {
          id: rawOrder.product?._id || rawOrder.product || rawOrder._id || 'rental-item',
          deliveryEstimate: rentalDeliveryEstimate,
          price: rawOrder.rentalCharge || rawOrder.rentalRate?.rentalPrice || 0,
          rentalRate:
            rawOrder.rentalRate?.rentalPrice ||
            (typeof rawOrder.rentalCharge === 'number'
              ? Math.round((rawOrder.rentalCharge / (rawOrder.quantity || 1)) * 100) / 100
              : 0),
          quantity: rawOrder.quantity || 1,
          title:
            rawOrder.productTitle ||
            rawOrder.product?.title ||
            rawOrder.product?.name ||
            'Artisanal Rental Decor Item',
          variant:
            rawOrder.variant ||
            (rawOrder.durationDays
              ? `${rawOrder.durationDays} Day${rawOrder.durationDays > 1 ? 's' : ''} Rental`
              : 'Rental'),
          imageSrc:
            rawOrder.productImage ||
            rawOrder.product?.imageSrc ||
            rawOrder.product?.images?.[0]?.url ||
            'https://res.cloudinary.com/drxgnnzeb/image/upload/v1785779448/siri-arts-crafts/zqqwwbsrjpb7bqcrl24l.png',
          type: 'rental',
          isRental: true,
          rentalInfo: {
            startDate: rawOrder.rentalStartDate,
            endDate: rawOrder.rentalEndDate,
            durationDays: rawOrder.durationDays || rawOrder.rentalRate?.rentalDurationDays || 1,
          },
          deposit: rawOrder.securityDeposit || 0,
        },
      ];
    }
  }

  // 2. Accurately segregate rental and purchase items
  const rentalItems = items.filter((i) => i.isRental || i.type === 'rental');
  const purchaseItems = items.filter((i) => !i.isRental && i.type !== 'rental');

  const isMixed = rentalItems.length > 0 && purchaseItems.length > 0;
  const isPureRental =
    !isMixed &&
    ((rentalItems.length > 0 && purchaseItems.length === 0) ||
      Boolean(rawOrder.rentalOrderId) ||
      (rawOrder.orderType === 'rental' && purchaseItems.length === 0) ||
      rawOrder.isRental === true);
  const isPurePurchase = !isMixed && !isPureRental;
  const orderKind = isMixed ? 'mixed' : isPureRental ? 'rental' : 'purchase';

  const orderRef = rawOrder.rentalOrderId || rawOrder.orderId || rawOrder._id || rawOrder.id;
  const trackingToken = rawOrder.publicTrackingToken;
  const trackingPath = isPureRental
    ? '/dashboard/rentals'
    : trackingToken
      ? `/track/${orderRef}?token=${encodeURIComponent(trackingToken)}`
      : `/track/${orderRef}`;

  const rawPaymentMethod = (rawOrder.paymentMethod || '').toLowerCase();
  const paymentMode =
    rawPaymentMethod === 'cod'
      ? 'Cash on Delivery (COD)'
      : rawPaymentMethod.includes('wallet')
        ? 'Wallet Payment'
        : 'Razorpay Secure Online';

  const addr = rawOrder.shippingAddress || rawOrder.deliveryAddress || {};
  const deliveryAddress = {
    name: addr.name || rawOrder.customer || 'Customer',
    phone: addr.phone || rawOrder.phone || '',
    addressString: addr.address || addr.addressString || '',
    locality: addr.locality || '',
    city: addr.city || '',
    state: addr.state || '',
    pincode: addr.pincode || '',
    email: addr.email || rawOrder.email || '',
  };

  // 3. Compute distinct purchase and rental financial sums
  const purchaseSubtotal = purchaseItems.reduce(
    (acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1),
    0,
  );
  const rentalCharge =
    rentalItems.reduce((acc, i) => acc + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0) ||
    (isPureRental ? Number(rawOrder.rentalCharge) || 0 : 0);
  const depositTotal = isPurePurchase
    ? 0
    : rentalItems.reduce((acc, i) => acc + (Number(i.deposit) || 0), 0) ||
      (isPureRental ? Number(rawOrder.securityDeposit) || 0 : 0);

  const subtotal =
    orderKind === 'purchase'
      ? (rawOrder.subtotal ?? purchaseSubtotal)
      : orderKind === 'rental'
        ? (rawOrder.rentalCharge ?? rentalCharge)
        : purchaseSubtotal + rentalCharge;

  const shippingFee = rawOrder.shippingFee ?? rawOrder.deliveryCharge ?? 0;
  const tax = typeof rawOrder.tax === 'number' ? rawOrder.tax : (rawOrder.tax?.totalTax ?? 0);
  const discount = rawOrder.discount ?? 0;
  const codFee = rawOrder.codFee ?? 0;
  const walletDeduction = rawOrder.walletDeduction ?? 0;
  const totalAmount =
    rawOrder.totalAmount ??
    rawOrder.total ??
    subtotal + depositTotal + shippingFee + tax + codFee - discount - walletDeduction;

  const rentalStartDate = rentalItems[0]?.rentalInfo?.startDate || rawOrder.rentalStartDate;
  const rentalEndDate = rentalItems[0]?.rentalInfo?.endDate || rawOrder.rentalEndDate;
  const durationDays =
    rentalItems[0]?.rentalInfo?.durationDays ||
    rawOrder.durationDays ||
    rawOrder.rentalRate?.rentalDurationDays ||
    1;

  return {
    ...rawOrder,
    _id: orderRef,
    orderId: rawOrder.rentalOrderId || rawOrder.orderId || orderRef,
    rentalOrderId: rawOrder.rentalOrderId,
    trackingPath,
    trackingToken,
    date: safeFormatDate(rawOrder.createdAt || rawOrder.rentalStartDate || rawOrder.date),
    totalAmount,
    subtotal,
    purchaseSubtotal,
    rentalCharge,
    shippingFee,
    deliveryCharge: shippingFee,
    discount,
    codFee,
    tax,
    walletDeduction,
    paymentMode,
    paymentStatus: rawOrder.paymentStatus || 'paid',
    needByDate: rawOrder.needByDate ? safeFormatDate(rawOrder.needByDate) : undefined,
    deliveryAddress,
    shippingAddress: deliveryAddress,
    items,
    purchaseItems,
    rentalItems,
    depositTotal,
    securityDeposit: depositTotal,
    depositStatus: rawOrder.depositStatus || (depositTotal > 0 ? 'held' : 'none'),
    rentalStartDate,
    rentalEndDate,
    durationDays,
    orderType: orderKind,
    orderKind,
    isRental: isPureRental,
    isPureRental,
    isPurePurchase,
    isMixed,
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

        // If orderId starts with 'RNT-' or 'rnt-', query rentalService first
        if (
          typeof orderId === 'string' &&
          (orderId.startsWith('RNT-') || orderId.startsWith('rnt-'))
        ) {
          try {
            const rentalRes = await rentalService.getDetail(orderId);
            if (rentalRes.success && rentalRes.data) {
              foundData = rentalRes.data;
            }
          } catch (rErr) {
            logger.warn(
              'Direct rental fetch by rentalOrderId failed, falling back to orderService:',
              rErr,
            );
          }
        }

        if (!foundData) {
          try {
            const res = await orderService.getById(orderId);
            if (res.success && res.data) {
              foundData = res.data;
            }
          } catch (err) {
            // It might be a rental order instead of a purchase order
            if (
              err.response?.status === 404 ||
              err.response?.status === 400 ||
              err.response?.data?.message?.toLowerCase().includes('not found')
            ) {
              try {
                const rentalRes = await rentalService.getDetail(orderId);
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
  }, [orderId, order]);

  if (loading) {
    return <OrderSuccessSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center pt-12 pb-32 px-4">
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-8 max-w-md w-full text-center shadow-xs">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-[28px]" strokeWidth={1.5} />
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
      <SEO title="Order Success | Siri Arts & Crafts" noindex />

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
              className="bg-surface-bright border border-outline-variant/40 rounded-lg p-8 lg:p-12 text-center shadow-xs overflow-hidden relative"
            >
              <MandalaArtDecor
                variant={1}
                size={400}
                className="-bottom-20 -right-20 opacity-[0.03]"
              />

              <div className="w-20 h-20 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-6 border border-green-100">
                <CheckCircle2 className="text-[32px]" strokeWidth={1.5} />
              </div>

              <h2 className="font-display text-2xl lg:text-3xl text-on-surface font-bold mb-3">
                {order.isMixed
                  ? 'Order & Rental Confirmed!'
                  : order.isPureRental
                    ? 'Rental Booking Confirmed!'
                    : 'Order Confirmed!'}
              </h2>
              <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed mb-8">
                {order.isMixed
                  ? 'Thank you for shopping & renting with Siri Arts & Crafts. Your purchased items and rental bookings have both been confirmed.'
                  : order.isPureRental
                    ? "Your artisanal decor rental has been successfully reserved. We've dispatched your booking confirmation and rental policy to your mobile contact and email address."
                    : "Your artisanal journey has begun. We've sent the order details to your registered number and email address."}
              </p>

              <div className="w-full max-w-lg mx-auto bg-surface-container-low/40 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-4 text-left border border-outline-variant/20">
                <div className="space-y-0.5 min-w-0">
                  <span
                    className="text-[10px] uppercase font-bold text-secondary tracking-wider block"
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
                    {order.isPureRental
                      ? 'Rental Booking ID'
                      : order.isMixed
                        ? 'Order & Booking ID'
                        : 'Order ID'}
                  </span>
                  <strong className="text-xs sm:text-sm text-on-surface font-mono font-semibold tracking-wide block truncate">
                    {order.orderId}
                  </strong>
                </div>
                <div className="w-px h-8 bg-outline-variant/30 shrink-0" />
                <div className="space-y-0.5 text-right shrink-0">
                  <span
                    className="text-[10px] uppercase font-bold text-secondary tracking-wider block"
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
                    {order.isPureRental ? 'Booking Date' : 'Order Date'}
                  </span>
                  <strong className="text-xs sm:text-sm text-on-surface font-medium block whitespace-nowrap">
                    {order.date}
                  </strong>
                </div>
              </div>

              {(order.isPureRental || (order.isMixed && order.rentalItems?.length > 0)) &&
                (() => {
                  const startDateStr =
                    safeFormatDate(order.rentalStartDate, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }) ||
                    (order.items.find((i) => i.rentalInfo)?.rentalInfo?.startDate
                      ? safeFormatDate(order.items.find((i) => i.rentalInfo).rentalInfo.startDate, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Scheduled');

                  const endDateStr =
                    safeFormatDate(order.rentalEndDate, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }) ||
                    (order.items.find((i) => i.rentalInfo)?.rentalInfo?.endDate
                      ? safeFormatDate(order.items.find((i) => i.rentalInfo).rentalInfo.endDate, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Scheduled');

                  return (
                    <div className="mt-5 w-full max-w-lg mx-auto text-left rounded-xl border border-outline-variant/30 bg-surface-container-lowest/80 p-4 sm:p-5 space-y-3.5 shadow-xs relative z-10">
                      {/* Header & Duration */}
                      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                          </span>
                          <span
                            className="text-xs font-bold uppercase tracking-wider text-on-surface font-sans"
                            style={{ fontFamily: 'var(--font-label)' }}
                          >
                            {order.isMixed ? 'Rental Items Schedule & Terms' : 'Rental Period'}
                          </span>
                        </div>
                        <span
                          className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-primary/20"
                          style={{ fontFamily: 'var(--font-label)' }}
                        >
                          {order.durationDays || 1} Days Duration
                        </span>
                      </div>

                      {/* Timeline Strip (Start -> Return) */}
                      <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-surface-bright border border-outline-variant/20">
                        <div className="min-w-0">
                          <span
                            className="text-[9.5px] uppercase font-bold tracking-wider text-secondary block"
                            style={{ fontFamily: 'var(--font-label)' }}
                          >
                            Start Date
                          </span>
                          <strong className="text-xs sm:text-sm font-semibold text-on-surface block whitespace-nowrap">
                            {startDateStr}
                          </strong>
                          <span className="text-[10px] text-secondary/70 block whitespace-nowrap">
                            Delivery by start
                          </span>
                        </div>

                        <div className="flex flex-col items-center px-1 shrink-0 text-primary">
                          <span className="text-[10px] font-bold text-secondary/70">
                            {order.durationDays || 1}d
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="w-5 sm:w-10 h-px bg-outline-variant/60" />
                            <span className="text-xs font-bold">→</span>
                          </div>
                        </div>

                        <div className="text-right min-w-0">
                          <span
                            className="text-[9.5px] uppercase font-bold tracking-wider text-secondary block"
                            style={{ fontFamily: 'var(--font-label)' }}
                          >
                            Return Pickup
                          </span>
                          <strong className="text-xs sm:text-sm font-semibold text-on-surface block whitespace-nowrap">
                            {endDateStr}
                          </strong>
                          <span className="text-[10px] text-secondary/70 block whitespace-nowrap">
                            Automatic pickup
                          </span>
                        </div>
                      </div>

                      {/* Security Deposit Row */}
                      {(order.securityDeposit > 0 || order.depositTotal > 0) && (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/50 text-[11px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <ShieldCheck
                              className="w-4 h-4 text-emerald-600 shrink-0"
                              strokeWidth={2}
                            />
                            <span className="font-semibold text-emerald-950 truncate">
                              Refundable Security Deposit
                            </span>
                          </div>
                          <strong className="font-bold text-emerald-800 text-xs sm:text-sm shrink-0 ml-2">
                            ₹{safeFormatNumber(order.depositTotal || order.securityDeposit)}
                          </strong>
                        </div>
                      )}

                      {/* Guidelines bullet footer */}
                      <div className="pt-2 border-t border-outline-variant/15 flex flex-col sm:flex-row gap-2 text-[10.5px] text-secondary">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Package
                            className="w-3.5 h-3.5 text-secondary/60 shrink-0"
                            strokeWidth={1.8}
                          />
                          <span className="truncate">
                            Keep original packaging for safe return transit
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0 sm:ml-auto">
                          <Clock
                            className="w-3.5 h-3.5 text-secondary/60 shrink-0"
                            strokeWidth={1.8}
                          />
                          <span className="truncate">Deposit refunded 24–48h post inspection</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </motion.div>

            {/* Shipment Items Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg shadow-xs overflow-hidden">
              <div className="p-4 border-b border-surface-container flex items-center justify-between bg-surface-container-low/30">
                <div
                  role="heading"
                  aria-level={3}
                  className="text-xs font-bold text-secondary uppercase tracking-wider font-sans"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  {order.isPureRental
                    ? `Rented Items (${order.items.length})`
                    : order.isMixed
                      ? `Items in this order (${order.items.length})`
                      : `Items in this shipment (${order.items.length})`}
                </div>
                <span className="text-[11px] text-green-700 font-bold flex items-center gap-1">
                  <BadgeCheck className="text-sm" strokeWidth={1.5} />
                  Confirmed
                </span>
              </div>

              <div className="divide-y divide-surface-container">
                {order.items.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 sm:p-6 flex gap-4 sm:gap-6">
                    <div className="w-20 h-24 sm:w-24 sm:h-32 rounded-lg overflow-hidden shrink-0 border border-outline-variant/20 bg-surface-container-lowest">
                      <OptimizedImage
                        onError={handleImageError}
                        src={item.imageSrc}
                        alt={item.title || 'Artisanal event decor item'}
                        className="w-full h-full object-cover"
                        sizes="(max-width: 640px) 96px, 128px"
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <div
                            role="heading"
                            aria-level={4}
                            className="font-bold text-sm sm:text-base text-on-surface line-clamp-1 font-sans"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            {item.title}
                          </div>
                          {!item.isRental && item.variant && item.variant !== 'Default' && (
                            <span className="text-[11px] text-secondary block mt-1 font-medium italic">
                              Style: {item.variant}
                            </span>
                          )}
                          {order.isMixed && !item.isRental && (
                            <span className="inline-block bg-surface-container-low text-secondary text-[9px] font-bold px-2 py-0.5 rounded border border-outline-variant/30 mt-1 uppercase">
                              Purchased Product
                            </span>
                          )}
                        </div>
                        <span className="text-sm sm:text-base font-bold text-on-surface shrink-0">
                          ₹{safeFormatNumber(item.price)}
                        </span>
                      </div>

                      {item.isRental &&
                        (() => {
                          let durationLabel = item.variant;
                          if (!durationLabel || durationLabel === 'Default') {
                            durationLabel =
                              item.rentalInfo?.durationDays || order.durationDays
                                ? `${item.rentalInfo?.durationDays || order.durationDays} Days Rental`
                                : 'Rental Booking';
                          } else if (/^\d+$/.test(String(durationLabel).trim())) {
                            durationLabel = `${durationLabel} Days Rental`;
                          }

                          const startStr = safeFormatDate(
                            item.rentalInfo?.startDate || order.rentalStartDate,
                            { day: 'numeric', month: 'short', year: 'numeric' },
                          );
                          const endStr = safeFormatDate(
                            item.rentalInfo?.endDate || order.rentalEndDate,
                            { day: 'numeric', month: 'short', year: 'numeric' },
                          );

                          return (
                            <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-[#faf8f4] via-[#fdfcf9] to-[#f7f4ec] border border-[#d4af37]/35 shadow-[0_2px_8px_rgba(180,140,60,0.06)] space-y-2">
                              {/* Badges row */}
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#8c7335]/15 text-[#705b22] text-[9.5px] uppercase font-bold tracking-wider border border-[#8c7335]/25"
                                  style={{ fontFamily: 'var(--font-label)' }}
                                >
                                  <Check className="w-3 h-3 text-[#8c7335]" strokeWidth={2.5} />
                                  Rental
                                </span>

                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 text-secondary text-[10.5px] font-semibold border border-outline-variant/30 shadow-2xs"
                                  style={{ fontFamily: 'var(--font-label)' }}
                                >
                                  <Clock
                                    className="w-3 h-3 text-[#8c7335] shrink-0"
                                    strokeWidth={1.8}
                                  />
                                  {durationLabel}
                                </span>

                                {item.deposit > 0 && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50/90 text-emerald-800 text-[10px] font-semibold border border-emerald-200/70"
                                    style={{ fontFamily: 'var(--font-label)' }}
                                  >
                                    <ShieldCheck
                                      className="w-3 h-3 text-emerald-600 shrink-0"
                                      strokeWidth={2}
                                    />
                                    ₹{safeFormatNumber(item.deposit)} Refundable Deposit
                                  </span>
                                )}
                              </div>

                              {/* Rental Period Timeline */}
                              {(startStr || endStr) && (
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] pt-2 border-t border-[#8c7335]/15">
                                  <div
                                    className="flex items-center gap-1 text-[#705b22] font-bold text-[10px] uppercase tracking-wider shrink-0"
                                    style={{ fontFamily: 'var(--font-label)' }}
                                  >
                                    <Calendar
                                      className="w-3.5 h-3.5 text-[#8c7335]"
                                      strokeWidth={1.8}
                                    />
                                    <span>Period:</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-on-surface font-medium flex-wrap">
                                    <span className="font-semibold text-on-surface bg-white px-2.5 py-0.5 rounded border border-outline-variant/30 text-[11px] shadow-2xs whitespace-nowrap">
                                      {startStr}
                                    </span>
                                    <span className="text-secondary/50 font-bold text-xs">to</span>
                                    <span className="font-semibold text-on-surface bg-white px-2.5 py-0.5 rounded border border-outline-variant/30 text-[11px] shadow-2xs whitespace-nowrap">
                                      {endStr}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                      <div className="mt-4 flex items-center gap-4 text-[11px] text-secondary">
                        <span className="flex items-center gap-1">
                          Qty: <strong className="text-on-surface">{item.quantity}</strong>
                        </span>
                        <span className="text-outline-variant">|</span>
                        <span className="text-green-700 font-bold flex items-center gap-1">
                          <Truck className="text-xs" strokeWidth={1.5} />
                          {item.deliveryEstimate || 'Delivery on or before start date'}
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
              <div
                role="heading"
                aria-level={3}
                className="text-xs font-bold text-secondary uppercase tracking-wider pb-3 border-b border-outline-variant/40 mb-4 font-sans"
                style={{ fontFamily: 'var(--font-label)' }}
              >
                {order.isMixed
                  ? 'Order & Rental Summary'
                  : order.isPureRental
                    ? 'Rental Summary'
                    : 'Price Details'}
              </div>
              <div className="space-y-3 text-xs text-on-surface">
                {order.isMixed ? (
                  <>
                    <div className="flex justify-between">
                      <span>Purchased Items Subtotal</span>
                      <span>₹{safeFormatNumber(order.purchaseSubtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rental Decor Charges</span>
                      <span>₹{safeFormatNumber(order.rentalCharge || 0)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>{order.isPureRental ? 'Rental Base Charge' : 'Subtotal'}</span>
                    <span>₹{safeFormatNumber(order.subtotal)}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Promo Discount</span>
                    <span className="text-green-700 font-medium">
                      - ₹{safeFormatNumber(order.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>
                    {order.isPureRental
                      ? 'Delivery & Setup Fee'
                      : order.isMixed
                        ? 'Shipping & Delivery Fee'
                        : 'Shipping Fee'}
                  </span>
                  <span className="text-green-700 font-bold">
                    {order.shippingFee === 0 ? 'FREE' : `₹${safeFormatNumber(order.shippingFee)}`}
                  </span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Taxes & GST</span>
                    <span className="font-medium">₹{safeFormatNumber(order.tax)}</span>
                  </div>
                )}
                {!order.isPurePurchase && (order.depositTotal > 0 || order.securityDeposit > 0) && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      Security Deposit{' '}
                      <span className="text-[9px] text-green-600 font-bold">(Refundable)</span>
                    </span>
                    <span className="font-medium text-green-700">
                      ₹{safeFormatNumber(order.depositTotal || order.securityDeposit)}
                    </span>
                  </div>
                )}
                {order.walletDeduction > 0 && (
                  <div className="flex justify-between">
                    <span>Wallet Deduction</span>
                    <span className="text-green-700 font-medium">
                      - ₹{safeFormatNumber(order.walletDeduction)}
                    </span>
                  </div>
                )}
                {order.codFee > 0 && (
                  <div className="flex justify-between">
                    <span>COD Collection Fee</span>
                    <span className="font-medium">₹{safeFormatNumber(order.codFee)}</span>
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
                <div
                  role="heading"
                  aria-level={3}
                  className="text-xs font-bold text-secondary uppercase tracking-wider font-sans"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  Delivery Address
                </div>
                <MapPin className="text-sm text-secondary" strokeWidth={1.5} />
              </div>
              <div className="text-[12px] space-y-1.5 text-on-surface">
                <p className="font-bold text-sm">{order.deliveryAddress.name}</p>
                <p className="text-secondary leading-relaxed">
                  {order.deliveryAddress.addressString}
                  {order.deliveryAddress.locality ? `, ${order.deliveryAddress.locality}` : ''}
                  <br />
                  {order.deliveryAddress.city}, {order.deliveryAddress.state} —{' '}
                  <strong>{order.deliveryAddress.pincode}</strong>
                </p>
                {order.deliveryAddress.phone && (
                  <p className="pt-2 font-bold text-on-surface">
                    Mobile: {order.deliveryAddress.phone}
                  </p>
                )}
                {order.deliveryAddress.email && (
                  <p className="text-[11px] text-secondary">Email: {order.deliveryAddress.email}</p>
                )}
              </div>
            </div>

            {/* Payment Status Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <div
                  role="heading"
                  aria-level={3}
                  className="font-bold text-secondary uppercase tracking-wider font-sans"
                  style={{ fontFamily: 'var(--font-label)' }}
                >
                  Payment Status
                </div>
                <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-bold border border-green-200 uppercase text-[10px]">
                  {order.paymentStatus === 'Pending COD' ? 'Pending COD' : 'Confirmed'}
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
                  <div
                    role="heading"
                    aria-level={3}
                    className="font-bold text-secondary uppercase tracking-wider font-sans"
                    style={{ fontFamily: 'var(--font-label)' }}
                  >
                    Timeline Requested
                  </div>
                  <span className="bg-[var(--color-gold-dark)]/5 text-[var(--color-gold-dark)] px-2.5 py-1 rounded-full font-bold border border-[var(--color-gold-dark)]/25 uppercase text-[10px] flex items-center gap-1">
                    <Calendar className="text-[12px]" strokeWidth={1.5} />
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
                onClick={() =>
                  navigate(
                    order.isPureRental
                      ? '/dashboard/rentals'
                      : order.isMixed
                        ? '/dashboard'
                        : '/dashboard?tab=orders',
                  )
                }
                className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded text-[11px] font-bold uppercase tracking-widest transition-all shadow-md block text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <GitCommit className="text-[15px]" strokeWidth={1.5} />
                {order.isPureRental
                  ? 'View My Rentals'
                  : order.isMixed
                    ? 'View Orders & Rentals'
                    : 'Track Your Order'}
              </button>
              <button
                onClick={() => setShowStickerModal(true)}
                className="w-full bg-white border border-primary text-primary py-3.5 rounded text-[11px] font-bold uppercase tracking-widest hover:bg-primary/5 transition-all block text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Receipt className="text-[15px]" strokeWidth={1.5} />
                {order.isPureRental
                  ? 'View Rental Tax Invoice'
                  : order.isMixed
                    ? 'View Tax Invoice'
                    : 'View Digital Tax Invoice'}
              </button>
              <Link
                to="/collections"
                className="w-full bg-surface-bright border border-outline-variant text-secondary py-3.5 rounded text-[11px] font-bold uppercase tracking-widest hover:bg-surface-container-low transition-all block text-center flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="text-[15px]" strokeWidth={1.5} />
                {order.isRental ? 'Explore More Rentals' : 'Continue Shopping'}
              </Link>
            </div>

            {/* Trust Footer */}
            <div className="pt-4 text-center text-[11px] text-secondary flex flex-col items-center gap-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="text-[14px] text-green-700 font-bold" strokeWidth={1.5} />
                  Safe
                </span>
                <span className="flex items-center gap-1">
                  <History className="text-[14px] text-primary font-bold" strokeWidth={1.5} />
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
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="invoice-modal-container fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-3xl mx-auto w-full max-w-3xl max-h-[92vh] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[101] overflow-y-auto no-scrollbar print:static print:translate-x-0 print:translate-y-0 print:h-auto print:max-w-none print:shadow-none print:bg-white"
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
