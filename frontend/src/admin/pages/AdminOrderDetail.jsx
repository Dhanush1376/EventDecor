import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { InvoiceTemplate } from "../../components/ui";
import { playSuccessBeep, playErrorBeep } from "../../utils/audioUtils";
import toast from "react-hot-toast";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const allStatuses = [
  "Pending",
  "Confirmed",
  "Packed",
  "Ready to Ship",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Settled",
  "Cancelled",
  "Returned",
  "Refunded",
];

const statusColors = {
  "Pending": "text-amber-600 bg-amber-50 border-amber-200",
  "Confirmed": "text-black bg-slate-100 border-slate-300",
  "Packed": "text-purple-600 bg-purple-50 border-purple-200",
  "Ready to Ship": "text-black bg-slate-100 border-slate-300",
  "Shipped": "text-cyan-600 bg-cyan-50 border-cyan-200",
  "Out for Delivery": "text-teal-600 bg-teal-50 border-teal-200",
  "Delivered": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "Settled": "text-green-700 bg-green-50 border-green-200",
  "Cancelled": "text-red-600 bg-red-50 border-red-200",
  "Returned": "text-orange-600 bg-orange-50 border-orange-200",
  "Refunded": "text-gray-600 bg-gray-50 border-gray-200",
};

const statusIcons = {
  "Pending": "schedule",
  "Confirmed": "thumb_up",
  "Packed": "inventory_2",
  "Ready to Ship": "conveyor_belt",
  "Shipped": "local_shipping",
  "Out for Delivery": "directions_run",
  "Delivered": "check_circle",
  "Settled": "payments",
  "Cancelled": "cancel",
  "Returned": "keyboard_return",
  "Refunded": "payments",
};

