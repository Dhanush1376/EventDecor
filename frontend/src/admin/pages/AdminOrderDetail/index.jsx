import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { InvoiceTemplate } from '../../../components/ui';
import { SkeletonDashboard, stagger } from '../../components/AdminUIKit';
import { OrderHeader } from './OrderHeader';
import { OrderStatusTimeline } from './OrderStatusTimeline';

import { OrderSettlement } from './OrderSettlement';
import { OrderItems } from './OrderItems';
import { OrderShipping } from './OrderShipping';
import { OrderRentalActions } from './OrderRentalActions';
import { OrderReturnCard } from './OrderReturnCard';
import { useOrderScanner } from './hooks/useOrderScanner';

export function AdminOrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, dataLoading, updateOrderStatus } = useAdmin();
  const order = orders.find((o) => o.id === orderId);

  const [showStickerModal, setShowStickerModal] = useState(false);
  const [printStickerOnly, setPrintStickerOnly] = useState(false);
  const [settlementCharges, setSettlementCharges] = useState(150);

  useEffect(() => {
    if (order && order.rawOrder) {
      const timer = setTimeout(() => {
        setSettlementCharges(order.rawOrder.courierCharges || 150);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [order]);

  // Hook for hardware barcode scanner
  useOrderScanner(order, updateOrderStatus);

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
        <p className="text-[16px] font-bold text-[var(--admin-text-primary)] mb-4">
          Order not found
        </p>
        <button onClick={() => navigate('/admin/orders')} className="admin-btn h-10 px-6">
          Back to Orders
        </button>
      </div>
    );
  }

  const trackingQR = order.rawOrder?.qrCodeData || `${window.location.origin}/track/${order.id}`;

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: ${printStickerOnly ? 'auto' : 'A4 portrait'}; margin: ${printStickerOnly ? '0' : '15mm'}; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white; }
          
          body * {
            visibility: hidden !important;
          }
          .print-only, .print-only *, .sticker-print-only, .sticker-print-only * {
            visibility: visible !important;
          }
          
          /* Force only our printable layouts to print */
          .print-only {
            display: ${printStickerOnly ? 'none' : 'block'} !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          .sticker-print-only {
            display: ${printStickerOnly ? 'block' : 'none'} !important;
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
      <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 no-print">
        <OrderHeader
          order={order}
          navigate={navigate}
          onPrintInvoice={() => {
            setPrintStickerOnly(false);
            setTimeout(() => window.print(), 100);
          }}
          onViewInvoice={() => setShowStickerModal(true)}
        />

        <div className="max-w-[1400px] mx-auto w-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN: Operations & Timeline (2/3 Width) */}
            <div className="xl:col-span-2 space-y-3 sm:space-y-6 lg:space-y-8">
              {/* Status Timeline */}
              <OrderStatusTimeline order={order} updateOrderStatus={updateOrderStatus} />

              {/* Order Items */}
              <OrderItems order={order} />
            </div>

            {/* RIGHT COLUMN: Customer, Shipping, Financials (1/3 Width Sticky Sidebar) */}
            <div className="xl:col-span-1 space-y-3 sm:space-y-6 lg:space-y-8 sticky top-[88px]">
              {/* Order Return Card */}
              <OrderReturnCard order={order} />

              {/* Rental Actions */}
              <OrderRentalActions order={order} updateOrderStatus={updateOrderStatus} />

              {/* Order Shipping / Customer Profile */}
              <OrderShipping order={order} />

              {/* Financials & Settlement */}
              <OrderSettlement
                order={order}
                updateOrderStatus={updateOrderStatus}
                settlementCharges={settlementCharges}
                setSettlementCharges={setSettlementCharges}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showStickerModal && (
          <>
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
              className="invoice-modal-container fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-3xl mx-auto w-full max-w-3xl max-h-[92vh] bg-[var(--admin-surface)] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[101] overflow-y-auto custom-scrollbar print:static print:translate-x-0 print:translate-y-0 print:h-auto print:max-w-none print:shadow-none print:bg-white"
            >
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
                  body * { visibility: hidden !important; }
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
                  .print-invoice-area, .print-invoice-area * { visibility: visible !important; }
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
                  .no-print, .no-print * { display: none !important; }
                `}
              </style>
              <InvoiceTemplate order={order} onClose={() => setShowStickerModal(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
