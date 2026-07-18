import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import { SEO } from '../../components/seo/SEO';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { Sidebar } from '../../components/dashboard/Sidebar';
import { AddressModal } from '../../components/dashboard/AddressModal';
import { WriteReviewModal } from '../../components/sections/ProductReviews';
import { Skeleton } from '../../components/ui';

const InvoiceTemplate = React.lazy(() =>
  import('../../components/ui').then((m) => ({ default: m.InvoiceTemplate })),
);

export function DashboardLayout() {
  const {
    mobileShowContent,
    reviewingProduct,
    setReviewingProduct,
    selectedInvoiceOrder,
    setSelectedInvoiceOrder,
    user,
  } = useDashboard();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-surface-container-low min-h-screen pt-20 pb-24 lg:pb-12 font-body text-on-surface modern-sans-headings"
    >
      <SEO
        title="Your Premium Studio Account"
        description="Manage your Siri Arts & Crafts profile parameters, live orders, dynamic shipping addresses, wishlist collections, and personalized newsletter configurations."
      />

      <div className="max-w-max-width mx-auto px-margin-mobile lg:px-margin-desktop">
        {/* HEADER */}
        <DashboardHeader />

        <div className="grid grid-cols-1 lg:grid-cols-6 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR NAVIGATION PANEL */}
          <Sidebar />

          {/* MAIN DYNAMIC CONTENT PORTAL PANELS */}
          <div
            className={`col-span-1 lg:col-span-4 lg:col-span-9 space-y-4 ${mobileShowContent ? 'block' : 'hidden lg:block'}`}
          >
            <Outlet />
          </div>
        </div>
      </div>

      {/* RETAINED MODALS */}
      <AddressModal />

      <AnimatePresence>
        {reviewingProduct && (
          <WriteReviewModal
            productId={reviewingProduct.productId}
            productTitle={reviewingProduct.productTitle}
            onClose={() => setReviewingProduct(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedInvoiceOrder && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md no-print"
              onClick={() => setSelectedInvoiceOrder(null)}
            />
            {/* Modal Container */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              onClick={(e) => e.stopPropagation()}
              className="invoice-modal-container fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:my-auto lg:h-fit lg:rounded-3xl mx-auto w-full max-w-3xl max-h-[92vh] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-[101] overflow-y-auto custom-scrollbar print:static print:translate-x-0 print:translate-y-0 print:h-auto print:max-w-none print:shadow-none print:bg-white"
            >
              <React.Suspense
                fallback={
                  <div className="p-8">
                    <Skeleton className="h-80 w-full rounded-lg" />
                  </div>
                }
              >
                <InvoiceTemplate
                  order={selectedInvoiceOrder}
                  user={user}
                  onClose={() => setSelectedInvoiceOrder(null)}
                />
              </React.Suspense>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
