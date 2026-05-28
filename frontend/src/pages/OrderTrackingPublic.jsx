import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { orderService } from "../services/domainServices";
import { SEO } from "../components/seo/SEO";
import { handleImageError } from "../utils/imageUtils";
import { MandalaElement } from "../components/ui/MandalaElement";
import { playSuccessBeep, playErrorBeep } from "../utils/audioUtils";
import toast from "react-hot-toast";

const statusIcons = {
  "Pending": "schedule",
  "Confirmed": "thumb_up",
  "Packed": "inventory_2",
  "Ready to Ship": "local_shipping",
  "Shipped": "local_shipping",
  "Out for Delivery": "directions_run",
  "Delivered": "check_circle",
  "Cancelled": "cancel",
  "Returned": "keyboard_return",
  "Refunded": "payments",
};

const statusColors = {
  "Pending": "text-amber-600 bg-amber-50 border-amber-200",
  "Confirmed": "text-blue-600 bg-blue-50 border-blue-200",
  "Packed": "text-purple-600 bg-purple-50 border-purple-200",
  "Ready to Ship": "text-indigo-600 bg-indigo-50 border-indigo-200",
  "Shipped": "text-cyan-600 bg-cyan-50 border-cyan-200",
  "Out for Delivery": "text-teal-600 bg-teal-50 border-teal-200",
  "Delivered": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "Cancelled": "text-red-600 bg-red-50 border-red-200",
  "Returned": "text-orange-600 bg-orange-50 border-orange-200",
  "Refunded": "text-gray-600 bg-gray-50 border-gray-200",
};

const trackingSteps = [
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered"
];

