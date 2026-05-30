import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { InvoiceTemplate } from "../../components/ui";
import { playSuccessBeep, playErrorBeep } from "../../utils/audioUtils";
import toast from "react-hot-toast";
import {
  PageHeader,
  StatusBadge,
  formatCurrency,
  fadeUp,
  stagger,
  SkeletonDashboard,
} from "../components/AdminUIKit";

const allStatuses = [
  "Pending", "Confirmed", "Packed", "Ready to Ship", "Shipped",
  "Out for Delivery", "Delivered", "Settled", "Cancelled", "Returned", "Refunded",
];

const statusIcons = {
  "Pending": "schedule", "Confirmed": "thumb_up", "Packed": "inventory_2",
  "Ready to Ship": "conveyor_belt", "Shipped": "local_shipping", "Out for Delivery": "directions_run",
  "Delivered": "check_circle", "Settled": "payments", "Cancelled": "cancel",
  "Returned": "keyboard_return", "Refunded": "payments",
};

export function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, dataLoading, updateOrderStatus } = useAdmin();
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
        order.id, "Settled", 
        `COD Remittance Reconciled. Courier Charges: ₹${settlementCharges}`, 
        Number(settlementCharges)
      );
      playSuccessBeep();
      toast.success("Payment settled");
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

  if (dataLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <SkeletonDashboard />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">
          receipt_long
        </span>
        <p className="text-[16px] font-bold text-[var(--admin-text-primary)] mb-4">Order not found</p>
        <button
          onClick={() => navigate("/admin/orders")}
          className="admin-btn h-10 px-6"
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
      <div className="hidden print-only bg-[var(--admin-surface)] text-black text-[11px] p-0 w-full h-full relative">
        <InvoiceTemplate order={order} />
      </div>

      {/* NORMAL SCREEN LAYOUT */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="space-y-6 no-print"
      >
        {/* Header */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/orders")}
              className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)]"
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_back
              </span>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-none">
                  {order.id}
                </h2>
                <StatusBadge status={order.payment.replace("_", "")} />
              </div>
              <p className="text-[12px] text-[var(--admin-text-tertiary)] font-medium mt-1.5">Placed on {order.date}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => {
                setPrintStickerOnly(false);
                setTimeout(() => window.print(), 100);
              }}
              className="admin-btn admin-btn-primary h-9"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              Print Invoice
            </button>
            <button 
              onClick={() => setShowStickerModal(true)}
              className="admin-btn admin-btn-outline h-9"
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              View Invoice
            </button>
            <a
              href={`https://wa.me/${order.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn h-9 bg-[var(--admin-success)] text-white hover:bg-[var(--admin-success-light)] border-none"
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
              className="admin-card p-6"
            >
              <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-4">
                Update Logistics Status
              </h2>
              <div className="flex flex-wrap gap-2">
                {allStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateOrderStatus(order.id, s)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[var(--admin-radius-lg)] text-[12px] font-bold cursor-pointer transition-all border ${
                      order.status === s
                        ? "bg-[var(--admin-accent)] border-[var(--admin-accent)] text-white shadow-sm"
                        : "bg-[var(--admin-surface)] border-[var(--admin-border-subtle)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-border-strong)] hover:text-[var(--admin-text-primary)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {statusIcons[s]}
                    </span>
                    {s}
                  </button>
                ))}
              </div>
              
              {/* Progress Track */}
              <div className="mt-8 pt-6 border-t border-[var(--admin-border-subtle)] flex items-center gap-1 overflow-x-auto pb-2 custom-scrollbar">
                {["Pending", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered"
                ].map((s, i, arr) => {
                  const idx = arr.indexOf(order.status);
                  const active = i <= idx && order.status !== "Cancelled" && order.status !== "Returned" && order.status !== "Refunded";
                  return (
                    <React.Fragment key={s}>
                      <div
                        title={s}
                        className={`w-10 h-10 rounded-full flex flex-col items-center justify-center text-[18px] shrink-0 transition-colors ${
                          active
                            ? "bg-[var(--admin-accent)] text-white shadow-sm"
                            : "bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border)]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{statusIcons[s]}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div
                          className={`flex-1 min-w-[20px] h-1 rounded-full ${i < idx && active ? "bg-[var(--admin-accent)]" : "bg-[var(--admin-surface-muted)]"}`}
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
                className="admin-card p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--admin-warning)]"></div>
                
                <div className="flex items-center justify-between mb-4 border-b border-[var(--admin-border-subtle)] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[var(--admin-warning)]">account_balance_wallet</span>
                    <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)]">COD Reconciliation & Settlement</h2>
                  </div>
                  <span className={`admin-badge border-none font-bold text-[10px] uppercase tracking-wider h-6 px-2.5 ${
                    order.rawOrder?.settlementStatus === 'Settled' 
                      ? 'bg-[var(--admin-success-light)] text-[var(--admin-success)]' 
                      : 'bg-[#fffbeb] text-[#d97706]'
                  }`}>
                    {order.rawOrder?.settlementStatus || 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                  <div className="bg-[var(--admin-surface-muted)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
                    <span className="block text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider mb-1">Total COD Volume</span>
                    <span className="text-[16px] font-bold text-[var(--admin-text-primary)]">{formatCurrency(order.total)}</span>
                  </div>
                  <div className="bg-[var(--admin-surface-muted)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
                    <span className="block text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider mb-1">Courier Deductions</span>
                    <span className="text-[16px] font-bold text-[var(--admin-warning)]">{formatCurrency(order.rawOrder?.courierCharges || settlementCharges)}</span>
                  </div>
                  <div className="bg-[var(--admin-surface-muted)] p-4 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
                    <span className="block text-[10px] text-[var(--admin-text-tertiary)] font-bold uppercase tracking-wider mb-1">Bank Payout Amount</span>
                    <span className="text-[16px] font-bold text-[var(--admin-success)]">
                      {order.rawOrder?.settlementStatus === 'Settled' 
                        ? formatCurrency(order.rawOrder?.settledAmount || (order.total - (order.rawOrder?.courierCharges || 150)))
                        : formatCurrency(order.total - settlementCharges)
                      }
                    </span>
                  </div>
                </div>

                {order.rawOrder?.settlementStatus !== 'Settled' ? (
                  <div className="bg-[#fffbeb] p-5 rounded-[var(--admin-radius-lg)] border border-[#fde68a] space-y-4">
                    <p className="text-[12px] text-[#92400e] leading-relaxed font-medium">
                      This order is marked as <strong>{order.payment}</strong>. The courier partner ({order.courierPartner || 'Delhivery'}) has collected the cash. Adjust and enter the actual shipping + COD handling fees below to reconcile the remittance to our bank.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      <div className="w-full sm:w-1/2 text-left">
                        <label className="admin-label text-[#92400e]">Adjust Courier Fee (₹)</label>
                        <input
                          type="number"
                          value={settlementCharges}
                          onChange={(e) => setSettlementCharges(Math.max(0, Number(e.target.value)))}
                          className="admin-input bg-[var(--admin-surface)] border-[#fcd34d] focus:border-[#d97706] focus:ring-[#fcd34d]"
                        />
                      </div>
                      <button
                        onClick={handleReconcileCOD}
                        disabled={order.status !== 'Delivered'}
                        className={`admin-btn h-10 px-6 border-none ${
                          order.status === 'Delivered'
                            ? 'bg-[#d97706] text-white hover:bg-[#b45309]'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">done_all</span>
                        Reconcile & Settle COD
                      </button>
                    </div>
                    {order.status !== 'Delivered' && (
                      <p className="text-[11px] font-bold text-[var(--admin-error)]">
                        * Reconciliation can only be executed once status is updated to "Delivered" via agent scan or manual override.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-[var(--admin-success-light)] p-5 rounded-[var(--admin-radius-lg)] border border-[#bbf7d0] flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px] text-[var(--admin-success)] mt-0.5">check_circle</span>
                    <div className="space-y-1.5">
                      <p className="text-[13px] font-bold text-[#166534]">Remittance Fully Settled</p>
                      <p className="text-[12px] text-[#15803d] leading-relaxed font-medium">
                        Reconciled! Net payout of <strong>{formatCurrency(order.rawOrder?.settledAmount || (order.total - order.rawOrder?.courierCharges))}</strong> was received in the studio's bank account after deducting courier fees of <strong>{formatCurrency(order.rawOrder?.courierCharges)}</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Items */}
            <motion.div
              variants={fadeUp}
              className="admin-card p-6"
            >
              <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-5">
                Order Items
              </h2>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-subtle)] flex items-center justify-center overflow-hidden border border-[var(--admin-border)] shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[24px] text-[var(--admin-text-tertiary)]">
                            inventory_2
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-snug">
                          {item.name}
                        </p>
                        <p className="text-[12px] text-[var(--admin-text-tertiary)] font-bold mt-1">
                          Qty: {item.qty} × {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[14px] font-bold text-[var(--admin-text-primary)] shrink-0 ml-4">
                      {formatCurrency(item.qty * item.price)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-6 pt-5 border-t border-[var(--admin-border-strong)]">
                <span className="text-[16px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
                  Grand Total
                </span>
                <span className="text-[20px] font-bold text-[var(--admin-accent)]">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Logistics & Tracking Card */}
            <motion.div
              variants={fadeUp}
              className="admin-card p-6 relative overflow-hidden"
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-[var(--admin-text-primary)]"></div>
              
              <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-5 flex items-center justify-between">
                <span>Enterprise Logistics</span>
                <span className="text-[10px] bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] px-2 py-0.5 rounded-[var(--admin-radius-sm)] font-bold uppercase tracking-wider border border-[var(--admin-border-subtle)]">
                  {order.courierPartner || "Delhivery"}
                </span>
              </h2>
              
              <div className="space-y-3 mb-6 bg-[var(--admin-surface-muted)] p-5 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-[var(--admin-text-secondary)] font-medium">Tracking AWB</span>
                  <span className="font-bold text-[var(--admin-text-primary)]">{order.trackingNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-[var(--admin-text-secondary)] font-medium">Invoice No</span>
                  <span className="font-bold text-[var(--admin-text-primary)]">{order.invoiceNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-[var(--admin-text-secondary)] font-medium">Package</span>
                  <span className="font-bold text-[var(--admin-text-primary)]">{order.packageType || "Box"} ({order.weight || "1.0"}kg)</span>
                </div>
              </div>

              {order.barcodeData && (
                <div className="flex justify-center mb-6 py-4 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
                  <Barcode value={order.barcodeData} height={35} width={1.5} displayValue={false} background="transparent" />
                </div>
              )}
              
              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-[var(--admin-border-strong)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] transition-colors">
                <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-widest mb-3">Scan to Track</span>
                <QRCodeSVG value={trackingQR} size={110} level="M" />
              </div>
            </motion.div>

            {/* Customer & Shipping */}
            <motion.div
              variants={fadeUp}
              className="admin-card p-6"
            >
              <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] mb-5">
                Shipping Destination
              </h2>
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[var(--admin-border-subtle)]">
                <div className="w-12 h-12 rounded-[var(--admin-radius-md)] bg-[var(--admin-bg-subtle)] flex items-center justify-center border border-[var(--admin-border)] shrink-0">
                  <span className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                    {order.customer
                      .split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[var(--admin-text-primary)] leading-tight">
                    {order.customer}
                  </p>
                  <p className="text-[12px] text-[var(--admin-text-tertiary)] font-medium mt-1">{order.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0 mt-0.5">
                    phone
                  </span>
                  <div>
                    <span className="block text-[13px] font-medium text-[var(--admin-text-primary)]">{order.phone}</span>
                    {order.shippingAddress?.alternatePhone && <span className="block text-[11px] text-[var(--admin-text-secondary)] mt-1 font-medium">Alt: {order.shippingAddress.alternatePhone}</span>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0 mt-0.5">
                    location_on
                  </span>
                  <div className="leading-relaxed text-[13px] text-[var(--admin-text-secondary)] font-medium">
                    <span className="block">{order.address}</span>
                    {order.shippingAddress?.landmark && <span className="block text-[11px] mt-1.5 text-[var(--admin-text-primary)] font-bold">Landmark: {order.shippingAddress.landmark}</span>}
                  </div>
                </div>
                
                {order.needByDate && (
                  <div className="flex items-start gap-3 mt-5 p-3.5 bg-[var(--admin-success-light)] rounded-[var(--admin-radius-lg)] border border-[#bbf7d0]">
                    <span className="material-symbols-outlined text-[18px] text-[var(--admin-success)] mt-0.5 shrink-0">
                      calendar_today
                    </span>
                    <div>
                      <span className="block text-[12px] font-bold text-[#166534]">Required Need-By Date</span>
                      <span className="block text-[13px] font-bold text-[#15803d] mt-1">
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
                  <div className="flex items-start gap-3 mt-4 p-3.5 bg-[#fffbeb] rounded-[var(--admin-radius-lg)] border border-[#fde68a]">
                    <span className="material-symbols-outlined text-[18px] text-[#d97706] mt-0.5 shrink-0">
                      info
                    </span>
                    <span className="text-[12px] text-[#92400e] font-medium italic">"{order.shippingAddress.deliveryInstructions}"</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div variants={fadeUp} className="space-y-3">
              {order.status !== "Cancelled" && order.status !== "Delivered" && order.status !== "Refunded" && (
                <button
                  onClick={() => updateOrderStatus(order.id, "Cancelled")}
                  className="admin-btn admin-btn-outline w-full h-11 border-[var(--admin-error-light)] text-[var(--admin-error)] bg-[var(--admin-error-light)] hover:bg-[var(--admin-error)] hover:text-white hover:border-[var(--admin-error)] transition-colors border-none"
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
              className="invoice-modal-container fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] md:w-full md:max-w-3xl max-h-[calc(100vh-2rem)] md:max-h-[90vh] bg-[var(--admin-surface)] rounded-[var(--admin-radius-2xl)] shadow-[var(--admin-shadow-2xl)] z-[101] overflow-y-auto custom-scrollbar print:static print:translate-x-0 print:translate-y-0 print:h-auto print:max-w-none print:shadow-none print:bg-white"
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
