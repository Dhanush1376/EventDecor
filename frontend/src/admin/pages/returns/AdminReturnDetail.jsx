import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmProvider';
import { format } from 'date-fns';
import { useReturnManagement } from '../../hooks/useReturnManagement';
import { handleImageError } from '../../../utils/media/imageUtils';
import { PLACEHOLDER_IMAGES } from '../../../constants/placeholderImages';
// Removed lucide-react direct imports in favor of material-symbols-outlined
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  SkeletonDashboard,
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
  const [activeTab, setActiveTab] = useState('items'); // items, timeline, conversation, refund
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

  const { request, userStats } = currentReturn;

  const currentStageIndex = TIMELINE_STAGES.findIndex((s) => s.id === request.status);

  return (
    <div className="admin-page-container">
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

      <div className="admin-grid-12 items-start">
        {/* Left Column (Main Content) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Status Alert Banner */}
          {request.sla?.isOverdue && (
            <div className="bg-[var(--admin-domain-danger-bg)] border border-[var(--admin-domain-danger)] rounded-[var(--admin-radius-lg)] p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--admin-error)]">warning</span>
              <div>
                <h4 className="text-[var(--admin-error)] font-medium">SLA Overdue</h4>
                <p className="text-sm text-red-800">
                  This request has exceeded the standard processing time for the{' '}
                  <strong>{request.sla.currentStage}</strong> stage. Action required immediately.
                </p>
              </div>
            </div>
          )}

          {/* Logistics Timeline (Req #6) */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Reverse Logistics Timeline</h2>
              <StatusBadge status={request.status} />
            </div>
            <div className="admin-card-body">
              <div className="relative pt-8 pb-4 overflow-x-auto">
                <div className="flex items-center min-w-max">
                  {TIMELINE_STAGES.map((stage, index) => {
                    const isCompleted =
                      index <= currentStageIndex &&
                      request.status !== 'rejected' &&
                      request.status !== 'cancelled';
                    const isCurrent = index === currentStageIndex;
                    const isRejected =
                      (request.status === 'rejected' || request.status === 'cancelled') &&
                      index === currentStageIndex;

                    return (
                      <div
                        key={stage.id}
                        className="relative flex flex-col items-center w-32 flex-shrink-0"
                      >
                        {/* Connecting Line */}
                        {index < TIMELINE_STAGES.length - 1 && (
                          <div
                            className={`absolute top-4 left-1/2 w-full h-1 ${index < currentStageIndex && !isRejected ? 'bg-admin-success' : 'bg-admin-border'}`}
                          ></div>
                        )}

                        {/* Circle */}
                        <div
                          className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 
                          ${
                            isCompleted
                              ? 'bg-admin-success border-admin-success text-white'
                              : isRejected
                                ? 'bg-admin-error border-admin-error text-white'
                                : 'bg-admin-surface border-admin-border text-admin-text-muted'
                          }`}
                        >
                          {isCompleted ? (
                            <span className="material-symbols-outlined text-sm">check</span>
                          ) : isRejected ? (
                            <span className="material-symbols-outlined text-sm">close</span>
                          ) : (
                            <span className="text-xs">{index + 1}</span>
                          )}
                        </div>

                        {/* Label */}
                        <div className="mt-3 text-center">
                          <p
                            className={`text-xs font-medium ${isCurrent ? 'text-admin-text' : 'text-admin-text-muted'}`}
                          >
                            {stage.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'items' ? 'active' : ''}`}
              onClick={() => setActiveTab('items')}
            >
              Returned Items ({request.items?.length})
            </button>
            <button
              className={`admin-tab ${activeTab === 'refund' ? 'active' : ''}`}
              onClick={() => setActiveTab('refund')}
            >
              Refund Details
            </button>
            <button
              className={`admin-tab ${activeTab === 'conversation' ? 'active' : ''}`}
              onClick={() => setActiveTab('conversation')}
            >
              Conversation
            </button>
          </div>

          {/* Items Tab */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              {request.items?.map((item, index) => (
                <div key={index} className="admin-card">
                  <div className="p-4 border-b border-admin-border flex gap-4">
                    <img
                      src={item.imageSrc || PLACEHOLDER_IMAGES.product}
                      alt={item.title}
                      onError={handleImageError}
                      className="w-20 h-20 object-cover rounded-md border border-admin-border"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-admin-text">{item.title}</h4>
                      {item.variant && (
                        <p className="text-sm text-admin-text-muted">Variant: {item.variant}</p>
                      )}
                      <div className="mt-2 flex gap-4 text-sm">
                        <div>
                          <span className="text-admin-text-muted">Qty returning:</span>{' '}
                          <b>{item.returnQuantity}</b> / {item.orderedQuantity}
                        </div>
                        <div>
                          <span className="text-admin-text-muted">Unit price:</span>{' '}
                          <b>₹{item.unitPrice}</b>
                        </div>
                        <div>
                          <span className="text-admin-text-muted">Status:</span>{' '}
                          <span className="capitalize">
                            {item.warehouseStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-admin-surface-hover">
                    <h5 className="text-sm font-semibold mb-2">Customer Reason</h5>
                    <p className="text-admin-text">{item.reason}</p>
                    {item.description && (
                      <p className="text-sm text-admin-text-muted mt-1">{item.description}</p>
                    )}

                    {item.evidenceImages?.length > 0 && (
                      <div className="mt-4 flex gap-2">
                        {item.evidenceImages.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt="Evidence"
                            className="w-16 h-16 object-cover rounded-md border border-admin-border cursor-pointer"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inspection Results if available */}
                  {item.inspectionResult?.inspectedAt && (
                    <div className="p-4 border-t border-admin-border">
                      <h5 className="text-sm font-semibold mb-3 flex items-center justify-between">
                        Warehouse Inspection
                        <span
                          className={`px-2 py-1 rounded text-xs ${item.inspectionResult.inspectionScore >= 80 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        >
                          Score: {item.inspectionResult.inspectionScore}/100
                        </span>
                      </h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-admin-text-muted">Original Product:</span>
                          <span>
                            {item.inspectionResult.originalProduct ? (
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className="material-symbols-outlined text-[14px] text-green-500"
                                  aria-hidden="true"
                                >
                                  check
                                </span>{' '}
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className="material-symbols-outlined text-[14px] text-red-500"
                                  aria-hidden="true"
                                >
                                  close
                                </span>{' '}
                                No
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-admin-text-muted">Accessories:</span>
                          <span>
                            {item.inspectionResult.accessoriesPresent ? (
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className="material-symbols-outlined text-[14px] text-green-500"
                                  aria-hidden="true"
                                >
                                  check
                                </span>{' '}
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className="material-symbols-outlined text-[14px] text-red-500"
                                  aria-hidden="true"
                                >
                                  close
                                </span>{' '}
                                No
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-admin-text-muted">Packaging:</span>
                          <span>
                            {item.inspectionResult.packagingIntact ? (
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className="material-symbols-outlined text-[14px] text-green-500"
                                  aria-hidden="true"
                                >
                                  check
                                </span>{' '}
                                Intact
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className="material-symbols-outlined text-[14px] text-red-500"
                                  aria-hidden="true"
                                >
                                  close
                                </span>{' '}
                                Damaged
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-admin-text-muted">Working Condition:</span>
                          <span>
                            {item.inspectionResult.workingCondition ? (
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className="material-symbols-outlined text-[14px] text-green-500"
                                  aria-hidden="true"
                                >
                                  check
                                </span>{' '}
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <span
                                  className="material-symbols-outlined text-[14px] text-red-500"
                                  aria-hidden="true"
                                >
                                  close
                                </span>{' '}
                                No
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      {item.inspectionResult.remarks && (
                        <p className="mt-3 text-sm text-admin-text-muted">
                          <b>Remarks:</b> {item.inspectionResult.remarks}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Refund Tab (Req #20) */}
          {activeTab === 'refund' && (
            <div className="admin-card">
              <div className="admin-card-header">
                <h2 className="admin-card-title">Refund Calculator (Server Calculated)</h2>
              </div>
              <div className="admin-card-body p-0">
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-admin-text-muted">
                        Product Total (
                        {request.items.reduce((acc, curr) => acc + curr.returnQuantity, 0)} items)
                      </span>
                      <span>₹{request.refundBreakdown?.productTotal || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text-muted">Tax Refund</span>
                      <span>+ ₹{request.refundBreakdown?.taxRefund || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text-muted">Shipping Refund</span>
                      <span>+ ₹{request.refundBreakdown?.shippingRefund || 0}</span>
                    </div>
                    <div className="flex justify-between text-admin-error">
                      <span>Restocking Fee</span>
                      <span>- ₹{request.refundBreakdown?.restockingFee || 0}</span>
                    </div>
                    <div className="flex justify-between text-admin-error">
                      <span>Discount Proportion</span>
                      <span>- ₹{request.refundBreakdown?.discountDeduction || 0}</span>
                    </div>
                    <div className="flex justify-between text-admin-error">
                      <span>Wallet Used (Reverted to Wallet)</span>
                      <span>- ₹{request.refundBreakdown?.walletUsedDeduction || 0}</span>
                    </div>

                    <div className="pt-4 mt-4 border-t border-admin-border flex justify-between font-bold text-lg">
                      <span>Grand Total Refund</span>
                      <span className="text-admin-success">
                        ₹{(request.refundBreakdown?.grandTotal || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-admin-surface-hover rounded-lg border border-admin-border">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-admin-text">Refund Method</h4>
                        <p className="text-sm text-admin-text-muted capitalize">
                          {request.refundMethod?.replace('_', ' ')}
                        </p>
                        {request.refundMethod === 'original' && request.upiId && (
                          <div className="mt-2 bg-admin-surface p-2 rounded border border-admin-border">
                            <p className="text-xs text-admin-text-muted font-medium mb-0.5">
                              UPI ID
                            </p>
                            <p className="text-sm text-[var(--admin-text-primary)]">
                              {request.upiId}
                            </p>
                          </div>
                        )}
                      </div>
                      {request.status === 'inspection_passed' && (
                        <button className="admin-btn-primary" onClick={() => triggerRefund(id)}>
                          Trigger Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conversation Tab (Req #17 & #19) */}
          {activeTab === 'conversation' && (
            <div className="admin-card flex flex-col h-[500px]">
              <div className="admin-card-header">
                <h2 className="admin-card-title">Communication & Notes</h2>
              </div>
              <div className="admin-card-body flex-1 overflow-y-auto bg-admin-surface-hover p-4 space-y-4">
                {request.conversation?.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.isInternal ? 'justify-center' : msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.isInternal ? (
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-2 max-w-[80%] text-sm shadow-sm">
                        <div className="font-medium flex items-center gap-1 mb-1">
                          <span className="material-symbols-outlined text-[16px]">lock</span>
                          Internal Note by {msg.senderName}
                        </div>
                        <p>{msg.message}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-3 shadow-sm ${msg.sender === 'admin' ? 'bg-admin-primary text-white' : 'bg-white border border-admin-border'}`}
                      >
                        <div className="text-xs font-medium mb-1 opacity-80">{msg.senderName}</div>
                        <p className={msg.sender === 'admin' ? 'text-white' : 'text-admin-text'}>
                          {msg.message}
                        </p>
                        <span className="text-xs opacity-70 mt-1 block text-right">
                          {format(new Date(msg.createdAt), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-admin-border bg-white">
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Add an internal note (hidden from customer)..."
                    className="admin-input flex-1"
                  />
                  <button
                    type="submit"
                    className="admin-btn-secondary"
                    disabled={!internalNote.trim()}
                  >
                    Add Note
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Sidebar info) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Customer Profile (Req #23) */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Customer Profile</h2>
            </div>
            <div className="admin-card-body">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-admin-primary/10 text-admin-primary flex items-center justify-center font-bold text-xl">
                  {request.userId?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-admin-text">{request.userId?.name}</h3>
                  <p className="text-sm text-admin-text-muted">{request.userId?.email}</p>
                  <p className="text-sm text-admin-text-muted">{request.userId?.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center border-t border-b border-admin-border py-4 mb-4">
                <div>
                  <div className="text-2xl font-bold">{userStats?.totalOrders || 0}</div>
                  <div className="text-xs text-admin-text-muted">Total Orders</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-admin-warning">
                    {userStats?.totalReturns || 0}
                  </div>
                  <div className="text-xs text-admin-text-muted">Total Returns</div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-admin-text-muted">Return Rate</span>
                <span className="text-sm font-medium">{userStats?.returnPercentage || 0}%</span>
              </div>
              <div className="w-full bg-admin-border h-2 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full ${userStats?.returnPercentage > 50 ? 'bg-admin-error' : userStats?.returnPercentage > 20 ? 'bg-admin-warning' : 'bg-admin-success'}`}
                  style={{ width: `${Math.min(100, userStats?.returnPercentage || 0)}%` }}
                ></div>
              </div>

              <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100">
                <span className="text-sm text-admin-error font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">security</span> Fraud Score
                </span>
                <span
                  className={`text-sm font-bold ${userStats?.fraudScore > 50 ? 'text-admin-error' : 'text-admin-text'}`}
                >
                  {userStats?.fraudScore || 0}/100
                </span>
              </div>
            </div>
          </div>

          {/* Pickup Details (Req #22) */}
          <div className="admin-card">
            <div className="admin-card-header flex justify-between items-center">
              <h2 className="admin-card-title">Pickup Logistics</h2>
              {request.pickup?.status && <StatusBadge status={request.pickup.status} />}
            </div>
            <div className="admin-card-body">
              {request.pickup?.address ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-admin-text-muted uppercase mb-1">
                      Pickup Address
                    </h4>
                    <p className="text-sm">
                      {request.pickup.address.firstName} {request.pickup.address.lastName}
                      <br />
                      {request.pickup.address.addressLine1}
                      <br />
                      {request.pickup.address.city}, {request.pickup.address.state}{' '}
                      {request.pickup.address.pinCode}
                    </p>
                  </div>

                  {request.pickup.partner && (
                    <div className="pt-3 border-t border-admin-border">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-admin-text-muted">Partner:</span>
                        <span className="font-medium">{request.pickup.partner}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-admin-text-muted">Tracking:</span>
                        <span className="font-medium">{request.pickup.trackingId}</span>
                      </div>
                      {request.pickup.driverName && (
                        <div className="flex justify-between text-sm">
                          <span className="text-admin-text-muted">Driver:</span>
                          <span>
                            {request.pickup.driverName} ({request.pickup.driverPhone})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {(request.status === 'approved' || request.status === 'pickup_assigned') && (
                    <button className="admin-btn-secondary w-full justify-center mt-2">
                      Assign/Update Courier
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-admin-text-muted italic">No pickup scheduled.</p>
              )}
            </div>
          </div>

          {/* Audit Info */}
          <div className="admin-card">
            <div className="admin-card-body text-xs text-admin-text-muted space-y-2">
              <div className="flex justify-between">
                <span>Created:</span>
                <span>
                  {request.createdAt ? format(new Date(request.createdAt), 'PP pp') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>
                  {request.updatedAt ? format(new Date(request.updatedAt), 'PP pp') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Priority:</span>
                <span className="capitalize font-medium text-admin-text">{request.priority}</span>
              </div>
              <div className="flex justify-between">
                <span>Approval Level:</span>
                <span className="capitalize font-medium text-admin-text">
                  {request.approvalLevel?.replace('_', ' ')}
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
    </div>
  );
};

export default AdminReturnDetail;
