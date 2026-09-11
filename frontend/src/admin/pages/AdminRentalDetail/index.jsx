import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { stagger, AdminRentalDetailSkeleton } from '../../components/AdminUIKit';
import { InvoiceTemplate } from '../../../components/ui';
import { RentalHeader } from './RentalHeader';
import { RentalProduct } from './RentalProduct';
import { RentalFinancials } from './RentalFinancials';
import { RentalTimeline } from './RentalTimeline';
import { RentalCustomerAndProof } from './RentalCustomerAndProof';
import rentalService from '../../../services/api/rentalService';
import toast from 'react-hot-toast';

export function AdminRentalDetail() {
  const { rentalId } = useParams();
  const navigate = useNavigate();
  const [rental, setRental] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const fetchRentalDetail = React.useCallback(async () => {
    try {
      const data = await rentalService.adminGetDetail(rentalId);
      setRental(data.data || data.rental || data);
    } catch (error) {
      toast.error('Failed to load rental details');
      navigate('/admin/rentals');
    } finally {
      setDataLoading(false);
    }
  }, [rentalId, navigate]);

  useEffect(() => {
    if (rentalId) {
      fetchRentalDetail();
    }
  }, [rentalId, fetchRentalDetail]);

  if (dataLoading) {
    return <AdminRentalDetailSkeleton />;
  }

  if (!rental) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-[48px] text-[var(--admin-text-tertiary)] mb-4">
          receipt_long
        </span>
        <p className="text-[16px] font-bold text-[var(--admin-text-primary)] mb-4">
          Rental not found
        </p>
        <button
          onClick={() => navigate('/admin/rentals')}
          className="admin-btn h-10 px-6 !rounded-[4px]"
        >
          Back to Rentals
        </button>
      </div>
    );
  }

  // Derive the next valid action from the backend status
  const getNextValidAction = () => {
    switch (rental.status) {
      case 'pending':
        return { label: 'Confirm Rental', action: 'confirm' };
      case 'confirmed':
        return { label: 'Mark as Active', action: 'activate' };
      case 'active_rental':
        return { label: 'Mark as Returned', action: 'return' };
      case 'returned':
        if (rental.depositStatus === 'held')
          return { label: 'Refund Security Deposit', action: 'refund_deposit' };
        if (rental.depositStatus === 'processing') return null;
        return { label: 'Complete Rental', action: 'complete' };
      default:
        return null;
    }
  };

  const nextAction = getNextValidAction();

  const getRentalOrderForInvoice = (r) => {
    if (!r) return null;
    return {
      ...r,
      _id: r._id,
      id: r._id,
      orderId: r.rentalOrderId || r._id,
      rentalOrderId: r.rentalOrderId || r._id,
      orderType: 'rental',
      isPureRental: true,
      rentalStartDate: r.rentalStartDate,
      rentalEndDate: r.rentalEndDate,
      durationDays: r.durationDays,
      securityDeposit: r.securityDeposit || 0,
      rentalCharge: r.rentalCharge || r.totalAmount || 0,
      totalAmount: r.totalAmount || 0,
      total: r.totalAmount || 0,
      paymentMethod: r.paymentMethod || 'Razorpay',
      paymentStatus: r.paymentStatus || 'paid',
      shippingAddress: r.shippingAddress || {
        name: r.userId?.name || r.user?.name || 'Customer',
        phone: r.userId?.phone || r.user?.phone || '',
        address: r.shippingAddress?.address || '',
        city: r.shippingAddress?.city || '',
        state: r.shippingAddress?.state || '',
        pincode: r.shippingAddress?.pincode || '',
      },
      items: (() => {
        const qty = Number(r.quantity || 1);
        const unitRentalPrice = Number(
          r.rentalRate?.rentalPrice ??
            r.rentalRate?.rate ??
            (qty > 0 && r.rentalCharge
              ? Math.round((r.rentalCharge / qty) * 100) / 100
              : r.rentalCharge || 0),
        );
        return Array.isArray(r.items) && r.items.length > 0
          ? r.items.map((it) => ({
              ...it,
              price: it.rentalPrice || it.price || unitRentalPrice,
              rentalPrice: it.rentalPrice || unitRentalPrice,
              isRental: true,
              type: 'rental',
            }))
          : [
              {
                title: r.productTitle || 'Rented Item',
                name: r.productTitle || 'Rented Item',
                price: unitRentalPrice,
                rentalPrice: unitRentalPrice,
                quantity: qty,
                image: r.productImage || r.productImages?.[0] || r.productThumbnail || '',
                deposit: r.securityDeposit || 0,
                durationDays: r.durationDays,
                isRental: true,
                type: 'rental',
              },
            ];
      })(),
    };
  };

  const invoiceRentalOrder = getRentalOrderForInvoice(rental);

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page { size: A4 portrait; margin: 15mm; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white; }
          
          body * {
            visibility: hidden !important;
          }
          .print-only, .print-only * {
            visibility: visible !important;
          }
          
          .print-only {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          .no-print { display: none !important; }
        `}
      </style>

      {/* PRINT-ONLY INVOICE LAYOUT */}
      <div className="hidden print-only bg-[var(--admin-surface)] text-black text-[11px] p-0 w-full h-full relative">
        <InvoiceTemplate order={invoiceRentalOrder} isAdmin={true} />
      </div>

      {/* NORMAL SCREEN LAYOUT */}
      <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6 no-print">
        <RentalHeader
          rental={rental}
          navigate={navigate}
          onPrintInvoice={() => {
            setTimeout(() => window.print(), 100);
          }}
          onViewInvoice={() => setShowInvoiceModal(true)}
        />

        <div className="max-w-[1400px] mx-auto w-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-6 lg:gap-8 items-start">
            {/* LEFT COLUMN: Lifecycle Progression & Rented Items (2/3 Width) */}
            <div className="xl:col-span-2 flex flex-col gap-3 sm:gap-6 lg:gap-8">
              <RentalTimeline
                rental={rental}
                fetchRentalDetail={fetchRentalDetail}
                nextAction={nextAction}
              />
              <RentalProduct rental={rental} />
            </div>

            {/* RIGHT COLUMN: Customer Profile, Proof Documents & Financial Settlement (1/3 Width Sticky Sidebar) */}
            <div className="xl:col-span-1 flex flex-col gap-3 sm:gap-6 lg:gap-8 sticky top-[88px]">
              <RentalCustomerAndProof rental={rental} />
              <RentalFinancials rental={rental} fetchRentalDetail={fetchRentalDetail} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* View Invoice Modal Container */}
      {showInvoiceModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            <div
              className={`admin-section-root ${typeof document !== 'undefined' && (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')) ? 'dark' : ''} font-sans`}
              style={{
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              }}
            >
              {/* Full-screen Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowInvoiceModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] no-print cursor-pointer"
              />
              {/* Modal Container */}
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="invoice-modal-container fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-[6px] mx-auto w-full max-w-[580px] max-h-[92vh] bg-white dark:bg-[#1f1e1b] rounded-t-[6px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-[#e8e4d9] dark:border-white/10 z-[101] overflow-y-auto custom-scrollbar pt-2.5 pb-2 px-3 sm:pt-3 sm:pb-2.5 sm:px-4 print:static print:translate-x-0 print:translate-y-0 print:h-auto print:max-w-none print:shadow-none print:bg-white print:p-0 print:border-none font-sans"
                style={{
                  backgroundColor: 'var(--admin-surface, #ffffff)',
                  borderColor: 'var(--admin-border, #e8e4d9)',
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              >
                <div className="relative">
                  {rental && (
                    <InvoiceTemplate
                      order={getRentalOrderForInvoice(rental)}
                      businessDetails={{
                        name: 'Siri Arts & Crafts',
                        email: 'support@siriartsandcrafts.com',
                        phone: '+91 94939 12345',
                        address: 'Main Road, Jubilee Hills, Hyderabad, TS 500033',
                        gstin: '36ABCDE1234F1Z5',
                      }}
                      onClose={() => setShowInvoiceModal(false)}
                      isAdmin={true}
                    />
                  )}
                </div>
              </motion.div>
            </div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
export default AdminRentalDetail;
