import { ArrowLeft, Truck } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { returnService } from '../../services/api/returnService';
import toast from 'react-hot-toast';
import { OptimizedImage } from '../../components/ui';
import { ReturnExchangeSkeleton } from '../../components/ui/skeletons/PageSkeletons';
import { SEO } from '../../components/seo/SEO';
import ReturnTimeline from './components/ReturnTimeline';
import RefundBreakdownCard from './components/RefundBreakdownCard';
import RefundDestinationModal from './components/RefundDestinationModal';
import { useUserSocket } from '../../context/UserSocketProvider';

export const ReturnDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [returnRequest, setReturnRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

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
      toast.error('Failed to load return details');
      navigate('/dashboard/returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      // Only refetch if the update is for this return
      if (
        data?.returnId === returnRequest?.returnId ||
        data?.orderId === returnRequest?.orderId?._id
      ) {
        fetchDetails();
      } else if (!data) {
        fetchDetails();
      }
    };

    socket.on('return:status_updated', handleUpdate);

    return () => {
      socket.off('return:status_updated', handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, returnRequest]);

  if (loading) return <ReturnExchangeSkeleton />;
  if (!returnRequest) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SEO title={`Return Details ${returnRequest.returnId} | EventDecor`} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/dashboard/returns')}
            className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="text-[16px]" strokeWidth={1.5} />
            Back to Returns
          </button>
          <h1 className="text-2xl font-bold text-on-surface flex items-center gap-3">
            Return {returnRequest.returnId}
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                ['completed', 'approved', 'refund_triggered'].includes(returnRequest.status)
                  ? 'bg-success/10 text-success'
                  : ['rejected', 'cancelled'].includes(returnRequest.status)
                    ? 'bg-error/10 text-error'
                    : 'bg-warning/10 text-warning'
              }`}
            >
              {returnRequest.status.replace(/_/g, ' ')}
            </span>
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Order: #{returnRequest.orderId?._id || returnRequest.orderId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-on-surface mb-6">Status Tracker</h2>
            <ReturnTimeline
              stages={[
                'submitted',
                'approved',
                'pickup_assigned',
                'reached_warehouse',
                'inspection_passed',
                'refund_triggered',
                'completed',
              ]}
              currentStatus={returnRequest.status}
              timeline={returnRequest.timeline}
            />
          </div>

          <div className="bg-surface rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-outline-variant/20 bg-surface-variant/30 flex justify-between items-center">
              <h2 className="text-lg font-bold text-on-surface">Items in Return</h2>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {returnRequest.items.map((item, idx) => (
                <div key={idx} className="p-5 flex gap-5">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-container shrink-0 border border-outline-variant/20">
                    <OptimizedImage
                      src={item.imageSrc || item.productId?.imageSrc}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-surface">
                      {item.title || item.productId?.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      Reason: <span className="text-on-surface font-medium">{item.reason}</span>
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      Qty Returned:{' '}
                      <span className="text-on-surface font-medium">{item.returnQuantity}</span>
                    </p>
                    {item.description && (
                      <div className="mt-3 p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/30 text-sm text-on-surface-variant">
                        "{item.description}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <RefundBreakdownCard
            breakdown={returnRequest.refundBreakdown}
            method={returnRequest.refundMethod}
            status={
              returnRequest.status === 'completed'
                ? 'completed'
                : returnRequest.status === 'refund_triggered'
                  ? 'processing'
                  : 'pending'
            }
          />

          {returnRequest.status === 'inspection_passed' &&
            returnRequest.returnType !== 'exchange' && (
              <div className="bg-primary/10 rounded-2xl border border-primary/20 p-5 shadow-sm text-center">
                <h3 className="font-bold text-primary mb-2">Refund Ready</h3>
                <p className="text-sm text-on-surface-variant mb-4">
                  Your return has passed inspection. Please choose where you'd like your refund to
                  go.
                </p>
                <button
                  onClick={() => setIsRefundModalOpen(true)}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-on-primary font-bold uppercase tracking-widest text-xs rounded-xl shadow-sm transition-all"
                >
                  Claim Refund
                </button>
              </div>
            )}

          <div className="bg-surface rounded-2xl border border-outline-variant/40 p-5 shadow-sm">
            <h3 className="font-semibold text-on-surface mb-4 flex items-center gap-2">
              <Truck className="text-[18px]" strokeWidth={1.5} />
              Pickup Details
            </h3>
            {returnRequest.pickup ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="block text-on-surface-variant mb-0.5">Address</span>
                  <span className="font-medium text-on-surface">
                    {returnRequest.pickup.address?.firstName}{' '}
                    {returnRequest.pickup.address?.lastName}
                    <br />
                    {returnRequest.pickup.address?.addressLine1},{' '}
                    {returnRequest.pickup.address?.city} {returnRequest.pickup.address?.pinCode}
                  </span>
                </div>
                {returnRequest.pickup.trackingId && (
                  <div>
                    <span className="block text-on-surface-variant mb-0.5">Tracking ID</span>
                    <span className="font-medium text-on-surface">
                      {returnRequest.pickup.trackingId}
                    </span>
                  </div>
                )}
                {returnRequest.pickup.scheduledDate && (
                  <div>
                    <span className="block text-on-surface-variant mb-0.5">Scheduled Date</span>
                    <span className="font-medium text-on-surface">
                      {new Date(returnRequest.pickup.scheduledDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">
                Pickup will be scheduled once approved.
              </p>
            )}
          </div>
        </div>
      </div>

      <RefundDestinationModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        returnRequest={returnRequest}
        onComplete={(updatedReq) => {
          setReturnRequest(updatedReq);
          setIsRefundModalOpen(false);
        }}
      />
    </div>
  );
};

export default ReturnDetailPage;
