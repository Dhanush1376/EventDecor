import { ArrowLeft, Truck, Package, ArrowRight, AlertCircle } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto px-4 py-8 text-left">
      <SEO
        title={`${isExchange ? 'Exchange' : 'Return'} ${returnRequest.returnId} | Siri Arts & Crafts`}
        noindex
      />

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/dashboard/returns')}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Returns & Exchanges
          </button>
          <h1 className="text-2xl font-display font-medium text-stone-900 flex items-center gap-3">
            {isExchange ? 'Exchange' : 'Return'} #{returnRequest.returnId}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Associated with Order #{orderId ? orderId.toString().slice(-8) : 'N/A'}
          </p>
        </div>

        {orderId && (
          <Link
            to="/dashboard/orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            View Order
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Timeline & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Tracker */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-900 mb-6">
              Status Tracker
            </h2>
            <ReturnTimeline
              currentStatus={returnRequest.status}
              timeline={returnRequest.timeline}
              returnType={returnRequest.returnType}
              rejectionReason={returnRequest.approvalNotes}
            />
          </div>

          {/* Original Items */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                {isExchange ? 'Item to Return for Exchange' : 'Items Being Returned'}
              </h2>
            </div>
            <div className="divide-y divide-stone-100">
              {returnRequest.items.map((item, idx) => (
                <div key={idx} className="p-5 flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                    <OptimizedImage
                      src={item.imageSrc || item.productId?.imageSrc}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-stone-900 truncate">
                      {item.title || item.productId?.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-stone-500">
                      <span>
                        Reason: <strong className="text-stone-800">{item.reason}</strong>
                      </span>
                      <span>
                        Qty: <strong className="text-stone-800">{item.returnQuantity}</strong>
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-2 text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
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
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-5 border-b border-stone-100 bg-emerald-50/50 flex justify-between items-center">
                <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-700" />
                  Replacement Item Chosen
                </h2>
              </div>
              <div className="p-5 flex gap-4 items-start">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                  <OptimizedImage
                    src={
                      exchangeDetails.replacementItem.imageSrc ||
                      exchangeDetails.replacementItem.productId?.imageSrc
                    }
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-stone-900 truncate">
                    {exchangeDetails.replacementItem.title ||
                      exchangeDetails.replacementItem.productId?.title}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-stone-500">
                    <span>
                      Status:{' '}
                      <strong className="text-stone-800 capitalize">
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
                        <strong className="text-stone-800">
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
          <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-5 text-left space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-stone-700" />
              What Happens Next?
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              {(() => {
                const s = returnRequest.status;
                if (['submitted', 'pending'].includes(s)) {
                  return "We've received your request! Our team will review and approve it shortly. Once approved, reverse pickup will be scheduled.";
                }
                if (['approved', 'return_courier_assigned'].includes(s)) {
                  return 'Your request has been approved! Our delivery partner will visit your address to collect the packaged item.';
                }
                if (['return_picked_up', 'return_in_transit'].includes(s)) {
                  return 'Your item has been picked up and is currently in transit to our verification facility.';
                }
                if (['return_received', 'inspection_started'].includes(s)) {
                  return 'Your item has arrived at our facility. Our quality team is verifying the contents.';
                }
                if (s === 'inspection_completed') {
                  return isExchange
                    ? 'Quality check passed! Your replacement is ready to be dispatched.'
                    : 'Quality check passed! Your refund is now being processed.';
                }
                if (['refund_initiated', 'refund_completed', 'completed'].includes(s)) {
                  return isExchange
                    ? 'Your exchange journey is complete! Enjoy your new piece.'
                    : 'Your refund has been issued to your selected payment destination.';
                }
                if (s === 'rejected') {
                  return 'This request was declined according to policy. Please contact support if you need assistance.';
                }
                if (s === 'cancelled') {
                  return 'This request was cancelled.';
                }
                return 'Our team is actively processing your request.';
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
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-stone-600" />
              Pickup Information
            </h3>
            {returnRequest.pickup?.trackingId && (
              <div className="mb-3 pb-3 border-b border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">Pickup Tracking:</span>
                <span className="font-mono font-bold text-stone-800">
                  {returnRequest.pickup.trackingId}
                </span>
              </div>
            )}
            {returnRequest.pickup?.address ? (
              <div className="space-y-2 text-xs text-stone-600">
                <p className="font-semibold text-stone-900">
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
                <p className="pt-2 text-stone-500 border-t border-stone-100">
                  Phone:{' '}
                  <strong className="text-stone-800">{returnRequest.pickup.address.phone}</strong>
                </p>
              </div>
            ) : (
              <p className="text-xs text-stone-500">
                Pickup address from original delivery will be used.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnDetailPage;
