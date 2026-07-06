import React from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';
import { MandalaElement } from '../components/ui/MandalaElement';
import { OrderTrackingSkeleton } from '../components/ui/Skeleton';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { TrackingTimeline } from '../components/tracking/TrackingTimeline';
import { TrackingCourierDetails } from '../components/tracking/TrackingCourierDetails';
import { TrackingOperatorPanel } from '../components/tracking/TrackingOperatorPanel';

const statusColors = {
  Pending: 'text-amber-600 bg-amber-50 border-amber-200',
  Confirmed: 'text-blue-600 bg-blue-50 border-blue-200',
  Packed: 'text-purple-600 bg-purple-50 border-purple-200',
  'Ready to Ship': 'text-indigo-600 bg-indigo-50 border-indigo-200',
  Shipped: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  'Out for Delivery': 'text-teal-600 bg-teal-50 border-teal-200',
  Delivered: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Cancelled: 'text-red-600 bg-red-50 border-red-200',
  Returned: 'text-orange-600 bg-orange-50 border-orange-200',
  Refunded: 'text-gray-600 bg-gray-50 border-gray-200',
};

export function OrderTrackingPublic() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get('token') || '';

  const {
    order,
    loading,
    error,
    showOperatorPanel,
    setShowOperatorPanel,
    operatorPin,
    setOperatorPin,
    isPinVerified,
    setIsPinVerified,
    updatingStatus,
    operatorNote,
    setOperatorNote,
    verifyCourierPin,
    handleStatusUpdate,
  } = useOrderTracking({ orderId, trackingToken });

  if (loading) {
    return <OrderTrackingSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-surface-bright flex flex-col items-center justify-center p-6 text-center">
        <SEO title="Tracking Error | Siri Arts & Crafts" />
        <span className="material-symbols-outlined text-[64px] text-red-400 mb-4 animate-bounce">
          local_shipping
        </span>
        <h2 className="font-body text-xl font-bold text-on-surface mb-2">
          Tracking Record Unreachable
        </h2>
        <p className="text-xs text-secondary max-w-sm mb-6 leading-relaxed">
          {error || 'We could not fetch tracking details for this dispatch token.'}
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

  return (
    <div className="min-h-screen bg-surface-bright py-12 px-4 sm:px-6 relative overflow-hidden">
      <SEO
        title={`Track Dispatch #${order._id.substring(0, 8).toUpperCase()} | Siri Arts & Crafts`}
      />

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
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 lg:p-8 shadow-xs text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
            <span className="material-symbols-outlined text-xs">local_shipping</span>
            <span>{order.courierPartner || 'Delhivery Logistics'} Feed</span>
          </div>

          <h2 className="font-body text-2xl font-bold text-on-surface mb-2">
            Live Dispatch Tracking
          </h2>
          <p className="text-xs text-secondary leading-relaxed max-w-md mx-auto">
            Order Reference: <strong className="text-on-surface font-mono">{order._id}</strong>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-dashed border-outline-variant/30 text-left text-[11px]">
            <div>
              <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">
                AWB Tracking No
              </span>
              <strong className="text-on-surface font-mono text-xs">
                {order.trackingNumber ||
                  `SR-${order._id.substring(order._id.length - 8).toUpperCase()}-IN`}
              </strong>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">
                Date Dispatched
              </span>
              <strong className="text-on-surface">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </strong>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">
                Payment Method
              </span>
              <strong className="text-on-surface font-bold uppercase">
                {order.paymentMethod?.includes('COD') ? 'Cash on Delivery' : 'Prepaid (Online)'}
              </strong>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-secondary tracking-widest block mb-0.5">
                Current Status
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${statusColors[order.orderStatus] || 'bg-surface'}`}
              >
                {order.orderStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Timeline Visualization */}
        <TrackingTimeline orderStatus={order.orderStatus} />

        {/* Detailed Transit History Logs */}
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 lg:p-8 shadow-xs">
          <h2 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">history</span>
            <span>Detailed Activity Log</span>
          </h2>

          <div className="space-y-4">
            {order.statusHistory && order.statusHistory.length > 0 ? (
              <div className="relative pl-6 border-l border-outline-variant/30 space-y-6 text-[12px]">
                {order.statusHistory
                  .slice()
                  .reverse()
                  .map((history, i) => (
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
                          {new Date(history.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
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
        <TrackingCourierDetails order={order} />

        {/* Courier Scanning desk portal (Operator Section) */}
        <TrackingOperatorPanel
          showOperatorPanel={showOperatorPanel}
          setShowOperatorPanel={setShowOperatorPanel}
          isPinVerified={isPinVerified}
          setIsPinVerified={setIsPinVerified}
          operatorPin={operatorPin}
          setOperatorPin={setOperatorPin}
          operatorNote={operatorNote}
          setOperatorNote={setOperatorNote}
          verifyCourierPin={verifyCourierPin}
          handleStatusUpdate={handleStatusUpdate}
          updatingStatus={updatingStatus}
        />

        {/* Footer info */}
        <div className="text-center text-[10px] text-secondary font-medium tracking-wide">
          SIRI ARTS & CRAFTS • ATELIER DELIVERIES • NEED HELP? CALL +91 99999 99999
        </div>
      </div>
    </div>
  );
}
