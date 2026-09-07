import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Truck,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { returnService } from '../../services/api/returnService';
import { orderService } from '../../services/domainServices';
import { OptimizedImage } from '../../components/ui';
import { ReturnExchangeSkeleton } from '../../components/ui/skeletons/PageSkeletons';
import { SEO } from '../../components/seo/SEO';
import EvidenceUploader from './components/EvidenceUploader';

const RETURN_REASONS = [
  'Damaged item',
  'Wrong item received',
  'Item is different from expected',
  'Size or fit issue',
  'Changed my mind',
  'Quality issue',
  'Other',
];

const generateSafeUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'ret-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
};

export const ReturnRequestPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [returnState, setReturnState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 3 Clear Steps: 1 = Item & Reason, 2 = Pickup & Refund, 3 = Review & Submit, 4 = Success
  const [step, setStep] = useState(1);

  // State
  const [selectedItems, setSelectedItems] = useState({}); // { itemId: { ... } }
  const [refundMethod, setRefundMethod] = useState('original');
  const [upiId, setUpiId] = useState('');
  const [pickupAddress, setPickupAddress] = useState(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [createdReturn, setCreatedReturn] = useState(null);
  const [idempotencyKey] = useState(generateSafeUUID);

  useEffect(() => {
    if (!orderId) {
      toast.error('Order ID is missing');
      navigate('/dashboard/orders');
      return;
    }

    const fetchData = async () => {
      try {
        const [orderRes, stateRes] = await Promise.all([
          orderService.getById(orderId),
          returnService.getOrderReturnState(orderId).catch(() => ({ data: { success: false } })),
        ]);

        if (orderRes.success) {
          setOrder(orderRes.data);
          setPickupAddress(orderRes.data.shippingAddress);

          if (stateRes.data?.success) {
            setReturnState(stateRes.data.data);
          }
        } else {
          toast.error('Order not found');
          navigate('/dashboard/orders');
        }
      } catch (err) {
        toast.error('Failed to load order details');
        navigate('/dashboard/orders');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId, navigate]);

  if (loading) return <ReturnExchangeSkeleton />;
  if (!order) return null;

  const isCOD =
    (order.paymentMethod || '').toLowerCase() === 'cod' ||
    (order.paymentMethod || '').toLowerCase() === 'cash_on_delivery';

  const handleItemToggle = (item, checked) => {
    if (checked) {
      setSelectedItems((prev) => ({
        ...prev,
        [item._id]: {
          productId: item.productId?._id || item.productId,
          title: item.title || item.productId?.title || 'Product',
          imageSrc: item.imageSrc || item.productId?.imageSrc,
          price: item.price || 0,
          returnQuantity: 1,
          maxQuantity: item.quantity || 1,
          reason: '',
          description: '',
          evidenceImages: [],
          evidenceVideos: [],
        },
      }));
    } else {
      setSelectedItems((prev) => {
        const copy = { ...prev };
        delete copy[item._id];
        return copy;
      });
    }
  };

  const updateItem = (itemId, field, val) => {
    setSelectedItems((prev) => {
      if (!prev[itemId]) return prev;
      return {
        ...prev,
        [itemId]: { ...prev[itemId], [field]: val },
      };
    });
  };

  // Calculate estimated refund
  const estimatedRefund = Object.values(selectedItems).reduce((sum, item) => {
    const itemTotal = (item.price || 0) * (item.returnQuantity || 1);
    return sum + itemTotal;
  }, 0);

  // Validation
  const canProceedFromStep1 =
    Object.keys(selectedItems).length > 0 &&
    Object.values(selectedItems).every((i) => Boolean(i.reason));

  const canProceedFromStep2 = !isCOD || refundMethod === 'wallet' || Boolean(upiId.trim());

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = {
        orderId,
        refundMethod: isCOD && refundMethod === 'original' ? 'original' : refundMethod,
        upiId: isCOD && refundMethod === 'original' ? upiId.trim() : undefined,
        pickupAddress,
        idempotencyKey,
        items: Object.values(selectedItems).map((item) => ({
          productId: item.productId,
          returnQuantity: item.returnQuantity,
          reason: item.reason,
          description: item.description?.trim() || undefined,
          evidenceImages: item.evidenceImages || [],
          evidenceVideos: item.evidenceVideos || [],
        })),
      };

      const res = await returnService.createReturn(payload);
      if (res.data?.success) {
        setCreatedReturn(res.data.data);
        setStep(4); // Success step
        toast.success('Return request submitted successfully!');
      } else {
        toast.error(res.data?.message || 'Failed to submit return request');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  // Success Screen
  if (step === 4 && createdReturn) {
    const returnReqId = createdReturn._id || createdReturn.returnId;
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <SEO title="Return Request Submitted | Siri Arts & Crafts" noindex />
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-medium text-stone-900 mb-2">
          Return Request Submitted
        </h1>
        <p className="text-sm text-stone-600 mb-6">
          Your request <strong className="text-stone-900">#{createdReturn.returnId}</strong> has
          been received. Our team will review it shortly.
        </p>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 text-left mb-6 space-y-3 text-xs text-stone-700">
          <div className="flex justify-between pb-3 border-b border-stone-100">
            <span className="text-stone-500">Items Returning:</span>
            <span className="font-semibold text-stone-900">
              {Object.keys(selectedItems).length} item(s)
            </span>
          </div>
          <div className="flex justify-between pb-3 border-b border-stone-100">
            <span className="text-stone-500">Refund Amount:</span>
            <span className="font-semibold text-emerald-700">
              ₹{Math.round(estimatedRefund).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Pickup Location:</span>
            <span className="font-medium text-stone-900 text-right">
              {pickupAddress?.city || 'Delivery Address'}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={`/dashboard/returns/${returnReqId}`}
            className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            Track Return
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/dashboard/orders"
            className="px-6 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center"
          >
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-left">
      <SEO title="Return Items | Siri Arts & Crafts" noindex />

      {/* Breadcrumb Header */}
      <div className="mb-6">
        <Link
          to="/dashboard/orders"
          className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Order
        </Link>
        <h1 className="text-2xl font-display font-medium text-stone-900">Return Items</h1>
        <p className="text-xs text-stone-500 mt-1">
          Order #{order._id?.toString().slice(-8)} • Select the items you'd like to return
        </p>
      </div>

      {/* Clean 3-Step Progress Indicator */}
      <div className="mb-8">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <div
            className={`h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-stone-900' : 'bg-stone-200'}`}
          />
          <div
            className={`h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-stone-900' : 'bg-stone-200'}`}
          />
          <div
            className={`h-1.5 rounded-full transition-colors ${step >= 3 ? 'bg-stone-900' : 'bg-stone-200'}`}
          />
        </div>
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-stone-500">
          <span className={step === 1 ? 'text-stone-900' : ''}>1. Select Items</span>
          <span className={step === 2 ? 'text-stone-900' : ''}>2. Pickup & Refund</span>
          <span className={step === 3 ? 'text-stone-900' : ''}>3. Review & Submit</span>
        </div>
      </div>

      {/* STEP 1: Select Items & Reason */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="space-y-4">
            {order.items.map((item) => {
              const productId = item.productId?._id || item.productId;
              const isSelected = Boolean(selectedItems[item._id]);
              const itemState = returnState?.items?.find(
                (i) => i.productId === productId.toString(),
              );
              const isEligible = itemState ? itemState.isEligibleForReturn : true;

              return (
                <div
                  key={item._id}
                  className={`border rounded-2xl p-4 transition-all ${
                    !isEligible
                      ? 'bg-stone-50/60 border-stone-200 opacity-60'
                      : isSelected
                        ? 'bg-stone-50/50 border-stone-900 shadow-xs'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!isEligible}
                      onChange={(e) => handleItemToggle(item, e.target.checked)}
                      className="mt-1 w-5 h-5 rounded-md text-stone-900 focus:ring-stone-900 accent-stone-900 cursor-pointer disabled:cursor-not-allowed"
                    />

                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                      <OptimizedImage
                        src={item.imageSrc || item.productId?.imageSrc}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm text-stone-900 truncate">
                            {item.title || item.productId?.title}
                          </h3>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Ordered: {item.quantity} • ₹{item.price} each
                          </p>
                        </div>
                        {!isEligible && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-stone-200 text-stone-600">
                            {itemState?.returnBadge || 'Not Eligible'}
                          </span>
                        )}
                      </div>

                      {/* Item Details Form (Shown when checked) */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t border-stone-200/80 space-y-3">
                          {/* Quantity Selector */}
                          {item.quantity > 1 && (
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-stone-600 font-medium">
                                Quantity to return:
                              </span>
                              <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-white">
                                <button
                                  type="button"
                                  disabled={selectedItems[item._id].returnQuantity <= 1}
                                  onClick={() =>
                                    updateItem(
                                      item._id,
                                      'returnQuantity',
                                      selectedItems[item._id].returnQuantity - 1,
                                    )
                                  }
                                  className="px-2 py-1 hover:bg-stone-100 disabled:opacity-30"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-3 font-semibold text-stone-900">
                                  {selectedItems[item._id].returnQuantity}
                                </span>
                                <button
                                  type="button"
                                  disabled={selectedItems[item._id].returnQuantity >= item.quantity}
                                  onClick={() =>
                                    updateItem(
                                      item._id,
                                      'returnQuantity',
                                      selectedItems[item._id].returnQuantity + 1,
                                    )
                                  }
                                  className="px-2 py-1 hover:bg-stone-100 disabled:opacity-30"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Reason Selector */}
                          <div>
                            <label className="block text-xs font-semibold text-stone-800 mb-1.5">
                              Why are you returning this item? *
                            </label>
                            <select
                              value={selectedItems[item._id].reason}
                              onChange={(e) => updateItem(item._id, 'reason', e.target.value)}
                              className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-white text-stone-900 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-hidden"
                            >
                              <option value="">Select a reason...</option>
                              {RETURN_REASONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Optional Note */}
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">
                              Additional note (optional)
                            </label>
                            <input
                              type="text"
                              value={selectedItems[item._id].description || ''}
                              onChange={(e) => updateItem(item._id, 'description', e.target.value)}
                              placeholder="e.g. Broken packaging, wrong color, etc."
                              className="w-full text-xs rounded-xl border border-stone-200 p-2.5 bg-white placeholder-stone-400 focus:border-stone-900 outline-hidden"
                            />
                          </div>

                          {/* Optional Photo Upload */}
                          <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">
                              Photos / Evidence (optional)
                            </label>
                            <EvidenceUploader
                              images={selectedItems[item._id].evidenceImages || []}
                              videos={selectedItems[item._id].evidenceVideos || []}
                              onImagesChange={(imgs) =>
                                updateItem(item._id, 'evidenceImages', imgs)
                              }
                              onVideosChange={(vids) =>
                                updateItem(item._id, 'evidenceVideos', vids)
                              }
                              maxImages={3}
                              maxVideos={1}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              disabled={!canProceedFromStep1}
              onClick={() => setStep(2)}
              className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              Continue to Pickup & Refund
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Pickup Address & Refund Destination */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Pickup Address Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-stone-600" />
                Pickup Address
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingAddress(!isEditingAddress)}
                className="text-xs text-stone-600 underline hover:text-stone-900"
              >
                {isEditingAddress ? 'Done' : 'Change Address'}
              </button>
            </div>

            {isEditingAddress ? (
              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  placeholder="Street Address"
                  value={pickupAddress?.street || pickupAddress?.addressLine1 || ''}
                  onChange={(e) => setPickupAddress({ ...pickupAddress, street: e.target.value })}
                  className="w-full text-xs rounded-xl border border-stone-200 p-2.5"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={pickupAddress?.city || ''}
                    onChange={(e) => setPickupAddress({ ...pickupAddress, city: e.target.value })}
                    className="w-full text-xs rounded-xl border border-stone-200 p-2.5"
                  />
                  <input
                    type="text"
                    placeholder="PIN / Postal Code"
                    value={pickupAddress?.zipCode || pickupAddress?.postalCode || ''}
                    onChange={(e) =>
                      setPickupAddress({ ...pickupAddress, zipCode: e.target.value })
                    }
                    className="w-full text-xs rounded-xl border border-stone-200 p-2.5"
                  />
                </div>
              </div>
            ) : (
              <div className="text-xs text-stone-600 space-y-0.5">
                <p className="font-semibold text-stone-900">
                  {pickupAddress?.firstName} {pickupAddress?.lastName}
                </p>
                <p>{pickupAddress?.street || pickupAddress?.addressLine1}</p>
                <p>
                  {pickupAddress?.city}, {pickupAddress?.state} -{' '}
                  {pickupAddress?.zipCode || pickupAddress?.postalCode}
                </p>
                <p className="text-stone-500 pt-1">Phone: {pickupAddress?.phone}</p>
              </div>
            )}
          </div>

          {/* Refund Destination Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-stone-600" />
              Refund Destination
            </h3>

            {!isCOD ? (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Refund to Original Payment Method
                </p>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Since this order was paid online, your refund of approximately{' '}
                  <strong>₹{Math.round(estimatedRefund).toLocaleString('en-IN')}</strong> will be
                  automatically credited back to your original payment source (Card / UPI /
                  Netbanking) after the item is inspected.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                  This order was paid with Cash on Delivery (COD). Please provide where you would
                  like your refund sent:
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-stone-50">
                    <input
                      type="radio"
                      name="refundMethod"
                      value="original"
                      checked={refundMethod === 'original'}
                      onChange={() => setRefundMethod('original')}
                      className="accent-stone-900"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-stone-900 block">UPI Direct Payout</span>
                      <span className="text-stone-500">Transfer directly to your UPI ID</span>
                    </div>
                  </label>

                  {refundMethod === 'original' && (
                    <div className="pl-6">
                      <label className="block text-xs font-semibold text-stone-800 mb-1">
                        Your UPI ID *
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                        className="w-full text-xs rounded-xl border border-stone-300 p-2.5 bg-white placeholder-stone-400 focus:border-stone-900 outline-hidden"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-stone-50">
                    <input
                      type="radio"
                      name="refundMethod"
                      value="wallet"
                      checked={refundMethod === 'wallet'}
                      onChange={() => setRefundMethod('wallet')}
                      className="accent-stone-900"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-stone-900 block">
                        Store Wallet Credit
                      </span>
                      <span className="text-stone-500">
                        Instant credit usable on any future purchase
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              disabled={!canProceedFromStep2}
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              Review Request
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Submit */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900 pb-2 border-b border-stone-100">
              Review Return Request
            </h3>

            {/* Items Summary */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Returning Items
              </span>
              {Object.values(selectedItems).map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0 border border-stone-200">
                    <OptimizedImage src={item.imageSrc} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-stone-900 truncate">{item.title}</p>
                    <p className="text-stone-500">
                      Reason: <strong className="text-stone-800">{item.reason}</strong> • Qty:{' '}
                      {item.returnQuantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-stone-900">
                    ₹{item.price * item.returnQuantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Pickup & Refund info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-stone-100 text-xs">
              <div>
                <span className="text-stone-500 block mb-1">Pickup Address:</span>
                <p className="font-medium text-stone-900">
                  {pickupAddress?.street || pickupAddress?.addressLine1}, {pickupAddress?.city}
                </p>
              </div>
              <div>
                <span className="text-stone-500 block mb-1">Refund Method:</span>
                <p className="font-medium text-stone-900">
                  {!isCOD
                    ? 'Original Payment Method'
                    : refundMethod === 'wallet'
                      ? 'Store Wallet Credit'
                      : `UPI (${upiId})`}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-sm font-bold text-stone-900">
              <span>Estimated Refund:</span>
              <span className="text-emerald-700 text-base">
                ₹{Math.round(estimatedRefund).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-8 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest transition-colors inline-flex items-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                'Submit Return Request'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnRequestPage;
