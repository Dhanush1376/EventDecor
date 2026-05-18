import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { MandalaArtDecor } from "../components/ui/MandalaArtDecor";
import { orderService } from "../services/domainServices";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";

const BarcodeSVG = ({ val }) => (
  <svg viewBox="0 0 200 40" className="w-full h-9" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="40" fill="#fff" />
    <path d="M 10 0 L 10 40 M 13 0 L 13 40 M 15 0 L 15 40 M 18 0 L 18 40 M 22 0 L 22 40 M 26 0 L 26 40 M 30 0 L 30 40 M 34 0 L 34 40 M 36 0 L 36 40 M 40 0 L 40 40 M 44 0 L 44 40 M 48 0 L 48 40 M 52 0 L 52 40 M 55 0 L 55 40 M 58 0 L 58 40 M 62 0 L 62 40 M 65 0 L 65 40 M 68 0 L 68 40 M 72 0 L 72 40 M 76 0 L 76 40 M 80 0 L 80 40 M 84 0 L 84 40 M 88 0 L 88 40 M 90 0 L 90 40 M 94 0 L 94 40 M 98 0 L 98 40 M 102 0 L 102 40 M 105 0 L 105 40 M 108 0 L 108 40 M 112 0 L 112 40 M 116 0 L 116 40 M 120 0 L 120 40 M 122 0 L 122 40 M 126 0 L 126 40 M 130 0 L 130 40 M 134 0 L 134 40 M 138 0 L 138 40 M 142 0 L 142 40 M 144 0 L 144 40 M 148 0 L 148 40 M 152 0 L 152 40 M 155 0 L 155 40 M 158 0 L 158 40 M 162 0 L 162 40 M 166 0 L 166 40 M 170 0 L 170 40 M 174 0 L 174 40 M 178 0 L 178 40 M 182 0 L 182 40 M 186 0 L 186 40 M 190 0 L 190 40" stroke="#000" strokeWidth="2" />
  </svg>
);

