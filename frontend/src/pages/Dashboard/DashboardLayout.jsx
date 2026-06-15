import React from 'react';
import { useDashboard } from '../../context/DashboardContext';

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
      className="bg-surface-container-low min-h-screen pt-24 pb-32 font-body text-on-surface modern-sans-headings"
    >
      <SEO
        title="Your Premium Studio Account"
        description="Manage your Siri Arts & Crafts profile parameters, live orders, dynamic shipping addresses, wishlist collections, and personalized newsletter configurations."
      />

      <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop">
        {/* HEADER */}
        <DashboardHeader />

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR NAVIGATION PANEL */}
          <Sidebar />

          {/* MAIN DYNAMIC CONTENT PORTAL PANELS */}
          <div
            className={`col-span-1 md:col-span-4 lg:col-span-9 space-y-4 ${mobileShowContent ? 'block' : 'hidden md:block'}`}
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm"
            onClick={() => setSelectedInvoiceOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl"
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