export function OrderTrackingPublic() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get("token") || "";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Courier Panel State
  const [showOperatorPanel, setShowOperatorPanel] = useState(false);
  const [operatorPin, setOperatorPin] = useState("");
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [operatorNote, setOperatorNote] = useState("");

  const fetchTrackingDetails = useCallback(async () => {
    if (!trackingToken) {
      setError("A valid tracking link with security token is required. Check your order confirmation email.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await orderService.getPublicTrack(orderId, trackingToken);
      setOrder(res.data || res);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to fetch order tracking parameters. Please confirm the tracking ID.");
    } finally {
      setLoading(false);
    }
  }, [orderId, trackingToken]);

  const getNextStatus = useCallback((current) => {
    const idx = trackingSteps.indexOf(current);
    if (idx !== -1 && idx < trackingSteps.length - 1) {
      return trackingSteps[idx + 1];
    }
    return null;
  }, []);

  const verifyCourierPin = (e) => {
    e.preventDefault();
    if (operatorPin.trim() === "SIRI2026") {
      setIsPinVerified(true);
      toast.success("Logistics Operator Session Initialized!");
    } else {
      toast.error("Invalid Logistics Security Pin");
      setOperatorPin("");
    }
  };

  const handleStatusUpdate = useCallback(async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await orderService.updatePublicStatus(
        orderId, 
        newStatus, 
        operatorNote || `Dispatch transit scan: ${newStatus}`, 
        "SIRI2026"
      );
      toast.success(`Logistics status updated to ${newStatus}`);
      setOperatorNote("");
      // Reload order details to refresh the timeline
      await fetchTrackingDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update logistics status.");
    } finally {
      setUpdatingStatus(false);
    }
  }, [orderId, operatorNote, fetchTrackingDetails]);

  useEffect(() => {
    if (orderId) {
      const timer = setTimeout(() => {
        fetchTrackingDetails();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [orderId, fetchTrackingDetails]);

  // Capture physical barcode scanner keyboard inputs
  useEffect(() => {
    if (!order) return;
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyPress = (e) => {
      const currentTime = Date.now();
      
      // Fast scans from barcode sweep (< 50ms)
      if (currentTime - lastKeyTime > 50) {
        buffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
        return;
      }

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          const scannedCode = buffer.trim().toUpperCase();
          buffer = "";
          
          const cleanOrderId = order._id.toUpperCase();
          const cleanAWB = (order.trackingNumber || "").toUpperCase();
          const customBarcode = `SR-${order._id.substring(order._id.length - 8).toUpperCase()}-IN`;

          if (
            scannedCode === cleanOrderId ||
            scannedCode === cleanAWB ||
            scannedCode === customBarcode ||
            scannedCode.includes(cleanOrderId.substring(0, 8))
          ) {
            playSuccessBeep();
            
            if (!isPinVerified) {
              setShowOperatorPanel(true);
              toast.success("Package verified! Please enter Logistics PIN to authorize status updates.");
            } else {
              // Automatically advance to the next state
              const nextStatus = getNextStatus(order.orderStatus);
              if (nextStatus) {
                handleStatusUpdate(nextStatus);
                toast.success(`Package Verified! Advancing status to ${nextStatus}...`);
              } else {
                toast.success("Package is already delivered!");
              }
            }
          } else {
            playErrorBeep();
            toast.error(`Scan mismatch! Barcode "${scannedCode}" does not match this package.`);
          }
        }
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [order, isPinVerified, getNextStatus, handleStatusUpdate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-bright flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center w-20 h-20 mb-4">
          <div className="skeleton-box inline-block w-8 h-8 rounded-md" />
          <span className="font-display text-2xl text-primary">✦</span>
        </div>
        <p className="text-xs text-secondary font-bold uppercase tracking-widest animate-pulse">
          Connecting to Delhivery Logistics Feed...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface-bright flex flex-col items-center justify-center p-6 text-center">
        <SEO title="Tracking Error | Siri Arts" />
        <span className="material-symbols-outlined text-[64px] text-red-400 mb-4 animate-bounce">
          local_shipping
        </span>
        <h2 className="font-display text-xl font-bold text-on-surface mb-2">
          Tracking Record Unreachable
        </h2>
        <p className="text-xs text-secondary max-w-sm mb-6 leading-relaxed">
          {error || "We could not fetch tracking details for this dispatch token."}
        </p>
        <Link
          to="/"
          className="btn-primary px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md"
        >
          Return to Atelier
        </Link>
      </div>
    );
  }

  const activeIndex = trackingSteps.indexOf(order.orderStatus);

  return (
    <div className="min-h-screen bg-surface-bright py-12 px-4 sm:px-6 relative overflow-hidden">
      <SEO title={`Track Dispatch #${order._id.substring(0, 8).toUpperCase()} | Siri Arts & Crafts`} />
      
      {/* Decorative Brand Mandala */}
      <MandalaElement
        variant={2}
        size={500}
        className="absolute -top-40 -right-40 opacity-[0.03] pointer-events-none"
      />
      <MandalaElement
        variant={1}
        size={550}
        className="absolute -bottom-40 -left-40 opacity-[0.03] pointer-events-none"
      />

      <div className="max-w-[800px] mx-auto space-y-6 relative z-10">
        
        {/* Top Header Card */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 md:p-8 shadow-xs text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
            <span className="material-symbols-outlined text-xs">local_shipping</span>
            <span>{order.courierPartner || "Delhivery Logistics"} Feed</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live Dispatch Tracking
          </h2>
          <p className="text-xs text-secondary leading-relaxed max-w-md mx-auto">
            Order Reference: <strong className="text-on-surface font-mono">{order._id}</strong>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-dashed border-outline-variant/30 text-left text-[11px]">
            <div>
              <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">AWB Tracking No</span>
              <strong className="text-on-surface font-mono text-xs">{order.trackingNumber || `SR-${order._id.substring(order._id.length - 8).toUpperCase()}-IN`}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">Date Dispatched</span>
              <strong className="text-on-surface">{new Date(order.createdAt).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">Payment Method</span>
              <strong className="text-on-surface font-bold uppercase">{order.paymentMethod?.includes('COD') ? 'Cash on Delivery' : 'Prepaid (Online)'}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">Current Status</span>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${statusColors[order.orderStatus] || "bg-surface"}`}>
                {order.orderStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Timeline Visualization */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 md:p-8 shadow-xs">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest mb-6 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">route</span>
            <span>Transit Progress Tracker</span>
          </h2>

          {/* Desktop Timeline */}
          <div className="hidden sm:flex items-center justify-between gap-1 overflow-x-auto pb-4">
            {trackingSteps.map((step, idx) => {
              const active = idx <= activeIndex && order.orderStatus !== "Cancelled" && order.orderStatus !== "Returned" && order.orderStatus !== "Refunded";
              const isCurrent = step === order.orderStatus;
              
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center text-center shrink-0 w-24 relative">
                    <motion.div
                      animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-[20px] transition-all shadow-sm border ${
                        isCurrent
                          ? "bg-primary text-white border-primary"
                          : active
                          ? "bg-primary/10 text-primary border-primary/20 font-bold"
                          : "bg-surface-container text-outline-variant border-outline-variant/20"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{statusIcons[step]}</span>
                    </motion.div>
                    <span className={`text-[10px] font-bold uppercase mt-2 tracking-wider ${active ? "text-on-surface" : "text-secondary/60 font-medium"}`}>
                      {step}
                    </span>
                  </div>
                  {idx < trackingSteps.length - 1 && (
                    <div className="flex-1 h-[2px] bg-surface-container-highest relative -top-3">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: idx < activeIndex ? "100%" : "0%" }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Mobile Vertical Timeline */}
          <div className="sm:hidden space-y-6 relative pl-6 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-container-highest">
            {trackingSteps.map((step, idx) => {
              const active = idx <= activeIndex && order.orderStatus !== "Cancelled" && order.orderStatus !== "Returned" && order.orderStatus !== "Refunded";
              const isCurrent = step === order.orderStatus;

              return (
                <div key={step} className="flex gap-4 items-center relative">
                  <div
                    className={`w-8 h-8 rounded-full z-10 flex items-center justify-center text-[16px] border ${
                      isCurrent
                        ? "bg-primary text-white border-primary shadow"
                        : active
                        ? "bg-primary/10 text-primary border-primary/20 font-bold"
                        : "bg-surface-container text-outline-variant border-outline-variant/20"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{statusIcons[step]}</span>
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${active ? "text-on-surface" : "text-secondary/60 font-medium"}`}>
                      {step}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Transit History Logs */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 md:p-8 shadow-xs">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">history</span>
            <span>Detailed Activity Log</span>
          </h2>
          
          <div className="space-y-4">
            {order.statusHistory && order.statusHistory.length > 0 ? (
              <div className="relative pl-6 border-l border-outline-variant/30 space-y-6 text-[12px]">
                {order.statusHistory.slice().reverse().map((history, i) => (
                  <div key={i} className="relative">
                    <span className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-primary/15" />
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <strong className="text-on-surface uppercase tracking-wider block text-[11px] mb-0.5">
                          {history.status}
                        </strong>
                        <p className="text-secondary leading-relaxed font-light">
                          {history.note || `Order status updated to ${history.status}`}
                        </p>
                      </div>
                      <span className="text-[10px] text-secondary/60 shrink-0 font-medium whitespace-nowrap">
                        {new Date(history.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-secondary italic text-[11px]">
                No dispatch logs currently entered. Updates will log automatically here.
              </div>
            )}
          </div>
        </div>

        {/* Delivery Address & Package Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Destination Site */}
          <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-xs text-[12px]">
            <h3 className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-outline-variant/20 pb-2">
              <span className="material-symbols-outlined text-sm text-primary">location_on</span>
              <span>Destination Parameters</span>
            </h3>
            <div className="space-y-1 text-on-surface">
              <strong className="text-xs font-bold block mb-1">{order.shippingAddress.name}</strong>
              <p className="text-secondary leading-relaxed lowercase">
                {order.shippingAddress.address}, {order.shippingAddress.locality},
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state} — <strong>{order.shippingAddress.pincode}</strong>
              </p>
              <p className="pt-2 font-bold">Contact: {order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Package items details */}
          <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-xs text-[12px]">
            <h3 className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-outline-variant/20 pb-2">
              <span className="material-symbols-outlined text-sm text-primary">inventory_2</span>
              <span>Consignment Summary</span>
            </h3>
            <div className="divide-y divide-surface-container max-h-[140px] overflow-y-auto pr-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between gap-3 text-[11px] first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <h4 className="font-bold text-on-surface line-clamp-1">{item.title}</h4>
                    <span className="text-[10px] text-secondary font-light">Style: {item.variant || 'Default'} × Qty: {item.quantity}</span>
                  </div>
                  <strong className="text-on-surface shrink-0">₹{(item.price * item.quantity).toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Courier Scanning desk portal (Operator Section) */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Logistics Scanner Terminal
              </h3>
              <p className="text-[10px] text-secondary font-light mt-0.5">
                For Delhivery agents and warehouse managers scanning package labels.
              </p>
            </div>
            <button
              onClick={() => setShowOperatorPanel(!showOperatorPanel)}
              className="px-4 py-2 border border-primary text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5 transition-all cursor-pointer"
            >
              {showOperatorPanel ? "Lock Terminal" : "Initialize Scanner Mode"}
            </button>
          </div>

          <AnimatePresence>
            {showOperatorPanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4 pt-4 border-t border-dashed border-outline-variant/30"
              >
                {!isPinVerified ? (
                  <form onSubmit={verifyCourierPin} className="max-w-xs space-y-3">
                    <label className="block text-[9px] uppercase font-bold text-secondary tracking-widest">
                      Enter Logistics Bypass PIN
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="••••"
                        value={operatorPin}
                        onChange={(e) => setOperatorPin(e.target.value)}
                        className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2 text-xs font-bold tracking-widest w-24 text-center outline-none focus:border-primary"
                      />
                      <button
                        type="submit"
                        className="bg-primary hover:bg-primary-dark text-white rounded-xl px-6 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Authorize
                      </button>
                    </div>
                    <span className="block text-[8px] text-secondary font-light">
                      Default Bypass PIN for courier scanning verification: <strong>SIRI2026</strong>
                    </span>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-center justify-between text-green-700">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm font-bold">verified_user</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          Logistics Operator Session Authorized
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setIsPinVerified(false);
                          setOperatorPin("");
                        }}
                        className="text-[9px] text-red-600 font-bold uppercase hover:underline"
                      >
                        Reset Session
                      </button>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest">
                        ATELIER/TRANSIT SCAN NOTE
                      </label>
                      <input
                        type="text"
                        placeholder="Enter courier notes (e.g. Dispatched from Ongole warehouse, Out for delivery at Jubilee Hills hub)"
                        value={operatorNote}
                        onChange={(e) => setOperatorNote(e.target.value)}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                      />

                      <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest pt-2">
                        TAP CORRESPONDING SCAN EVENT TO UPDATE
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Packed",
                          "Ready to Ship",
                          "Shipped",
                          "Out for Delivery",
                          "Delivered",
                          "Cancelled"
                        ].map((s) => (
                          <button
                            key={s}
                            disabled={updatingStatus}
                            onClick={() => handleStatusUpdate(s)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-surface border border-outline-variant/40 rounded-xl text-[10.5px] font-bold text-secondary hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.96]"
                          >
                            <span className="material-symbols-outlined text-[15px]">{statusIcons[s]}</span>
                            <span>{s}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-secondary font-medium tracking-wide">
          SIRI ARTS & CRAFTS • ATELIER DELIVERIES • NEED HELP? CALL +91 99999 99999
        </div>
      </div>
    </div>
  );
}