export function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showStickerModal, setShowStickerModal] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const urlOrderId = searchParams.get("id");
  const stateOrder = location.state?.orderDetails?.order || location.state?.orderDetails;
  const orderId = stateOrder?._id || stateOrder?.id || urlOrderId;

  useEffect(() => {
    // Premium Celebration Blast
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 10000,
      colors: ["#735c00", "#d4af37", "#ffe088", "#ffffff"],
    };

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
  }, []);

  useEffect(() => {
    if (!orderId) {
      setError("No valid Order ID has been associated with this payment transaction.");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await orderService.getById(orderId);
        if (res.success && res.data) {
          const rawOrder = res.data;
          const est = new Date(rawOrder.createdAt);
          est.setDate(est.getDate() + 7);

          const orderRef = rawOrder._id || rawOrder.id;
          const trackingToken = rawOrder.publicTrackingToken;
          const trackingPath = trackingToken
            ? `/track/${orderRef}?token=${encodeURIComponent(trackingToken)}`
            : `/track/${orderRef}`;

          const mapped = {
            _id: orderRef,
            orderId: orderRef,
            trackingPath,
            trackingToken,
            date: new Date(rawOrder.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            totalAmount: rawOrder.total,
            subtotal: rawOrder.subtotal,
            shippingFee: rawOrder.shippingFee,
            discount: rawOrder.discount,
            paymentMode: rawOrder.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Razorpay Secure',
            needByDate: rawOrder.needByDate ? new Date(rawOrder.needByDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }) : undefined,
            deliveryAddress: {
              name: rawOrder.shippingAddress?.name || "Customer",
              phone: rawOrder.shippingAddress?.phone || "",
              addressString: rawOrder.shippingAddress?.address || "",
              locality: rawOrder.shippingAddress?.locality || "",
              city: rawOrder.shippingAddress?.city || "",
              state: rawOrder.shippingAddress?.state || "",
              pincode: rawOrder.shippingAddress?.pincode || "",
            },
            items: rawOrder.items.map(item => ({
              ...item,
              id: item.productId || item.id,
              deliveryEstimate: est.toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }),
            })),
          };
          setOrder(mapped);
          sessionStorage.setItem("lastOrderDetails", JSON.stringify(mapped));
        } else {
          setError("Order not found or authorization failed.");
        }
      } catch (err) {
        console.error("Error fetching order details:", err);
        setError(err.response?.data?.message || "Access denied. This order belongs to another user account.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center pt-12 pb-32">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase font-bold tracking-widest text-secondary">Securing Order Details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center pt-12 pb-32 px-4">
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-8 max-w-md w-full text-center shadow-xs">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[28px]">lock</span>
          </div>
          <h2 className="text-lg font-bold text-on-surface mb-2">Access Restrained</h2>
          <p className="text-xs text-secondary leading-relaxed mb-6">{error || "Could not retrieve order details."}</p>
          <button
            onClick={() => navigate("/dashboard")}
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
      <style dangerouslySetInnerHTML={{__html: `
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
      `}} />

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
                <span className="material-symbols-outlined text-[32px]">
                  check_circle
                </span>
              </div>

              <h1 className="font-display text-2xl md:text-3xl text-on-surface font-bold mb-3">
                Order Confirmed!
              </h1>
              <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed mb-8">
                Your artisanal journey has begun. We've sent the order details
                to your registered number and email address.
              </p>

              <div className="bg-surface-container-low/50 rounded-lg p-4 inline-flex items-center gap-6 text-left border border-outline-variant/20">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-secondary tracking-widest block">
                    Order ID
                  </span>
                  <strong className="text-sm text-on-surface font-mono">
                    {order.orderId}
                  </strong>
                </div>
                <div className="w-px h-8 bg-outline-variant/30" />
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-secondary tracking-widest block">
                    Date
                  </span>
                  <strong className="text-sm text-on-surface font-medium">
                    {order.date}
                  </strong>
                </div>
              </div>
            </motion.div>

            {/* Shipment Items Card */}
            <div className="bg-surface-bright border border-outline-variant/40 rounded-lg shadow-xs overflow-hidden">
              <div className="p-4 border-b border-surface-container flex items-center justify-between bg-surface-container-low/30">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Items in this shipment ({order.items.length})
                </span>
                <span className="text-[11px] text-green-700 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    verified
                  </span>
                  Confirmed
                </span>
              </div>

              <div className="divide-y divide-surface-container">
                {order.items.map((item) => (
                  <div key={item.id} className="p-4 sm:p-6 flex gap-4 sm:gap-6">
                    <div className="w-20 h-24 sm:w-24 sm:h-32 rounded-lg overflow-hidden shrink-0 border border-outline-variant/20">
                      <img
                        onError={handleImageError}
                        src={item.imageSrc}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-on-surface line-clamp-1">
                            {item.title}
                          </h4>
                          <span className="text-[11px] text-secondary block mt-1 font-medium italic">
                            Style: {item.variant}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-on-surface">
                          ₹{item.price.toLocaleString()}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center gap-4 text-[11px] text-secondary">
                        <span className="flex items-center gap-1">
                          Qty:{" "}
                          <strong className="text-on-surface">
                            {item.quantity}
                          </strong>
                        </span>
                        <span className="text-outline-variant">|</span>
                        <span className="text-green-700 font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">
                            local_shipping
                          </span>
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
                Price Details
              </h3>
              <div className="space-y-3 text-xs text-on-surface">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Promo Discount</span>
                  <span className="text-green-700 font-medium">- ₹{order.discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span className="text-green-700 font-bold">{order.shippingFee === 0 ? "FREE" : `₹${order.shippingFee}`}</span>
                </div>
                <div className="h-[1px] bg-outline-variant/40 my-3" />
                <div className="flex justify-between items-baseline font-bold">
                  <span className="text-sm">Total Paid</span>
                  <span className="text-base text-primary">
                    ₹{order.totalAmount.toLocaleString()}
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
                <p className="font-bold text-sm">
                  {order.deliveryAddress.name}
                </p>
                <p className="text-secondary leading-relaxed">
                  {order.deliveryAddress.addressString},{" "}
                  {order.deliveryAddress.locality}
                  <br />
                  {order.deliveryAddress.city},{" "}
                  {order.deliveryAddress.state} —{" "}
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
                Via:{" "}
                <strong className="text-on-surface">
                  {order.paymentMode}
                </strong>
              </p>
            </div>

            {/* Required Timeline Card */}
            {order.needByDate && (
              <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-secondary uppercase tracking-wider">
                    Timeline Requested
                  </span>
                  <span className="bg-[#735c00]/5 text-[#735c00] px-2.5 py-1 rounded-full font-bold border border-[#735c00]/25 uppercase text-[10px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                    Customer Request
                  </span>
                </div>
                <p className="text-[11px] text-secondary mt-3">
                  By when needed:{" "}
                  <strong className="text-on-surface font-semibold">
                    {order.needByDate}
                  </strong>
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
                Print Shipping Invoice Label
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
              <p className="font-medium tracking-wide">
                100% Authentic Artisanal Pieces
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Styled Hidden HTML Print Layout for Invoices */}
      <div id="invoice-print-area" className="hidden p-4 bg-white text-black text-xs leading-relaxed max-w-sm mx-auto">
        {order && (
          <div className="border-2 border-black p-3 font-mono uppercase text-[9px] tracking-tight">
            {/* Top row with logo and payment type */}
            <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
              <div>
                <span className="font-sans font-black tracking-tighter text-sm">SIRI ARTS</span>
                <span className="block text-[8px] text-gray-600 font-sans tracking-wide">STUDIO & CRAFTS</span>
              </div>
              <div className="border-2 border-black bg-black text-white px-3 py-1 font-bold text-center leading-none">
                <span className="text-[12px] block">
                  {order.paymentMode.includes('COD') ? 'COD' : 'PREPAID'}
                </span>
                <span className="text-[8px] tracking-wider block mt-0.5">
                  ₹{order.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* AWB & Barcode */}
            <div className="text-center border-b-2 border-black pb-2 mb-2">
              <BarcodeSVG val={`SR-${order.orderId.substring(order.orderId.length - 8).toUpperCase()}-IN`} />
              <div className="flex justify-between items-center px-1 font-bold text-[8px] mt-1">
                <span>AWB: SR-{order.orderId.substring(order.orderId.length - 8).toUpperCase()}-IN</span>
                <span>ORD: #{order.orderId.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>

            {/* Deliver To Address */}
            <div className="border-b-2 border-black pb-2 mb-2 text-left">
              <span className="font-bold text-[9px] block mb-1">DELIVER TO:</span>
              <strong className="text-[11px] block">{order.deliveryAddress.name}</strong>
              <p className="text-[9px] leading-tight mt-1 whitespace-pre-line lowercase">
                {order.deliveryAddress.addressString}, {order.deliveryAddress.locality},
                <br />
                {order.deliveryAddress.city}, {order.deliveryAddress.state}
              </p>
              <div className="flex justify-between items-center mt-2 pt-1 border-t border-dashed border-gray-300">
                <span className="font-black text-[12px]">PIN: {order.deliveryAddress.pincode}</span>
                <span className="font-bold">PH: {order.deliveryAddress.phone}</span>
              </div>
            </div>

            {/* Seller & Product table */}
            <div className="border-b-2 border-black pb-2 mb-2 text-left">
              <table className="w-full text-[8px] border-collapse">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="py-1 text-left">ITEM DETAIL</th>
                    <th className="py-1 text-center">QTY</th>
                    <th className="py-1 text-right">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-200">
                      <td className="py-1 text-left truncate max-w-[180px]">
                        {item.title} <span className="text-[7px] text-gray-500">({item.variant || 'Default'})</span>
                      </td>
                      <td className="py-1 text-center font-bold">{item.quantity}</td>
                      <td className="py-1 text-right font-bold">₹{item.price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Invoice Details & QR */}
            <div className="flex justify-between items-start">
              <div className="text-left text-[7px] text-gray-600 space-y-0.5">
                <p><strong>SOLD BY:</strong> SIRI ARTS & CRAFTS, HYD, IN</p>
                <p><strong>GSTIN:</strong> 36AAAES9284D1ZX</p>
                <p><strong>INV NO:</strong> IN-{order.orderId.substring(order.orderId.length - 8).toUpperCase()}</p>
                <p><strong>DATE:</strong> {order.date}</p>
                <p className="mt-1 font-bold text-black text-[6px]">COMPUTER GENERATED LABEL. NO SIGNATURE REQ.</p>
              </div>
              <div className="shrink-0 flex flex-col items-center">
                <QRCodeSVG value={`${window.location.origin}${order.trackingPath || `/track/${order._id}`}`} size={44} level="M" />
                <span className="text-[6px] font-bold text-gray-500 mt-0.5">VERIFIED</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* shipping sticker preview modal */}
      <AnimatePresence>
        {showStickerModal && order && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-surface-bright rounded-2xl p-5 max-w-sm w-full shadow-2xl relative border border-outline-variant/30 flex flex-col items-center"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowStickerModal(false)}
                className="absolute top-4 right-4 text-secondary hover:text-on-surface transition-colors w-8 h-8 rounded-full bg-surface-container flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>

              <div className="text-center mb-4">
                <span className="material-symbols-outlined text-primary text-3xl font-bold">local_shipping</span>
                <h3 className="font-display text-[16px] font-bold text-on-surface mt-1">Package Shipping Sticker</h3>
                <p className="text-[9px] text-secondary uppercase tracking-widest font-bold">Thermal Print Format</p>
              </div>

              {/* The Live Sticker Preview Panel */}
              <div className="w-full bg-white border-2 border-dashed border-black p-3.5 font-mono text-[9px] leading-tight text-black rounded-lg shadow-inner select-none mb-5 uppercase">
                {/* Top row with logo and payment type */}
                <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                  <div>
                    <span className="font-sans font-black tracking-tighter text-sm">SIRI ARTS</span>
                    <span className="block text-[8px] text-gray-600 font-sans tracking-wide">STUDIO & CRAFTS</span>
                  </div>
                  <div className="border-2 border-black bg-black text-white px-3 py-1 font-bold text-center leading-none">
                    <span className="text-[12px] block">
                      {order.paymentMode.includes('COD') ? 'COD' : 'PREPAID'}
                    </span>
                    <span className="text-[8px] tracking-wider block mt-0.5">
                      ₹{order.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* AWB & Barcode */}
                <div className="text-center border-b-2 border-black pb-2 mb-2">
                  <BarcodeSVG val={`SR-${order.orderId.substring(order.orderId.length - 8).toUpperCase()}-IN`} />
                  <div className="flex justify-between items-center px-1 font-bold text-[8px] mt-1">
                    <span>AWB: SR-{order.orderId.substring(order.orderId.length - 8).toUpperCase()}-IN</span>
                    <span>ORD: #{order.orderId.substring(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                {/* Deliver To Address */}
                <div className="border-b-2 border-black pb-2 mb-2 text-left">
                  <span className="font-bold text-[9px] block mb-1">DELIVER TO:</span>
                  <strong className="text-[11px] block">{order.deliveryAddress.name}</strong>
                  <p className="text-[9px] leading-tight mt-1 whitespace-pre-line lowercase">
                    {order.deliveryAddress.addressString}, {order.deliveryAddress.locality},
                    <br />
                    {order.deliveryAddress.city}, {order.deliveryAddress.state}
                  </p>
                  <div className="flex justify-between items-center mt-2 pt-1 border-t border-dashed border-gray-300">
                    <span className="font-black text-[12px]">PIN: {order.deliveryAddress.pincode}</span>
                    <span className="font-bold">PH: {order.deliveryAddress.phone}</span>
                  </div>
                </div>

                {/* Seller & Product table */}
                <div className="border-b-2 border-black pb-2 mb-2 text-left">
                  <table className="w-full text-[8px] border-collapse">
                    <thead>
                      <tr className="border-b border-black font-bold">
                        <th className="py-1 text-left">ITEM DETAIL</th>
                        <th className="py-1 text-center">QTY</th>
                        <th className="py-1 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-200">
                          <td className="py-1 text-left truncate max-w-[150px]">
                            {item.title} <span className="text-[7px] text-gray-500">({item.variant || 'Default'})</span>
                          </td>
                          <td className="py-1 text-center font-bold">{item.quantity}</td>
                          <td className="py-1 text-right font-bold">₹{item.price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Invoice Details & QR */}
                <div className="flex justify-between items-start">
                  <div className="text-left text-[7px] text-gray-600 space-y-0.5">
                    <p><strong>SOLD BY:</strong> SIRI ARTS & CRAFTS, HYD, IN</p>
                    <p><strong>GSTIN:</strong> 36AAAES9284D1ZX</p>
                    <p><strong>INV NO:</strong> IN-{order.orderId.substring(order.orderId.length - 8).toUpperCase()}</p>
                    <p><strong>DATE:</strong> {order.date}</p>
                    <p className="mt-1 font-bold text-black text-[6px]">COMPUTER GENERATED LABEL. NO SIGNATURE REQ.</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-center">
                    <QRCodeSVG value={`${window.location.origin}${order.trackingPath || `/track/${order._id}`}`} size={44} level="M" />
                    <span className="text-[6px] font-bold text-gray-500 mt-0.5">VERIFIED</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3.5 w-full">
                <button
                  onClick={() => {
                    setShowStickerModal(false);
                    setTimeout(() => window.print(), 150);
                  }}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-lg shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  Print Sticker
                </button>
                <button
                  onClick={() => setShowStickerModal(false)}
                  className="bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs uppercase tracking-widest px-5 py-3.5 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
