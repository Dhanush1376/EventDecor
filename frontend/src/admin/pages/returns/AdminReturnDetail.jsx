import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmProvider';
import { format } from 'date-fns';
import { m as motion } from 'framer-motion';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import { handleImageError } from '../../../utils/media/imageUtils';
import { PLACEHOLDER_IMAGES } from '../../../constants/placeholderImages';
// Removed lucide-react direct imports in favor of material-symbols-outlined
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonDashboard,
  stagger,
  fadeUp,
} from '../../components/AdminUIKit';

const TIMELINE_STAGES = [
  { id: 'submitted', label: 'Submitted' },
  { id: 'approved', label: 'Approved' },
  { id: 'return_courier_assigned', label: 'Courier Assigned' },
  { id: 'return_picked_up', label: 'Picked Up' },
  { id: 'return_in_transit', label: 'In Transit' },
  { id: 'return_received', label: 'Warehouse Received' },
  { id: 'inspection_started', label: 'Inspection Started' },
  { id: 'inspection_completed', label: 'Inspection Completed' },
  { id: 'refund_initiated', label: 'Refund Initiated' },
  { id: 'refund_completed', label: 'Refund Completed' },
  { id: 'completed', label: 'Completed' },
];

const AdminReturnDetail = () => {
  const { id } = useParams();
  const {
    currentReturn,
    fetchReturnDetails,
    approveReturn,
    rejectReturn,
    transitionStatus,
    triggerRefund,
    addInternalNote,
    loading,
    error,
  } = useReturnManagement();

  const [internalNote, setInternalNote] = useState('');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const confirm = useConfirm();

  useEffect(() => {
    fetchReturnDetails(id);
  }, [id, fetchReturnDetails]);

  const handleApprove = async () => {
    if (
      await confirm({
        title: 'Approve Return',
        message: 'Are you sure you want to approve this return request?',
        type: 'warning',
      })
    ) {
      approveReturn(id);
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }
    rejectReturn(id, { reason: rejectReason });
    setIsRejectOpen(false);
    setRejectReason('');
  };

  const handleTransition = async (nextStatus) => {
    if (
      await confirm({
        title: 'Transition Status',
        message: `Are you sure you want to transition to ${nextStatus}?`,
        type: 'warning',
      })
    ) {
      transitionStatus(id, { nextStatus });
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!internalNote.trim()) return;
    addInternalNote(id, { note: internalNote });
    setInternalNote('');
  };

  if (loading && !currentReturn) {
    return <SkeletonDashboard />;
  }

  if (error || !currentReturn) {
    return (
      <EmptyState
        icon="error_outline"
        title="Failed to load return details"
        description={error || 'Return request not found'}
      />
    );
  }

  const { request, userStats, exchangeDetails } = currentReturn;

  const isExchange = request.returnType === 'exchange';
  const isRequestRejected = request.status === 'rejected';

  // 1. Submitted
  const step1 = { label: 'Submitted', status: 'completed' };

  // 2. Approved
  const isApproved = [
    'approved',
    'return_courier_assigned',
    'return_picked_up',
    'return_in_transit',
    'return_received',
    'inspection_started',
    'inspection_completed',
    'refund_initiated',
    'refund_completed',
    'completed',
  ].includes(request.status);
  const step2 = {
    label: 'Approved',
    status: isRequestRejected ? 'rejected' : isApproved ? 'completed' : 'pending',
    subtext:
      isExchange && isApproved
        ? exchangeDetails?.paymentStatus === 'payment_paid'
          ? 'Payment Received ✓'
          : exchangeDetails?.paymentStatus === 'payment_required'
            ? `₹${exchangeDetails.priceDifference} Required`
            : ''
        : '',
  };

  // 3. Pickup Scheduled
  const isPickupScheduled = [
    'return_courier_assigned',
    'return_picked_up',
    'return_in_transit',
    'return_received',
    'inspection_started',
    'inspection_completed',
    'refund_initiated',
    'refund_completed',
    'completed',
  ].includes(request.status);
  const isPaymentRequired = isExchange && exchangeDetails?.paymentStatus === 'payment_required';
  const step3 = {
    label: 'Pickup',
    status: isRequestRejected ? 'rejected' : isPickupScheduled ? 'completed' : 'pending',
    subtext:
      isPaymentRequired && !isPickupScheduled
        ? 'Locked (Awaiting Payment)'
        : isPickupScheduled
          ? ''
          : 'Awaiting Assignment',
  };

  // 4. Quality Check
  const isQC = [
    'inspection_started',
    'inspection_completed',
    'refund_initiated',
    'refund_completed',
    'completed',
  ].includes(request.status);
  const step4 = {
    label: 'Quality Check',
    status: isRequestRejected ? 'rejected' : isQC ? 'completed' : 'pending',
  };

  // 5. Resolution
  let isResolved = false;
  let resolutionSubtext = '';
  if (isExchange) {
    isResolved =
      ['reserved', 'shipped', 'delivered'].includes(exchangeDetails?.replacementStatus) ||
      request.status === 'completed';
    resolutionSubtext = exchangeDetails?.replacementStatus || 'pending_stock';
  } else {
    isResolved = ['refund_initiated', 'refund_completed', 'completed'].includes(request.status);
    resolutionSubtext = isResolved ? request.status : '';
  }
  const step5 = {
    label: isExchange ? 'Replacement' : 'Refund',
    status: isRequestRejected ? 'rejected' : isResolved ? 'completed' : 'pending',
    subtext: resolutionSubtext.replace(/_/g, ' '),
  };

  const adminTimeline = [step1, step2, step3, step4, step5];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="flex flex-col space-y-6 pb-12"
    >
      <PageHeader
        title={`Return Request ${request.returnId}`}
        subtitle={`Requested on ${request.createdAt ? format(new Date(request.createdAt), 'MMM dd, yyyy HH:mm') : 'Unknown Date'}`}
        backButton={{ path: '/admin/returns/requests', label: 'Back to Requests' }}
        headerAction={
          <div className="flex gap-2">
            {request.status === 'submitted' && (
              <>
                <button
                  className="admin-btn admin-btn-outline !border-[var(--admin-error)] !text-[var(--admin-error)]"
                  onClick={() => setIsRejectOpen(true)}
                >
                  Reject
                </button>
                <button className="admin-btn admin-btn-primary" onClick={handleApprove}>
                  Approve Return
                </button>
              </>
            )}
            {request.status !== 'submitted' &&
              request.status !== 'completed' &&
              request.status !== 'rejected' &&
              request.status !== 'cancelled' && (
                <div className="relative group">
                  <button className="admin-btn admin-btn-primary flex items-center gap-1">
                    Change Status{' '}
                    <span className="material-symbols-outlined text-[16px]">expand_more</span>
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-admin-border rounded shadow-lg hidden group-hover:block z-50">
                    {request.status === 'approved' && (
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-admin-surface-hover text-sm"
                        onClick={() => handleTransition('pickup_assigned')}
                      >
                        Assign Pickup
                      </button>
                    )}
                    {request.status === 'pickup_assigned' && (
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-admin-surface-hover text-sm"
                        onClick={() => handleTransition('pickup_accepted')}
                      >
                        Accept Pickup
                      </button>
                    )}
                    {request.status === 'pickup_accepted' && (
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-admin-surface-hover text-sm"
                        onClick={() => handleTransition('picked_up')}
                      >
                        Mark Picked Up
                      </button>
                    )}
                    {request.status === 'picked_up' && (
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-admin-surface-hover text-sm"
                        onClick={() => handleTransition('reached_warehouse')}
                      >
                        Warehouse Reached
                      </button>
                    )}
                    {request.status === 'reached_warehouse' && (
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-admin-surface-hover text-sm"
                        onClick={() => handleTransition('inspection_started')}
                      >
                        Start Inspection
                      </button>
                    )}
                    {request.status === 'inspection_started' && (
                      <>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-admin-surface-hover text-sm text-green-600"
                          onClick={() => handleTransition('inspection_passed')}
                        >
                          Pass Inspection
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-admin-surface-hover text-sm text-red-600"
                          onClick={() => handleTransition('rejected')}
                        >
                          Fail Inspection (Reject)
                        </button>
                      </>
                    )}
                    {request.status === 'inspection_passed' && (
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-admin-surface-hover text-sm"
                        onClick={() => handleTransition('refund_triggered')}
                      >
                        Trigger Refund
                      </button>
                    )}
                    {request.status === 'refund_triggered' && (
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-admin-surface-hover text-sm text-green-600"
                        onClick={() => handleTransition('completed')}
                      >
                        Mark Completed
                      </button>
                    )}

                    {['approved', 'pickup_assigned', 'pickup_accepted'].includes(
                      request.status,
                    ) && (
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-admin-surface-hover text-sm text-red-600 border-t border-admin-border"
                        onClick={() => setIsRejectOpen(true)}
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-6 xl:gap-8 items-start mt-6">
        {/* Main Content */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Status Alert Banner */}
          {request.sla?.isOverdue && (
            <div className="bg-[var(--admin-domain-danger-bg)] border border-[var(--admin-domain-danger)] rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--admin-error)]">warning</span>
              <div>
                <h4 className="text-[var(--admin-error)] font-bold text-sm">SLA Overdue</h4>
                <p className="text-sm text-red-800 mt-1">
                  This request has exceeded the standard processing time for the{' '}
                  <strong>{request.sla.currentStage}</strong> stage. Action required immediately.
                </p>
              </div>
            </div>
          )}

          {/* Logistics Timeline (Req #6) */}
          <div className="admin-card overflow-hidden border-none ring-1 ring-black/5 shadow-sm bg-white rounded-xl">
            <div className="admin-card-header p-4 sm:p-5 border-b border-admin-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="admin-card-title text-base font-bold text-gray-900">
                Reverse Logistics Timeline
              </h2>
              <StatusBadge status={request.status} />
            </div>
            <div className="admin-card-body p-4 overflow-hidden">
              <div className="relative pb-2 overflow-x-auto admin-scrollbar">
                <div className="flex items-start min-w-max px-2 pt-2">
                  {adminTimeline.map((stage, index) => {
                    const isCompleted = stage.status === 'completed';
                    const isPending = stage.status === 'pending';
                    const isRejected = stage.status === 'rejected';

                    return (
                      <div
                        key={index}
                        className="relative flex flex-col items-center w-28 flex-shrink-0"
                      >
                        {/* Connecting Line */}
                        {index < adminTimeline.length - 1 && (
                          <div
                            className={`absolute top-3 left-1/2 w-full h-[2px] ${isCompleted && adminTimeline[index + 1]?.status !== 'pending' && !isRejected ? 'bg-admin-success' : 'bg-admin-border'}`}
                          ></div>
                        )}

                        {/* Circle */}
                        <div
                          className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full border 
                          ${
                            isCompleted
                              ? 'bg-admin-success border-admin-success text-white'
                              : isRejected
                                ? 'bg-admin-error border-admin-error text-white'
                                : 'bg-admin-surface border-admin-border text-admin-text-muted'
                          }`}
                        >
                          {isCompleted ? (
                            <span className="material-symbols-outlined text-[12px]">check</span>
                          ) : isRejected ? (
                            <span className="material-symbols-outlined text-[12px]">close</span>
                          ) : (
                            <span className="text-[10px] font-bold">{index + 1}</span>
                          )}
                        </div>

                        {/* Label & Subtext */}
                        <div className="mt-2 text-center flex flex-col items-center">
                          <p
                            className={`text-[11px] leading-tight max-w-[90px] mx-auto font-bold ${!isPending ? 'text-gray-900' : 'text-gray-500'}`}
                          >
                            {stage.label}
                          </p>
                          {stage.subtext && (
                            <span
                              className={`mt-1 text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded
                              ${stage.subtext.includes('Required') || stage.subtext.includes('Locked') ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-gray-500 bg-gray-100'}`}
                            >
                              {stage.subtext}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="flex flex-col gap-5">
            {request.items?.map((item, index) => (
              <div
                key={index}
                className="admin-card overflow-hidden border-none shadow-sm ring-1 ring-black/5 bg-white rounded-xl"
              >
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-4 sm:gap-6 bg-white">
                  <img
                    src={item.imageSrc || PLACEHOLDER_IMAGES.product}
                    alt={item.title}
                    onError={handleImageError}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl shadow-sm flex-shrink-0 border border-gray-100"
                  />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="mb-2">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base mb-1 truncate">
                        {item.title}
                      </h4>
                      {item.variant && (
                        <span className="inline-flex bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-gray-200">
                          Variant: {item.variant}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-6 lg:gap-8">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">
                          Qty Returning
                        </span>
                        <span className="font-semibold text-gray-900 text-sm">
                          {item.returnQuantity}{' '}
                          <span className="text-gray-400 font-normal">
                            / {item.orderedQuantity}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">
                          Unit Price
                        </span>
                        <span className="font-semibold text-gray-900 text-sm">
                          ₹{item.unitPrice}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">
                          Status
                        </span>
                        <span className="capitalize font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-[10px] inline-flex w-fit border border-blue-100">
                          {item.warehouseStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 bg-gray-50/50">
                  <div className="p-3 sm:p-4">
                    <h5 className="text-[10px] font-bold mb-2 uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">forum</span>
                      Customer Reason
                    </h5>
                    <div>
                      <p className="font-bold text-gray-900 text-sm leading-snug">{item.reason}</p>
                      {item.description && (
                        <p className="text-xs text-gray-600 mt-1.5 leading-snug">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {item.evidenceImages?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200/60">
                        <div className="flex gap-2 overflow-x-auto admin-scrollbar pb-1">
                          {item.evidenceImages.map((img, i) => (
                            <a
                              key={i}
                              href={img}
                              target="_blank"
                              rel="noreferrer"
                              className="block flex-shrink-0"
                            >
                              <img
                                src={img}
                                alt="Evidence"
                                className="w-12 h-12 object-cover rounded-md shadow-sm hover:opacity-80 transition-opacity border border-gray-200"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inspection Results if available */}
                  {item.inspectionResult?.inspectedAt ? (
                    <div className="p-3 sm:p-4">
                      <h5 className="text-[10px] font-bold mb-2 uppercase tracking-wider text-gray-500 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">fact_check</span>
                          Warehouse Inspection
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold shadow-sm border ${item.inspectionResult.inspectionScore >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                        >
                          Score: {item.inspectionResult.inspectionScore}
                        </span>
                      </h5>
                      <ul className="space-y-1.5 text-xs">
                        <li className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium">Original Product</span>
                          {item.inspectionResult.originalProduct ? (
                            <span className="font-bold text-green-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                check_circle
                              </span>{' '}
                              Yes
                            </span>
                          ) : (
                            <span className="font-bold text-red-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">cancel</span>{' '}
                              No
                            </span>
                          )}
                        </li>
                        <li className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium">Accessories</span>
                          {item.inspectionResult.accessoriesPresent ? (
                            <span className="font-bold text-green-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                check_circle
                              </span>{' '}
                              Yes
                            </span>
                          ) : (
                            <span className="font-bold text-red-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">cancel</span>{' '}
                              No
                            </span>
                          )}
                        </li>
                        <li className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium">Packaging</span>
                          {item.inspectionResult.packagingIntact ? (
                            <span className="font-bold text-green-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                check_circle
                              </span>{' '}
                              Intact
                            </span>
                          ) : (
                            <span className="font-bold text-red-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">cancel</span>{' '}
                              Damaged
                            </span>
                          )}
                        </li>
                        <li className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium">Working Condition</span>
                          {item.inspectionResult.workingCondition ? (
                            <span className="font-bold text-green-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                check_circle
                              </span>{' '}
                              Yes
                            </span>
                          ) : (
                            <span className="font-bold text-red-700 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">cancel</span>{' '}
                              No
                            </span>
                          )}
                        </li>
                      </ul>
                      {item.inspectionResult.remarks && (
                        <div className="mt-3 p-2 bg-white border border-gray-200 rounded-md text-[11px] text-gray-700 leading-snug shadow-sm">
                          <span className="font-bold mr-1 text-gray-900">Remarks:</span>
                          {item.inspectionResult.remarks}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 flex flex-col items-center justify-center text-gray-400">
                      <span className="material-symbols-outlined text-2xl mb-2 opacity-40">
                        pending_actions
                      </span>
                      <p className="text-xs font-semibold">Pending Inspection</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-side bottom cards: Pickup & Audit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pickup Details (Req #22) */}
            <div className="admin-card shadow-sm border-none ring-1 ring-black/5 bg-white rounded-xl flex flex-col">
              <div className="admin-card-header flex justify-between items-center p-4 sm:p-5 border-b border-admin-border bg-white flex-shrink-0">
                <h2 className="admin-card-title text-base font-bold text-gray-900">
                  Pickup Logistics
                </h2>
                {request.pickup?.status && <StatusBadge status={request.pickup.status} />}
              </div>
              <div className="admin-card-body p-4 sm:p-5 flex-1">
                {request.pickup?.address ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        Pickup Address
                      </h4>
                      <p className="text-sm text-gray-800 break-words leading-relaxed font-medium bg-gray-50/80 p-3 rounded-lg border border-gray-100">
                        {request.pickup.address.name ||
                          `${request.pickup.address.firstName || ''} ${request.pickup.address.lastName || ''}`.trim() ||
                          request.orderId?.shippingAddress?.name ||
                          request.userId?.name ||
                          'Customer Name Not Provided'}
                        <br />
                        {request.pickup.address.addressString ||
                          request.pickup.address.addressLine1 ||
                          request.orderId?.shippingAddress?.address ||
                          'Address line not provided'}
                        {(request.pickup.address.locality ||
                          request.orderId?.shippingAddress?.locality) && (
                          <>
                            ,{' '}
                            {request.pickup.address.locality ||
                              request.orderId?.shippingAddress?.locality}
                          </>
                        )}
                        <br />
                        {request.pickup.address.city ||
                          request.orderId?.shippingAddress?.city ||
                          'City'}
                        ,{' '}
                        {request.pickup.address.state ||
                          request.orderId?.shippingAddress?.state ||
                          'State'}{' '}
                        {request.pickup.address.pincode ||
                          request.pickup.address.pinCode ||
                          request.orderId?.shippingAddress?.pincode ||
                          ''}
                        {(request.pickup.address.phone ||
                          request.orderId?.shippingAddress?.phone ||
                          request.userId?.phone) && (
                          <>
                            <br />
                            <span className="text-gray-500 text-xs mt-1 inline-block">
                              <span className="font-bold">Phone:</span>{' '}
                              {request.pickup.address.phone ||
                                request.orderId?.shippingAddress?.phone ||
                                request.userId?.phone}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {request.pickup.partner && (
                      <div className="pt-4 mt-4 border-t border-gray-200">
                        <div className="flex justify-between text-xs mb-2.5">
                          <span className="text-gray-500 font-bold uppercase tracking-wider">
                            Partner:
                          </span>
                          <span className="font-bold text-gray-900">{request.pickup.partner}</span>
                        </div>
                        <div className="flex justify-between text-xs mb-2.5">
                          <span className="text-gray-500 font-bold uppercase tracking-wider">
                            Tracking:
                          </span>
                          <span className="font-bold text-admin-primary">
                            {request.pickup.trackingId}
                          </span>
                        </div>
                        {request.pickup.driverName && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500 font-bold uppercase tracking-wider">
                              Driver:
                            </span>
                            <span className="font-bold text-gray-900">
                              {request.pickup.driverName} ({request.pickup.driverPhone})
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {(request.status === 'approved' || request.status === 'pickup_assigned') && (
                      <button className="admin-btn-secondary w-full justify-center mt-4 py-2.5 shadow-sm font-bold">
                        Assign/Update Courier
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-6 text-gray-400">
                    <span className="material-symbols-outlined text-3xl mb-2 opacity-50">
                      local_shipping
                    </span>
                    <p className="text-sm font-medium italic">No pickup scheduled.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Info */}
            <div className="admin-card shadow-sm border-none ring-1 ring-black/5 bg-white rounded-xl flex flex-col">
              <div className="admin-card-header p-4 sm:p-5 border-b border-admin-border bg-white flex-shrink-0">
                <h2 className="admin-card-title text-base font-bold text-gray-900">Audit Info</h2>
              </div>
              <div className="admin-card-body p-4 sm:p-5 text-xs text-gray-500 space-y-4 font-medium flex-1">
                <div className="flex justify-between items-center py-1">
                  <span>Created:</span>
                  <span className="text-gray-900 font-bold text-right">
                    {request.createdAt ? format(new Date(request.createdAt), 'PP pp') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Last Updated:</span>
                  <span className="text-gray-900 font-bold text-right">
                    {request.updatedAt ? format(new Date(request.updatedAt), 'PP pp') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Priority:</span>
                  <span
                    className={`capitalize font-bold px-2 py-0.5 rounded text-[10px] ${request.priority === 'high' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {request.priority}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Approval Level:</span>
                  <span className="capitalize font-bold text-gray-900">
                    {request.approvalLevel?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Refund Breakdown */}
          <div className="admin-card overflow-hidden shadow-sm border-none ring-1 ring-black/5 bg-white rounded-xl">
            <div className="admin-card-header bg-white border-b border-admin-border p-4 sm:p-5">
              <h2 className="admin-card-title flex items-center gap-2 text-base font-bold text-gray-900">
                <span className="material-symbols-outlined text-admin-primary">
                  account_balance_wallet
                </span>
                Refund Breakdown
              </h2>
            </div>
            <div className="admin-card-body p-4 sm:p-5">
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">
                    Product Total (
                    {request.items.reduce((acc, curr) => acc + curr.returnQuantity, 0)} items)
                  </span>
                  <span className="font-bold text-gray-900 text-sm">
                    ₹{request.refundBreakdown?.productTotal || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Tax Refund</span>
                  <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                    + ₹{request.refundBreakdown?.taxRefund || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">Shipping Refund</span>
                  <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                    + ₹{request.refundBreakdown?.shippingRefund || 0}
                  </span>
                </div>

                <div className="h-px bg-gray-200 w-full my-3"></div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-red-500">
                      remove
                    </span>{' '}
                    Restocking Fee
                  </span>
                  <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                    - ₹{request.refundBreakdown?.restockingFee || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-red-500">
                      remove
                    </span>{' '}
                    Discount Deduction
                  </span>
                  <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                    - ₹{request.refundBreakdown?.discountDeduction || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-orange-500">
                      account_balance_wallet
                    </span>{' '}
                    Wallet Deduction
                  </span>
                  <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                    - ₹{request.refundBreakdown?.walletUsedDeduction || 0}
                  </span>
                </div>

                <div className="pt-4 mt-4 border-t-2 border-dashed border-gray-200 flex justify-between items-center font-bold">
                  <span className="text-gray-900 text-sm">Grand Total</span>
                  <span className="text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 text-base shadow-sm">
                    ₹{(request.refundBreakdown?.grandTotal || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 sm:p-5 bg-blue-50/50 rounded-xl border border-blue-100 shadow-sm flex flex-col gap-5">
                <div>
                  <h4 className="font-bold text-gray-900 mb-2.5 flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-admin-primary text-[20px]">
                      credit_card
                    </span>
                    Refund Destination
                  </h4>
                  <div className="inline-flex">
                    <span className="px-3 py-1.5 bg-white border border-blue-200 rounded-md text-xs font-bold uppercase tracking-wider text-blue-800 shadow-sm">
                      {request.refundMethod?.replace('_', ' ')}
                    </span>
                  </div>
                  {request.refundMethod === 'original' && request.upiId && (
                    <div className="mt-4 bg-white p-3.5 rounded-lg border border-blue-100 shadow-sm flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-admin-primary text-[20px]">
                          account_balance
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 truncate">
                          Linked UPI ID
                        </p>
                        <p className="text-sm font-bold text-gray-900 truncate">{request.upiId}</p>
                      </div>
                    </div>
                  )}
                </div>
                {request.status === 'inspection_completed' && (
                  <button
                    className="w-full bg-admin-primary hover:bg-admin-primary-dark text-white rounded-lg flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                    onClick={() => triggerRefund(id, request.refundMethod)}
                  >
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                    Process Refund
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Customer Profile (Req #23) */}
          <div className="admin-card shadow-sm border-none ring-1 ring-black/5 bg-white rounded-xl">
            <div className="admin-card-header p-4 sm:p-5 border-b border-admin-border bg-white">
              <h2 className="admin-card-title text-base font-bold text-gray-900">
                Customer Profile
              </h2>
            </div>
            <div className="admin-card-body p-4 sm:p-5">
              <div className="flex items-center gap-4 mb-6 min-w-0">
                <div className="w-14 h-14 rounded-full bg-admin-primary/10 text-admin-primary flex items-center justify-center font-bold text-2xl flex-shrink-0">
                  {request.userId?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 truncate text-base mb-0.5">
                    {request.userId?.name}
                  </h3>
                  <p className="text-xs font-medium text-gray-500 truncate mb-0.5">
                    {request.userId?.email}
                  </p>
                  <p className="text-xs font-medium text-gray-500 truncate">
                    {request.userId?.phone}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center border-t border-b border-gray-200 py-5 mb-5 bg-gray-50/50 rounded-xl">
                <div>
                  <div className="text-2xl font-black text-gray-900">
                    {userStats?.totalOrders || 0}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-1">
                    Total Orders
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-600">
                    {userStats?.totalReturns || 0}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-1">
                    Total Returns
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Return Rate
                </span>
                <span className="text-sm font-black text-gray-900">
                  {userStats?.returnPercentage || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-5 shadow-inner">
                <div
                  className={`h-full rounded-full ${userStats?.returnPercentage > 50 ? 'bg-red-500' : userStats?.returnPercentage > 20 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, userStats?.returnPercentage || 0)}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center bg-red-50 p-3.5 rounded-xl border border-red-100 shadow-sm">
                <span className="text-xs text-red-700 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">security</span> Fraud
                  Score
                </span>
                <span
                  className={`text-sm font-black ${userStats?.fraudScore > 50 ? 'text-red-700' : 'text-gray-900'}`}
                >
                  {userStats?.fraudScore || 0}/100
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      {isRejectOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-admin-error flex items-center gap-2">
              <span className="material-symbols-outlined">warning</span> Reject Return Request
            </h3>
            <p className="text-sm text-admin-text-muted mb-4">
              Please provide a reason for rejecting this return request. This will be sent to the
              customer.
            </p>
            <textarea
              className="admin-input w-full min-h-[100px] mb-4"
              placeholder="e.g., The item does not meet the return policy criteria..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            ></textarea>
            <div className="flex justify-end gap-2">
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  setIsRejectOpen(false);
                  setRejectReason('');
                }}
              >
                Cancel
              </button>
              <button
                className="admin-btn bg-admin-error text-white border-0 hover:bg-red-700"
                onClick={handleReject}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminReturnDetail;