export function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, updateOrderStatus } = useAdmin();
  const order = orders.find((o) => o.id === orderId);

  const [showStickerModal, setShowStickerModal] = React.useState(false);
  const [printStickerOnly, setPrintStickerOnly] = React.useState(false);
  const [settlementCharges, setSettlementCharges] = React.useState(150);
  
  React.useEffect(() => {
    if (order && order.rawOrder) {
      const timer = setTimeout(() => {
        setSettlementCharges(order.rawOrder.courierCharges || 150);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [order]);

  const handleReconcileCOD = async () => {
    try {
      await updateOrderStatus(
        order.id, 
        "Settled", 
        `COD Remittance Reconciled. Courier Charges: ₹${settlementCharges}`, 
        Number(settlementCharges)
      );
      playSuccessBeep();
      toast.success("COD Remittance reconciled and settled successfully!");
    } catch (error) {
      playErrorBeep();
      toast.error("Failed to reconcile COD remittance.");
    }
  };

  // Capture physical barcode scanner keyboard inputs
  React.useEffect(() => {
    if (!order) return;
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyPress = (e) => {
      const currentTime = Date.now();
      
      // Scanners input extremely quickly (< 50ms)
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
          
          const cleanOrderId = order.id.toUpperCase();
          const cleanAWB = (order.trackingNumber || "").toUpperCase();
          const customBarcode = `SR-${order.id.substring(order.id.length - 8).toUpperCase()}-IN`;
          const invoiceNum = (order.invoiceNumber || "").toUpperCase();

          if (
            scannedCode === cleanOrderId ||
            scannedCode === cleanAWB ||
            scannedCode === customBarcode ||
            scannedCode === invoiceNum ||
            scannedCode.includes(cleanOrderId.substring(0, 8))
          ) {
            playSuccessBeep();
            
            const currentIdx = allStatuses.indexOf(order.status);
            if (currentIdx !== -1 && currentIdx < allStatuses.length - 1) {
              const nextStatus = allStatuses[currentIdx + 1];
              if (["Cancelled", "Returned", "Refunded"].includes(nextStatus)) {
                toast.success(`Package is already at final state: ${order.status}`);
              } else {
                updateOrderStatus(order.id, nextStatus, `Physical scan verification transition to ${nextStatus}`);
                toast.success(`Package Verified! Status transitioned from ${order.status} to ${nextStatus}`);
              }
            }
          } else {
            playErrorBeep();
            toast.error(`Scan mismatch! Code "${scannedCode}" does not match this order.`);
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
  }, [order, updateOrderStatus]);

  if (!order) {
    return (
      <div className="max-w-[900px] mx-auto py-20 text-center">
        <span className="material-symbols-outlined text-[64px] text-outline-variant">
          receipt_long
        </span>
        <p className="text-[16px] text-outline mt-4">Order not found</p>
        <button
          onClick={() => navigate("/admin/orders")}
          className="btn-minimal group mt-4"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const trackingQR = `${window.location.origin}/track/${order.id}`;

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: ${printStickerOnly ? "auto" : "A4 portrait"}; margin: ${printStickerOnly ? "0" : "15mm"}; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white; }
          
          body * {
            visibility: hidden !important;
          }
          .print-only, .print-only *, .sticker-print-only, .sticker-print-only * {
            visibility: visible !important;
          }
          
          /* Force only our printable layouts to print */
          .print-only {
            display: ${printStickerOnly ? "none" : "block"} !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          .sticker-print-only {
            display: ${printStickerOnly ? "block" : "none"} !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          .no-print { display: none !important; }
          .print-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        `}
      </style>

      {/* PRINT-ONLY INVOICE LAYOUT */}
      <div className="hidden print-only bg-white text-black text-sm p-0 w-full h-full relative">
        <InvoiceTemplate order={order} />
      </div>

      {/* NORMAL SCREEN LAYOUT */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className="max-w-[1100px] mx-auto space-y-6 no-print"
      >
        {/* Header */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/orders")}
              className="w-10 h-10 rounded-xl bg-white border border-surface-container-highest/60 flex items-center justify-center text-outline hover:text-black hover:border-slate-900-container/30 cursor-pointer transition-all hover:shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_back
              </span>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[24px] font-bold text-on-surface font-display">
                  {order.id}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${order.payment === "Paid" ? "bg-emerald-100 text-emerald-700" : order.payment === "COD" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                  {order.payment}
                </span>
              </div>
              <p className="text-[13px] text-outline">Placed on {order.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setPrintStickerOnly(false);
                setTimeout(() => window.print(), 100);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-2xl text-[12px] font-bold hover:shadow-lg hover:bg-slate-900 cursor-pointer transition-all active:scale-[0.98]">
              <span className="material-symbols-outlined text-[16px]">
                print
              </span>
              Print Invoice
            </button>
            <button 
              onClick={() => setShowStickerModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-900 text-black rounded-2xl text-[12px] font-bold hover:shadow-lg hover:bg-slate-50 cursor-pointer transition-all active:scale-[0.98]">
              <span className="material-symbols-outlined text-[16px]">
                receipt_long
              </span>
              View Invoice
            </button>
            <a
              href={`https://wa.me/${order.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-2xl text-[12px] font-bold hover:bg-green-700 hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              WhatsApp
            </a>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Status Update */}
            <motion.div
              variants={fadeUp}
              className="bg-white rounded-2xl border border-surface-container-highest/60 p-6 shadow-sm"
            >
              <h2 className="text-[15px] font-bold text-on-surface mb-4">
                Update Logistics Status
              </h2>
              <div className="flex flex-wrap gap-2">
                {allStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateOrderStatus(order.id, s)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-[12px] font-bold cursor-pointer transition-all border-2 active:scale-[0.96] ${order.status === s ? statusColors[s] + " shadow-sm" : "border-surface-container-highest/60 text-outline hover:border-slate-900-container/30 hover:text-black"}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {statusIcons[s]}
                    </span>
                    {s}
                  </button>
                ))}
              </div>
              
              {/* Progress Track */}
              <div className="mt-8 pt-6 border-t border-surface-container-highest/60 flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  "Pending",
                  "Confirmed",
                  "Packed",
                  "Shipped",
                  "Out for Delivery",
                  "Delivered",
                ].map((s, i, arr) => {
                  const idx = arr.indexOf(order.status);
                  const active = i <= idx && order.status !== "Cancelled" && order.status !== "Returned" && order.status !== "Refunded";
                  return (
                    <React.Fragment key={s}>
                      <div
                        title={s}
                        className={`w-10 h-10 rounded-full flex flex-col items-center justify-center text-[18px] shrink-0 transition-colors ${active ? "bg-slate-100 text-black" : "bg-surface-container-low text-outline-variant"}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{statusIcons[s]}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div
                          className={`flex-1 min-w-[20px] h-1 ${i < idx && active ? "bg-slate-100" : "bg-surface-container-highest"}`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </motion.div>

            {/* Cash on Delivery Reconciliation & Settlement Panel */}
            {order.rawOrder?.paymentMethod?.toLowerCase() === 'cod' && (
              <motion.div
                variants={fadeUp}
                className="bg-white rounded-2xl border border-surface-container-highest/60 p-6 shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-600"></div>
                
                <div className="flex items-center justify-between mb-4 border-b border-surface-container-highest/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-amber-600">account_balance_wallet</span>
                    <h2 className="text-[15px] font-bold text-on-surface">COD Reconciliation & Settlement</h2>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    order.rawOrder?.settlementStatus === 'Settled' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {order.rawOrder?.settlementStatus || 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/20">
                    <span className="block text-[10px] text-outline font-bold uppercase tracking-wider mb-1">Total COD Volume</span>
                    <span className="text-[14px] font-bold text-on-surface">₹{order.total.toLocaleString()}</span>
                  </div>
                  <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/20">
                    <span className="block text-[10px] text-outline font-bold uppercase tracking-wider mb-1">Courier Deductions</span>
                    <span className="text-[14px] font-bold text-amber-700">₹{order.rawOrder?.courierCharges || settlementCharges}</span>
                  </div>
                  <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/20">
                    <span className="block text-[10px] text-outline font-bold uppercase tracking-wider mb-1">Bank Payout Amount</span>
                    <span className="text-[14px] font-bold text-green-700">
                      ₹{order.rawOrder?.settlementStatus === 'Settled' 
                        ? (order.rawOrder?.settledAmount || (order.total - (order.rawOrder?.courierCharges || 150))).toLocaleString()
                        : (order.total - settlementCharges).toLocaleString()
                      }
                    </span>
                  </div>
                </div>

                {order.rawOrder?.settlementStatus !== 'Settled' ? (
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-3">
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      This order is marked as <strong>{order.payment}</strong>. The courier partner ({order.courierPartner || 'Delhivery'}) has collected the cash. Adjust and enter the actual shipping + COD handling fees below to reconcile the remittance to our bank.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      <div className="w-full sm:w-1/2 text-left">
                        <label className="block text-[9px] uppercase font-bold text-secondary mb-1">Adjust Courier Fee (₹)</label>
                        <input
                          type="number"
                          value={settlementCharges}
                          onChange={(e) => setSettlementCharges(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-white border border-outline-variant rounded p-2 text-xs outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                      <button
                        onClick={handleReconcileCOD}
                        disabled={order.status !== 'Delivered'}
                        className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                          order.status === 'Delivered'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white active:scale-[0.98]'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">done_all</span>
                        Reconcile & Settle COD
                      </button>
                    </div>
                    {order.status !== 'Delivered' && (
                      <p className="text-[9px] text-red-500">
                        * Reconciliation can only be executed once status is updated to "Delivered" via agent scan or manual override.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-start gap-3 text-left">
                    <span className="material-symbols-outlined text-[18px] text-green-700 mt-0.5">check_circle</span>
                    <div className="space-y-1">
                      <p className="text-[12px] font-bold text-green-800">Remittance Fully Settled</p>
                      <p className="text-[11px] text-green-700/80 leading-relaxed">
                        Reconciled successfully! Net payout of <strong>₹{order.rawOrder?.settledAmount || (order.total - order.rawOrder?.courierCharges)}</strong> was received in the studio's bank account after deducting courier fees of <strong>₹{order.rawOrder?.courierCharges}</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Items */}
            <motion.div
              variants={fadeUp}
              className="bg-white rounded-2xl border border-surface-container-highest/60 p-6 shadow-sm"
            >
              <h2 className="text-[15px] font-bold text-on-surface mb-4">
                Order Items
              </h2>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-surface-container-highest/30 flex items-center justify-center overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[24px] text-outline">
                            inventory_2
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-on-surface">
                          {item.name}
                        </p>
                        <p className="text-[12px] text-outline mt-0.5">
                          Qty: {item.qty} × ₹{item.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-[16px] font-bold text-black">
                      ₹{(item.qty * item.price).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-6 pt-5 border-t-2 border-surface-container-highest/60">
                <span className="text-[16px] font-bold text-on-surface">
                  Grand Total
                </span>
                <span className="text-[24px] font-bold text-black font-display">
                  ₹{order.total.toLocaleString()}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Logistics & Tracking Card */}
            <motion.div
              variants={fadeUp}
              className="bg-white rounded-2xl border border-surface-container-highest/60 p-5 shadow-sm relative overflow-hidden"
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-black"></div>
              
              <h2 className="text-[15px] font-bold text-on-surface mb-4 flex items-center justify-between">
                <span>Enterprise Logistics</span>
                <span className="text-[10px] bg-slate-100 text-black px-2 py-0.5 rounded font-bold uppercase tracking-wider">{order.courierPartner || "Delhivery"}</span>
              </h2>
              
              <div className="space-y-2.5 mb-5 bg-surface p-4 rounded-xl">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-outline font-medium">Tracking AWB</span>
                  <span className="font-bold text-on-surface">{order.trackingNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-outline font-medium">Invoice No</span>
                  <span className="font-bold text-on-surface">{order.invoiceNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-outline font-medium">Package</span>
                  <span className="font-bold text-on-surface">{order.packageType || "Box"} ({order.weight || "1.0"}kg)</span>
                </div>
              </div>

              {order.barcodeData && (
                <div className="flex justify-center mb-4">
                  <Barcode value={order.barcodeData} height={35} width={1.5} displayValue={false} background="transparent" />
                </div>
              )}
              
              <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-outline-variant/50 rounded-xl bg-white">
                <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-2">Scan to Track</span>
                <QRCodeSVG value={trackingQR} size={110} level="M" />
              </div>
            </motion.div>

            {/* Customer & Shipping */}
            <motion.div
              variants={fadeUp}
              className="bg-white rounded-2xl border border-surface-container-highest/60 p-5 shadow-sm"
            >
              <h2 className="text-[15px] font-bold text-on-surface mb-4">
                Shipping Destination
              </h2>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-container/30 to-primary/10 flex items-center justify-center border border-slate-900-container/40">
                  <span className="text-[14px] font-bold text-black font-display">
                    {order.customer
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-on-surface">
                    {order.customer}
                  </p>
                  <p className="text-[11px] text-outline font-medium">{order.email}</p>
                </div>
              </div>
              <div className="space-y-3.5 bg-surface p-4 rounded-xl border border-surface-container-highest/40">
                <div className="flex items-start gap-2.5 text-[12px] text-outline">
                  <span className="material-symbols-outlined text-[16px] text-black mt-0.5">
                    phone
                  </span>
                  <div>
                    <span className="block font-medium text-on-surface">{order.phone}</span>
                    {order.shippingAddress?.alternatePhone && <span className="block text-[11px] mt-0.5">Alt: {order.shippingAddress.alternatePhone}</span>}
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-[12px] text-outline">
                  <span className="material-symbols-outlined text-[16px] text-black mt-0.5">
                    location_on
                  </span>
                  <div className="leading-relaxed">
                    <span className="block text-on-surface">{order.address}</span>
                    {order.shippingAddress?.landmark && <span className="block text-[11px] font-medium mt-1 text-black">Landmark: {order.shippingAddress.landmark}</span>}
                  </div>
                </div>
                {order.needByDate && (
                  <div className="flex items-start gap-2.5 text-[12px] text-outline bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600 mt-0.5">
                      calendar_today
                    </span>
                    <div>
                      <span className="block font-bold text-emerald-800">Required Need-By Date</span>
                      <span className="block font-medium text-emerald-700 mt-0.5">
                        {new Date(order.needByDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                )}
                {order.shippingAddress?.deliveryInstructions && (
                  <div className="flex items-start gap-2.5 text-[12px] text-outline bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                    <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5">
                      info
                    </span>
                    <span className="text-amber-800 font-medium italic">"{order.shippingAddress.deliveryInstructions}"</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div variants={fadeUp} className="space-y-3">
              {order.status !== "Cancelled" && order.status !== "Delivered" && order.status !== "Refunded" && (
                <button
                  onClick={() => updateOrderStatus(order.id, "Cancelled")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-600 bg-red-50/50 rounded-2xl text-[12px] font-bold hover:bg-red-100 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    cancel
                  </span>
                  Cancel Order
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showStickerModal && (
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

              <InvoiceTemplate 
                order={order} 
                onClose={() => setShowStickerModal(false)} 
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
