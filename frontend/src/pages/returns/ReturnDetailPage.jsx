import { ArrowLeft, Truck, Package, ArrowRight, AlertCircle, CornerDownLeft } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { returnService } from '../../services/api/returnService';
import toast from 'react-hot-toast';
import { OptimizedImage } from '../../components/ui';
import { ReturnExchangeSkeleton } from '../../components/ui/skeletons/PageSkeletons';
import { SEO } from '../../components/seo/SEO';
import ReturnTimeline from './components/ReturnTimeline';
import RefundBreakdownCard from './components/RefundBreakdownCard';
import { useUserSocket } from '../../context/UserSocketProvider';

export const ReturnDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [returnRequest, setReturnRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const socket = useUserSocket();

  const fetchDetails = async () => {
    try {
      const res = await returnService.getReturnById(id);
      if (res.data.success) {
        setReturnRequest(res.data.data);
      } else {
        toast.error('Return not found');
        navigate('/dashboard/returns');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load return details');
      navigate('/dashboard/returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      if (
        data?.returnId === returnRequest?.returnId ||
        data?.orderId === returnRequest?.orderId?._id ||
        !data
      ) {
        fetchDetails();
      }
    };

    socket.on('return:status_updated', handleUpdate);

    return () => {
      socket.off('return:status_updated', handleUpdate);
    };
  }, [socket, returnRequest]);

  if (loading) return <ReturnExchangeSkeleton />;
  if (!returnRequest) return null;

  const isExchange = returnRequest.returnType === 'exchange';
  const orderId = returnRequest.orderId?._id || returnRequest.orderId;
  const exchangeDetails = returnRequest.exchangeDetails;

  return (
    <div className="space-y-6 text-left font-body text-on-surface text-[11px]">
      <SEO
        title={`${isExchange ? 'Exchange' : 'Return'} #${returnRequest.returnId} | Siri Arts & Crafts`}
        noindex
      />

      {/* Top Header Card */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-outline-variant/20">
          <Link
            to="/dashboard/returns"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-container-low text-secondary hover:text-on-surface text-[9.5px] font-bold uppercase tracking-widest border border-outline-variant/30 shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Returns
          </Link>
          {orderId && (
            <Link
              to="/dashboard/orders"
              className="inline-flex items-center gap-1 text-[9.5px] font-mono tracking-wider px-2.5 py-1 rounded-md bg-surface-container/60 border border-outline-variant/25 text-primary hover:underline"
            >
              ORDER #{orderId.toString().slice(-8).toUpperCase()}
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </Link>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <CornerDownLeft className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-medium text-[17px] sm:text-[20px] text-on-surface leading-snug">
              {isExchange ? 'Exchange' : 'Return'} #{returnRequest.returnId}
            </h1>
            <p className="text-[11px] sm:text-xs text-secondary mt-0.5 leading-relaxed">
              Tracking your reverse fulfillment journey and refund settlement in real time.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Timeline & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Tracker Card */}
          <div className="bg-surface-bright border border-outline-variant/40 rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="pb-4 mb-4 border-b border-outline-variant/15 flex items-center justify-between">
              <h2 className="text-[9.5px] font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">route</span>
                Return Journey Tracker
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                {returnRequest.status?.replace(/_/g, ' ')}
              </span>
            </div>
            <ReturnTimeline
              currentStatus={returnRequest.status}
              timeline={returnRequest.timeline}
              returnType={returnRequest.returnType}
              rejectionReason={returnRequest.approvalNotes}
            />
          </div>

          {/* Original Returning Items Card */}
          <div className="bg-surface-bright border border-outline-variant/40 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-outline-variant/15 flex justify-between items-center bg-surface-container-low/40">
              <h2 className="text-[9.5px] font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                {isExchange ? 'Item to Return for Exchange' : 'Items Being Returned'}
              </h2>
              <span className="text-[9px] text-secondary font-mono">
                {returnRequest.items?.length || 0} piece(s)
              </span>
            </div>
            <div className="divide-y divide-outline-variant/15">
              {returnRequest.items.map((item, idx) => (
                <div key={idx} className="p-4 sm:p-5 flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container shrink-0 border border-outline-variant/20 shadow-2xs">
                    <OptimizedImage
                      src={item.imageSrc || item.productId?.imageSrc}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-on-surface truncate">
                      {item.title || item.productId?.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-secondary">
                      <span>
                        Reason: <strong className="text-on-surface">{item.reason}</strong>
                      </span>
                      <span>
                        Qty: <strong className="text-on-surface">{item.returnQuantity}</strong>
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-2 text-[11px] text-secondary bg-surface-container-low/60 p-2.5 rounded-lg border border-outline-variant/20 leading-relaxed">
                        "{item.description}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Replacement Item (if Exchange) */}
          {isExchange && exchangeDetails?.replacementItem && (
            <div className="bg-surface-bright border border-outline-variant/40 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 sm:p-5 border-b border-outline-variant/15 flex justify-between items-center bg-emerald-500/10">
                <h2 className="text-[9.5px] font-bold uppercase tracking-widest text-emerald-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-700" />
                  Replacement Item Chosen
                </h2>
              </div>
              <div className="p-4 sm:p-5 flex gap-4 items-start">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container shrink-0 border border-outline-variant/20 shadow-2xs">
                  <OptimizedImage
                    src={
                      exchangeDetails.replacementItem.imageSrc ||
                      exchangeDetails.replacementItem.productId?.imageSrc
                    }
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-xs sm:text-sm text-on-surface truncate">
                    {exchangeDetails.replacementItem.title ||
                      exchangeDetails.replacementItem.productId?.title}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-secondary">
                    <span>
                      Status:{' '}
                      <strong className="text-on-surface capitalize">
                        {(() => {
                          const s = exchangeDetails.replacementStatus;
                          if (
                            ['completed', 'refund_completed'].includes(returnRequest?.status) ||
                            s === 'delivered'
                          )
                            return 'Delivered';
                          if (s === 'shipped') return 'Dispatched';
                          if (
                            s === 'reserved' ||
                            [
                              'approved',
                              'return_picked_up',
                              'return_received',
                              'inspection_completed',
                            ].includes(returnRequest?.status)
                          )
                            return 'Stock Reserved';
                          if (s === 'pending_stock') return 'Under Review';
                          return s ? s.replace(/_/g, ' ') : 'Under Review';
                        })()}
                      </strong>
                    </span>
                    {exchangeDetails.priceDifference > 0 && (
                      <span>
                        Price Diff:{' '}
                        <strong className="text-primary font-bold">
                          ₹{exchangeDetails.priceDifference} (
                          {exchangeDetails.differenceAction === 'collect_payment'
                            ? 'Payable'
                            : 'Refundable'}
                          )
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Guidance, Refund & Pickup Details */}
        <div className="space-y-6">
          {/* Helpful Next Steps Card */}
          <div className="bg-surface-bright border border-outline-variant/40 rounded-xl p-5 shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center gap-1.5 pb-2 border-b border-outline-variant/15 text-[9.5px] font-bold uppercase tracking-widest text-on-surface">
              <AlertCircle className="w-4 h-4 text-primary" />
              Next Steps in Fulfillment
            </div>
            <p className="text-[11px] text-secondary leading-relaxed pt-1">
              {(() => {
                const s = returnRequest.status;
                if (['submitted', 'pending'].includes(s)) {
                  return "We've received your request! Our concierge team will review and approve it shortly. Once approved, reverse courier pickup will be scheduled automatically.";
                }
                if (['approved', 'return_courier_assigned'].includes(s)) {
                  return 'Your return has been approved! Our logistics partner will arrive at your address to collect the packaged item.';
                }
                if (['return_picked_up', 'return_in_transit'].includes(s)) {
                  return 'Your item has been picked up and is safely in transit to our studio verification facility.';
                }
                if (['return_received', 'inspection_started'].includes(s)) {
                  return 'Your parcel has arrived at our workshop. Our artisan quality team is verifying the condition and packaging.';
                }
                if (s === 'inspection_completed') {
                  return isExchange
                    ? 'Quality inspection passed! Your replacement piece is scheduled for dispatch.'
                    : 'Quality inspection passed! Your refund is now being disbursed.';
                }
                if (['refund_initiated', 'refund_completed', 'completed'].includes(s)) {
                  return isExchange
                    ? 'Your exchange cycle is successfully finalized! Enjoy your artisanal creation.'
                    : 'Your refund has been disbursed to your selected payment destination.';
                }
                if (s === 'rejected') {
                  return 'This request was declined according to policy. Please contact customer care if you have any questions.';
                }
                if (s === 'cancelled') {
                  return 'This return request was cancelled by the customer.';
                }
                return 'Our studio team is actively processing your request.';
              })()}
            </p>
          </div>

          {/* Refund breakdown if return or if exchange has a refund */}
          {!isExchange && returnRequest.refundBreakdown && (
            <RefundBreakdownCard
              breakdown={returnRequest.refundBreakdown}
              method={returnRequest.refundMethod}
              status={
                returnRequest.status === 'completed' || returnRequest.status === 'refund_completed'
                  ? 'completed'
                  : returnRequest.status === 'refund_initiated'
                    ? 'processing'
                    : 'pending'
              }
            />
          )}

          {/* Pickup Details Card */}
          <div className="bg-surface-bright border border-outline-variant/40 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-[9.5px] font-bold uppercase tracking-widest text-on-surface flex items-center gap-2 pb-2 border-b border-outline-variant/15">
              <Truck className="w-4 h-4 text-primary" />
              Pickup Information
            </h3>
            {returnRequest.pickup?.trackingId && (
              <div className="flex items-center justify-between text-[11px] pb-2 border-b border-outline-variant/15">
                <span className="text-secondary">Tracking ID:</span>
                <span className="font-mono font-bold text-on-surface">
                  {returnRequest.pickup.trackingId}
                </span>
              </div>
            )}
            {returnRequest.pickup?.address ? (
              <div className="space-y-1 text-xs text-secondary">
                <p className="font-bold text-on-surface text-[12px]">
                  {returnRequest.pickup.address.firstName || returnRequest.pickup.address.name}{' '}
                  {returnRequest.pickup.address.lastName || ''}
                </p>
                <p>
                  {returnRequest.pickup.address.street ||
                    returnRequest.pickup.address.address ||
                    returnRequest.pickup.address.addressLine1}
                </p>
                <p>
                  {returnRequest.pickup.address.city}, {returnRequest.pickup.address.state} -{' '}
                  {returnRequest.pickup.address.zipCode ||
                    returnRequest.pickup.address.pincode ||
                    returnRequest.pickup.address.postalCode}
                </p>
                <p className="pt-2 text-[10px] text-secondary/80 border-t border-outline-variant/15">
                  Contact:{' '}
                  <strong className="text-on-surface">{returnRequest.pickup.address.phone}</strong>
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-secondary">
                Original delivery destination will be used for reverse courier dispatch.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnDetailPage;
