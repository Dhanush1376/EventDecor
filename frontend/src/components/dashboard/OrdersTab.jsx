import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Barcode from 'react-barcode';
import { OptimizedImage } from '../ui/OptimizedImage';

export default function OrdersTab({
  orderFilter,
  setOrderFilter,
  isOrdersLoading,
  filteredOrders,
  setReviewingProduct,
  downloadInvoice,
}) {
  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/150?text=No+Image';
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-3.5 flex items-center gap-2 overflow-x-auto shadow-xs">
        <span className="text-[10px] uppercase font-bold text-secondary tracking-widest mr-2 flex-shrink-0">
          Sort Parameters:
        </span>
        {[
          { id: 'ALL', label: 'Show All Orders' },
          { id: 'ON_THE_WAY', label: 'In Transit' },
          { id: 'DELIVERED', label: 'Delivered Masterpieces' },
        ].map((f) => (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            key={f.id}
            onClick={() => setOrderFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-[9px] uppercase tracking-wider font-bold transition-all flex-shrink-0 cursor-pointer ${
              orderFilter === f.id
                ? 'bg-primary text-surface shadow-xs'
                : 'bg-surface-container text-secondary hover:bg-outline-variant/20'
            }`}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {isOrdersLoading ? (
        <div className="space-y-4">
          <div className="h-32 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
          <div className="h-32 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
        </div>
      ) : (
        <motion.div layout className="space-y-4">
          <AnimatePresence>
            {filteredOrders.map((order, idx) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                key={order._id || idx}
                className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs hover:border-outline-variant transition-colors"
              >
                <div className="flex flex-col sm:flex-row justify-between gap-4 pb-3 border-b border-surface-container">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">
                      Unique Order ID
                    </span>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-mono text-on-surface truncate max-w-[130px] sm:max-w-none">
                        {order._id}
                      </strong>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(order._id);
                          toast.success('Order ID copied!');
                        }}
                        className="material-symbols-outlined text-[13px] text-secondary hover:text-primary transition-colors cursor-pointer"
                        title="Copy ID Key"
                      >
                        content_copy
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                        order.orderStatus === 'delivered'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                      }`}
                    >
                      {order.orderStatus}
                    </span>

                    <span className="text-[9px] bg-surface-container px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-outline-variant/10">
                      {order.paymentStatus || 'Paid'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 space-y-4">
                  {order.items?.map((item, itemIdx) => {
                    const prodTitle =
                      item.title ||
                      (typeof item.productId === 'object' ? item.productId?.title : null) ||
                      'Artisanal Piece';
                    const prodPrice =
                      item.price ||
                      (typeof item.productId === 'object' ? item.productId?.price : 0) ||
                      0;
                    const prodImage =
                      item.imageSrc ||
                      (typeof item.productId === 'object'
                        ? item.productId?.imageSrc || item.productId?.images?.[0]
                        : null) ||
                      '';
                    const prodVariant = item.variant || 'Default';
                    return (
                      <div
                        key={itemIdx}
                        className="flex gap-4 items-start pb-2 border-b border-dashed border-outline-variant/10 last:border-0 last:pb-0"
                      >
                        <OptimizedImage
                          src={prodImage}
                          alt="Traditional wedding event decoration"
                          className="w-14 h-16 bg-surface-container rounded object-cover flex-shrink-0 border border-outline-variant/20 shadow-2xs"
                        />

                        <div className="flex-1 min-w-0 text-[12px]">
                          <h4 className="font-bold text-on-surface line-clamp-1">{prodTitle}</h4>
                          <span className="text-[11px] text-secondary block mt-0.5">
                            Quantity: {item.quantity || 1} • Unit Price: ₹
                            {prodPrice.toLocaleString()}{' '}
                            {prodVariant !== 'Default' && `• Style: ${prodVariant}`}
                          </span>
                          <strong className="text-xs text-primary block mt-1">
                            ₹{(prodPrice * (item.quantity || 1)).toLocaleString()}
                          </strong>
                          {item.isNonRefundable && (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold bg-[#fffbeb] text-[#d97706] border border-[#fde68a] px-1.5 py-0.5 rounded mt-1.5">
                              <span className="material-symbols-outlined text-[10px]">block</span>
                              Non-Refundable
                            </span>
                          )}
                          {order.orderStatus === 'Delivered' && (
                            <button
                              onClick={() =>
                                setReviewingProduct({
                                  productId: item.productId?._id || item.productId,
                                  productTitle: prodTitle,
                                })
                              }
                              className="mt-2 text-[10px] text-primary hover:text-primary-dark font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                rate_review
                              </span>
                              Write a Review
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Enterprise Logistics Details */}
                {order.trackingNumber && (
                  <div className="mt-3 pt-3 border-t border-dashed border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-surface-container/30 p-3 rounded-lg">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">
                        Tracking AWB
                      </span>
                      <strong className="text-on-surface text-xs font-mono">
                        {order.trackingNumber}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">
                        Courier
                      </span>
                      <strong className="text-primary text-xs">
                        {order.courierPartner || 'Delhivery Logistics'}
                      </strong>
                    </div>
                    {order.barcodeData && (
                      <div className="bg-white px-2 py-1 rounded shadow-sm">
                        <Barcode
                          value={order.barcodeData}
                          height={20}
                          width={1}
                          displayValue={false}
                          background="transparent"
                          margin={0}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-3 mt-3 border-t border-surface-container flex flex-wrap justify-between items-center gap-3 text-[11px]">
                  <p className="text-secondary flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-xs text-green-700">
                      calendar_today
                    </span>
                    Ordered on{' '}
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>

                  <div className="flex items-center gap-4 font-bold uppercase tracking-wider text-[10px]">
                    {order.invoiceNumber ? (
                      <button
                        onClick={() => downloadInvoice(order._id)}
                        className="text-primary hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[13px]">receipt_long</span>
                        <span>Invoice: {order.invoiceNumber}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => downloadInvoice(order._id)}
                        className="text-primary hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[13px]">download</span>
                        <span>Get PDF Invoice</span>
                      </button>
                    )}
                    <span className="text-outline-variant">|</span>
                    <button
                      onClick={() => {
                        if (order.trackingNumber)
                          window.open(
                            `https://www.delhivery.com/tracking?id=${order.trackingNumber}`,
                            '_blank',
                          );
                        else toast.success('Opening live courier query feed...');
                      }}
                      className="text-secondary hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                      <span>Track Dispatch</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredOrders.length === 0 && !isOrdersLoading && (
            <div className="text-center py-16 bg-surface-bright rounded-lg border border-outline-variant/40 text-[11px] text-secondary italic">
              No order records found matching the status filter.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
