import {
  ArrowLeftRight,
  ArrowRight,
  SlidersHorizontal,
  Search,
  Receipt,
  Truck,
  Info,
  CheckCircle2,
  Minus,
  Plus,
  Ban,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { returnService } from '../../services/api/returnService';
import { orderService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { OptimizedImage } from '../../components/ui';
import { ReturnExchangeSkeleton } from '../../components/ui/skeletons/PageSkeletons';
import { SEO } from '../../components/seo/SEO';
import { ProductSelectionBottomSheet } from './components/ProductSelectionBottomSheet';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

const REASON_OPTIONS = [
  'Wrong size / fit',
  'Product damaged on arrival',
  'Product defective / not working',
  'Product not as described',
  'Need a different variant',
  'Other',
];

export const ExchangeRequestPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [returnState, setReturnState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 3-step streamlined flow: 1: Item & Reason, 2: Replacement, 3: Review & Confirm, 4: Success
  const [step, setStep] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [exchangeReason, setExchangeReason] = useState('');
  const [exchangeReasonOther, setExchangeReasonOther] = useState('');
  const [exchangeType, setExchangeType] = useState('same');
  const [replacementProduct, setReplacementProduct] = useState(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [pickupAddress, setPickupAddress] = useState(null);
  const [refundMethod, setRefundMethod] = useState('original');
  const [upiId, setUpiId] = useState('');
  const [pendingPayment, setPendingPayment] = useState(null);
  const [submittedRequestId, setSubmittedRequestId] = useState(null);

  const [idempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'exc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9),
  );

  const { diff, effectivePaidPrice } = React.useMemo(() => {
    if (exchangeType !== 'different_product' || !replacementProduct || !selectedItem || !order)
      return { diff: 0, effectivePaidPrice: 0 };

    const totalDeductions = (order.discount || 0) + (order.walletDeduction || 0);
    let ep = selectedItem.price || 0;

    if (totalDeductions > 0 && order.subtotal > 0) {
      const ratio = ep / order.subtotal;
      ep = Math.max(0, ep - totalDeductions * ratio);
    }

    return {
      effectivePaidPrice: ep,
      diff: (replacementProduct.price || 0) - ep,
    };
  }, [exchangeType, replacementProduct, selectedItem, order]);

  const stepsList = ['ITEM & REASON', 'REPLACEMENT', 'REVIEW & CONFIRM'];
  const totalSteps = 3;

  useEffect(() => {
    if (!orderId) {
      toast.error('Order ID is missing');
      navigate('/dashboard/orders');
      return;
    }

    const fetchOrderAndCheckEligibility = async () => {
      try {
        const [orderRes, stateRes] = await Promise.all([
          orderService.getById(orderId),
          returnService.getOrderReturnState(orderId).catch(() => null),
        ]);

        if (orderRes.success) {
          const ordStatus = (orderRes.data?.orderStatus || '').toLowerCase();
          if (stateRes && stateRes.data && stateRes.data.success) {
            const state = stateRes.data.data;
            setReturnState(state);
            if ((state.orderStatus || '').toLowerCase() !== 'delivered') {
              toast.error('Returns and exchanges are only available for delivered orders.');
              navigate('/dashboard/orders');
              return;
            }
            if (!state.canInitiateExchange) {
              toast.error(state.reasonIfBlocked || 'This order is not eligible for exchange.');
              navigate('/dashboard/orders');
              return;
            }
          } else if (ordStatus !== 'delivered') {
            toast.error('Returns and exchanges are only available for delivered orders.');
            navigate('/dashboard/orders');
            return;
          }

          setOrder(orderRes.data);
          setPickupAddress(orderRes.data.shippingAddress);
        }
      } catch (err) {
        toast.error('Failed to load order');
        navigate('/dashboard/orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrderAndCheckEligibility();
  }, [orderId, navigate]);

  const handleNext1 = () => {
    if (!selectedItem) {
      toast.error('Please select an item to exchange');
      return;
    }
    if (!exchangeReason) {
      toast.error('Please select a reason for exchange');
      return;
    }
    if (exchangeReason === 'Other' && !exchangeReasonOther.trim()) {
      toast.error('Please provide details for the exchange reason');
      return;
    }
    setStep(2);
  };

  const handleNext2 = () => {
    if (exchangeType === 'different_product' && !replacementProduct) {
      toast.error('Please choose a replacement product');
      return;
    }
    setStep(3);
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const openRazorpay = (razorpayOrderId, amountToPay, reqId) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: Math.round(amountToPay * 100),
      currency: 'INR',
      name: 'EventDecor',
      description: 'Exchange Price Difference',
      order_id: razorpayOrderId,
      handler: async function (response) {
        try {
          setSubmitting(true);
          await returnService.verifyExchangePayment({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          toast.success('Payment verified successfully!');
          if (reqId) setSubmittedRequestId(reqId);
          setStep(4);
        } catch (err) {
          toast.error('Payment verification failed');
        } finally {
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: function () {
          toast.error('Payment was cancelled. Click Pay & Confirm to try again.');
          setSubmitting(false);
        },
      },
      theme: { color: '#2A2927' },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    if (pendingPayment) {
      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        toast.error('Failed to load payment gateway');
        setSubmitting(false);
        return;
      }
      openRazorpay(pendingPayment.razorpayOrderId, pendingPayment.amountToPay, submittedRequestId);
      return;
    }

    if (
      diff < 0 &&
      refundMethod === 'original' &&
      order?.paymentMethod === 'cod' &&
      !upiId.trim()
    ) {
      toast.error('Please enter your UPI ID for the refund transfer.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        orderId,
        pickupAddress,
        originalProductId: selectedItem.productId?._id || selectedItem.productId,
        replacementProductId:
          exchangeType === 'different_product' && replacementProduct
            ? replacementProduct._id
            : selectedItem.productId?._id || selectedItem.productId,
        exchangeType: exchangeType === 'different_product' ? 'different_product' : 'variant',
        quantity: quantity,
        reason: exchangeReason === 'Other' ? exchangeReasonOther : exchangeReason,
        idempotencyKey,
        refundMethod: refundMethod || undefined,
        upiId: upiId?.trim() || undefined,
      };

      const res = await returnService.createExchange(payload);
      if (res.data.success) {
        const retReq = res.data.data.returnRequest;
        const excReq = res.data.data.exchangeRequest;
        const reqId = retReq?.returnId || retReq?._id || excReq?.exchangeId || excReq?._id;
        if (reqId) setSubmittedRequestId(reqId);

        if (res.data.data.razorpayOrderId) {
          const { razorpayOrderId, amountToPay } = res.data.data;
          setPendingPayment({ razorpayOrderId, amountToPay });
          const isLoaded = await loadRazorpay();
          if (!isLoaded) {
            toast.error('Failed to load payment gateway');
            setSubmitting(false);
            return;
          }
          openRazorpay(razorpayOrderId, amountToPay, reqId);
        } else {
          toast.success('Exchange request submitted successfully');
          setStep(4);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit exchange');
      setSubmitting(false);
    }
  };

  if (loading) return <ReturnExchangeSkeleton />;

  const renderStepIndicator = () => (
    <div className="mb-8 mt-4">
      <div className="flex items-center gap-1.5 mb-4">
        {[...Array(totalSteps)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-[2px] transition-colors ${i + 1 <= step ? 'bg-[#2A2927]' : 'bg-outline-variant/30'}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[9px] font-bold text-secondary uppercase tracking-widest">
        <span>
          STEP {Math.min(step, totalSteps)} OF {totalSteps}
        </span>
        <span>{stepsList[Math.min(step - 1, totalSteps - 1)]}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-5 text-left text-[11px] text-on-surface">
      <SEO title="Exchange Item | Siri Arts & Crafts" noindex />

      {step <= totalSteps && renderStepIndicator()}

      <AnimatePresence mode="wait">
        {/* STEP 1: ITEM & REASON */}
        {step === 1 && (
          <motion.div
            key="step1"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-6"
          >
            {/* Choose Item */}
            <div>
              <div className="pb-3 mb-4 border-b border-outline-variant/20">
                <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                  <ArrowLeftRight className="text-[12px]" strokeWidth={1.5} />
                  1. SELECT ITEM TO EXCHANGE
                </h2>
              </div>

              <div className="space-y-3">
                {order?.items.map((item) => {
                  const productId = item.productId?._id || item.productId;
                  const isNonExchangeable =
                    item.isNonExchangeable === true ||
                    item.productId?.isNonExchangeable === true ||
                    item.isNonRefundable === true ||
                    item.productId?.isNonRefundable === true;

                  let eligibility = returnState?.items?.find((i) => i.productId === productId);
                  if (isNonExchangeable) {
                    eligibility = { isEligibleForExchange: false, reason: 'Non-Exchangeable Item' };
                  }

                  const isEligible = eligibility?.isEligibleForExchange ?? !isNonExchangeable;
                  const isSelected = selectedItem?._id === item._id;

                  return (
                    <label
                      key={item._id}
                      className={`flex flex-col p-4 border rounded-[16px] transition-all ${
                        !isEligible
                          ? 'opacity-60 bg-surface-container-lowest border-outline-variant/20 cursor-not-allowed'
                          : isSelected
                            ? 'border-[#D4AF37] bg-[#FDFBF7] cursor-pointer shadow-sm ring-1 ring-[#D4AF37]/50'
                            : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <input
                          type="radio"
                          name="exchangeItem"
                          className={`mt-1 w-4 h-4 accent-[#2A2927] cursor-pointer ${
                            !isEligible && 'cursor-not-allowed'
                          }`}
                          checked={isSelected}
                          disabled={!isEligible}
                          onChange={() => {
                            if (isEligible) {
                              setSelectedItem(item);
                              setQuantity(1);
                            }
                          }}
                        />
                        <div className="w-16 h-16 rounded-[12px] overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0">
                          <OptimizedImage
                            src={item.imageSrc || item.productId?.imageSrc}
                            className={`w-full h-full object-cover ${!isEligible && 'grayscale'}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold uppercase tracking-wider text-[#2A2927] text-[10px] truncate">
                            {item.title || item.productId?.title}
                          </h3>
                          <p className="text-[10px] text-secondary mt-1 tracking-wider uppercase font-medium">
                            {item.price ? `₹${item.price.toLocaleString()} • ` : ''}ORDERED QTY:{' '}
                            {item.quantity}
                            {item.variant ? ` • VARIANT: ${item.variant}` : ''}
                          </p>

                          {!isEligible ? (
                            <div className="inline-flex items-center gap-1.5 mt-2 text-error text-[9px] uppercase tracking-widest font-bold">
                              <Ban className="text-[12px]" strokeWidth={1.5} />
                              {eligibility?.reason ||
                                eligibility?.exchangeBadge ||
                                'Non-Exchangeable Item'}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 mt-2 text-success text-[9px] uppercase tracking-widest font-bold">
                              <CheckCircle2 className="text-[12px]" strokeWidth={1.5} />
                              ELIGIBLE FOR EXCHANGE
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                          <span className="text-[9px] uppercase tracking-widest font-bold text-secondary">
                            EXCHANGE QUANTITY
                          </span>
                          <div className="inline-flex items-center bg-[#FDFBF7] border border-outline-variant/40 rounded-xl p-1 shadow-2xs">
                            <button
                              type="button"
                              disabled={quantity <= 1}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setQuantity(Math.max(1, quantity - 1));
                              }}
                              className="w-7 h-7 flex items-center justify-center text-[#2A2927] hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-0"
                              title="Decrease quantity"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-[#2A2927] select-none">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              disabled={quantity >= (item.quantity || 1)}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setQuantity(Math.min(item.quantity || 1, quantity + 1));
                              }}
                              className="w-7 h-7 flex items-center justify-center text-[#2A2927] hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border-0"
                              title="Increase quantity"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Choose Reason */}
            <div className="pt-4">
              <div className="pb-3 mb-4 border-b border-outline-variant/20">
                <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                  <Info className="text-[12px]" strokeWidth={1.5} />
                  2. REASON FOR EXCHANGE
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REASON_OPTIONS.map((reason) => {
                  const isSelected = exchangeReason === reason;
                  return (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 p-3.5 border rounded-[14px] transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#FDFBF7] shadow-sm ring-1 ring-[#D4AF37]/50'
                          : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="exchangeReason"
                        className="w-4 h-4 accent-[#2A2927] cursor-pointer shrink-0"
                        checked={isSelected}
                        onChange={() => setExchangeReason(reason)}
                      />
                      <span className="font-bold uppercase tracking-widest text-[10px] text-[#2A2927] truncate">
                        {reason}
                      </span>
                    </label>
                  );
                })}
              </div>

              {exchangeReason === 'Other' && (
                <div className="mt-4">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-secondary mb-2">
                    Please describe the reason
                  </label>
                  <textarea
                    value={exchangeReasonOther}
                    onChange={(e) => setExchangeReasonOther(e.target.value)}
                    placeholder="Provide additional details..."
                    className="w-full bg-[#FDFBF7] border border-outline-variant/30 rounded-[12px] p-3 text-[11px] text-[#2A2927] focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
                    rows={2}
                  />
                </div>
              )}
            </div>

            <div className="pt-5 flex justify-end border-t border-outline-variant/20 mt-8">
              <button
                onClick={handleNext1}
                className="bg-[#2A2927] hover:bg-black text-white px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 cursor-pointer"
              >
                CONTINUE TO REPLACEMENT <ArrowRight className="text-[14px]" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: REPLACEMENT */}
        {step === 2 && (
          <motion.div
            key="step2"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-6"
          >
            <div className="pb-3 mb-4 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <SlidersHorizontal className="text-[12px]" strokeWidth={1.5} />
                CHOOSE REPLACEMENT ITEM
              </h2>
            </div>

            <div className="space-y-4">
              {/* Option 1: Same product */}
              <label
                className={`flex items-start gap-4 p-4 border rounded-[16px] transition-all cursor-pointer ${
                  exchangeType === 'same'
                    ? 'border-[#D4AF37] bg-[#FDFBF7] shadow-sm ring-1 ring-[#D4AF37]/50'
                    : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'
                }`}
              >
                <input
                  type="radio"
                  name="exchangeType"
                  className="mt-1 w-4 h-4 accent-[#2A2927] cursor-pointer"
                  checked={exchangeType === 'same'}
                  onChange={() => {
                    setExchangeType('same');
                    setReplacementProduct(null);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold uppercase tracking-widest text-[10px] text-[#2A2927]">
                    REPLACE WITH SAME PRODUCT
                  </h3>
                  <p className="text-[9px] uppercase tracking-wider mt-1.5 leading-relaxed text-secondary">
                    Exact same specifications and model. No price difference.
                  </p>
                </div>
              </label>

              {/* Option 2: Different product */}
              <label
                className={`flex items-start gap-4 p-4 border rounded-[16px] transition-all cursor-pointer ${
                  exchangeType === 'different_product'
                    ? 'border-[#D4AF37] bg-[#FDFBF7] shadow-sm ring-1 ring-[#D4AF37]/50'
                    : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'
                }`}
              >
                <input
                  type="radio"
                  name="exchangeType"
                  className="mt-1 w-4 h-4 accent-[#2A2927] cursor-pointer"
                  checked={exchangeType === 'different_product'}
                  onChange={() => {
                    setExchangeType('different_product');
                    if (!replacementProduct) setIsBottomSheetOpen(true);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold uppercase tracking-widest text-[10px] text-[#2A2927]">
                    CHOOSE A DIFFERENT PRODUCT
                  </h3>
                  <p className="text-[9px] uppercase tracking-wider mt-1.5 leading-relaxed text-secondary">
                    Select any other product from our catalog. Price difference will be adjusted.
                  </p>

                  {exchangeType === 'different_product' && (
                    <div className="mt-4">
                      {replacementProduct ? (
                        <div className="flex items-center justify-between gap-3 p-3.5 border border-outline-variant/30 bg-white/80 rounded-[14px] shadow-2xs">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#2A2927] truncate">
                              {replacementProduct.title}
                            </p>
                            <p className="text-[9px] uppercase tracking-widest text-secondary mt-0.5 font-medium">
                              {replacementProduct.price
                                ? `₹${replacementProduct.price.toLocaleString()}`
                                : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsBottomSheetOpen(true);
                              }}
                              className="px-3.5 py-1.5 bg-transparent border border-outline-variant/40 hover:border-[#D4AF37] text-[#2A2927] text-[9px] font-bold uppercase tracking-widest rounded-[32px] transition-all hover:bg-[#FDFBF7] cursor-pointer"
                            >
                              CHANGE
                            </button>
                            <div className="w-12 h-12 rounded-[10px] overflow-hidden bg-surface-container border border-outline-variant/30 shadow-2xs">
                              <OptimizedImage
                                src={replacementProduct.imageSrc}
                                alt={replacementProduct.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsBottomSheetOpen(true);
                          }}
                          className="px-5 py-2.5 bg-transparent border border-outline-variant/40 hover:border-[#D4AF37] text-[#2A2927] text-[9px] font-bold uppercase tracking-widest rounded-[32px] flex items-center gap-1.5 transition-all hover:bg-[#FDFBF7] cursor-pointer"
                        >
                          <Search className="text-[14px]" strokeWidth={1.5} />
                          BROWSE CATALOG TO CHOOSE
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Price Difference Indicator */}
            {exchangeType === 'different_product' && replacementProduct && (
              <div className="border rounded-[16px] border-outline-variant/30 p-4 bg-surface-bright">
                <h3 className="text-[9px] font-bold uppercase tracking-widest text-secondary mb-3 flex items-center gap-1.5 border-b border-outline-variant/20 pb-2.5">
                  <Receipt className="text-[14px]" strokeWidth={1.5} />
                  PRICE DIFFERENCE
                </h3>

                <div className="space-y-2 text-[10px] uppercase tracking-wider">
                  <div className="flex justify-between text-secondary">
                    <span>Original Item Value</span>
                    <span>₹{Math.round(effectivePaidPrice).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-secondary">
                    <span>Replacement Item Price</span>
                    <span>₹{(replacementProduct?.price || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-outline-variant/20 my-2"></div>

                  {diff > 0 ? (
                    <div className="flex justify-between font-bold text-amber-800 bg-amber-50/70 p-2.5 rounded-lg">
                      <span>YOU NEED TO PAY</span>
                      <span>+₹{Math.round(diff).toLocaleString()}</span>
                    </div>
                  ) : diff < 0 ? (
                    <div className="flex justify-between font-bold text-emerald-800 bg-emerald-50/70 p-2.5 rounded-lg">
                      <span>YOU WILL RECEIVE BACK</span>
                      <span>-₹{Math.round(Math.abs(diff)).toLocaleString()}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between font-bold text-[#2A2927] bg-stone-50 p-2.5 rounded-lg">
                      <span>NO PRICE DIFFERENCE</span>
                      <span>₹0</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-5 flex justify-between items-center border-t border-outline-variant/20 mt-8">
              <button
                onClick={() => setStep(1)}
                className="bg-transparent border border-outline-variant/30 text-[#2A2927] px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center transition-all hover:bg-surface-variant/30 cursor-pointer"
              >
                BACK
              </button>
              <button
                onClick={handleNext2}
                disabled={exchangeType === 'different_product' && !replacementProduct}
                className="bg-[#2A2927] hover:bg-black text-white px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 disabled:opacity-50 cursor-pointer"
              >
                REVIEW & CONFIRM <ArrowRight className="text-[14px]" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: REVIEW & CONFIRM */}
        {step === 3 && (
          <motion.div
            key="step3"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-5"
          >
            <div className="pb-3 mb-2 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <Truck className="text-[12px]" strokeWidth={1.5} />
                CONFIRM YOUR EXCHANGE
              </h2>
            </div>

            {/* Items Summary Card */}
            <div className="border rounded-[16px] border-outline-variant/30 p-4 space-y-3 bg-white">
              <h3 className="font-bold uppercase tracking-widest text-[9px] text-secondary">
                EXCHANGE SUMMARY
              </h3>

              <div className="space-y-3 pt-1">
                {/* Original Item */}
                <div className="flex items-center justify-between gap-3 p-3 bg-surface-bright rounded-xl border border-outline-variant/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0 border border-outline-variant/20">
                      <OptimizedImage
                        src={selectedItem?.imageSrc || selectedItem?.productId?.imageSrc}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                        Returning
                      </span>
                      <p className="text-[10px] font-bold text-[#2A2927] truncate mt-1">
                        {selectedItem?.title || selectedItem?.productId?.title}
                      </p>
                      <p className="text-[9px] text-secondary">Qty: {quantity}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-secondary shrink-0">
                    ₹{Math.round(effectivePaidPrice).toLocaleString()}
                  </span>
                </div>

                {/* Replacement Item */}
                <div className="flex items-center justify-between gap-3 p-3 bg-blue-50/40 rounded-xl border border-blue-200/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container shrink-0 border border-outline-variant/20">
                      <OptimizedImage
                        src={
                          exchangeType === 'same'
                            ? selectedItem?.imageSrc || selectedItem?.productId?.imageSrc
                            : replacementProduct?.imageSrc
                        }
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                        Receiving
                      </span>
                      <p className="text-[10px] font-bold text-blue-950 truncate mt-1">
                        {exchangeType === 'same'
                          ? selectedItem?.title || selectedItem?.productId?.title
                          : replacementProduct?.title}
                      </p>
                      <p className="text-[9px] text-blue-700">Qty: {quantity}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-blue-950 shrink-0">
                    ₹
                    {(exchangeType === 'same'
                      ? selectedItem?.price || 0
                      : replacementProduct?.price || 0
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Pickup Address */}
            <div className="border rounded-[16px] border-outline-variant/30 p-4 bg-white">
              <h3 className="font-bold uppercase tracking-widest text-[9px] text-secondary mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-secondary" />
                PICKUP & DELIVERY ADDRESS
              </h3>
              {pickupAddress && (
                <div className="text-[10px] text-secondary uppercase tracking-wider space-y-0.5">
                  <p className="font-bold text-[#2A2927]">{pickupAddress.name}</p>
                  <p>{pickupAddress.address}</p>
                  {(pickupAddress.locality || pickupAddress.landmark) && (
                    <p>
                      {pickupAddress.locality}{' '}
                      {pickupAddress.landmark ? `(Near ${pickupAddress.landmark})` : ''}
                    </p>
                  )}
                  <p>
                    {pickupAddress.city}, {pickupAddress.state} {pickupAddress.pincode}
                  </p>
                  <p className="pt-1 text-[#2A2927] font-medium">PHONE: {pickupAddress.phone}</p>
                </div>
              )}
            </div>

            {/* Financial Settlement: Extra Payment or Refund */}
            {diff > 0 && (
              <div className="border rounded-[16px] border-amber-200 bg-amber-50/50 p-4">
                <h3 className="font-bold uppercase tracking-widest text-[9px] text-amber-900 mb-2">
                  ADDITIONAL PAYMENT REQUIRED
                </h3>
                <p className="text-[11px] font-bold text-amber-950 mb-1">
                  Amount to Pay: ₹{Math.round(diff).toLocaleString()}
                </p>
                <p className="text-[9px] text-amber-800 leading-relaxed">
                  You will pay securely via Razorpay (UPI, Credit/Debit Card, Netbanking) when you
                  click confirm below.
                </p>
              </div>
            )}

            {diff < 0 && (
              <div className="border rounded-[16px] border-outline-variant/30 p-4 bg-white space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                  <h3 className="font-bold uppercase tracking-widest text-[9px] text-secondary">
                    REFUND OF PRICE DIFFERENCE
                  </h3>
                  <span className="text-xs font-bold text-emerald-700">
                    ₹{Math.round(Math.abs(diff)).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-3 p-3 border rounded-[12px] transition-all cursor-pointer ${
                      refundMethod === 'wallet'
                        ? 'border-[#D4AF37] bg-[#FDFBF7] shadow-2xs ring-1 ring-[#D4AF37]/50'
                        : 'bg-white border-[#E8E6E1]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      className="mt-0.5 w-4 h-4 accent-[#2A2927] cursor-pointer"
                      checked={refundMethod === 'wallet'}
                      onChange={() => setRefundMethod('wallet')}
                    />
                    <div>
                      <h4 className="font-bold uppercase tracking-widest text-[10px] text-[#2A2927]">
                        STORE WALLET (INSTANT)
                      </h4>
                      <p className="text-[9px] text-secondary mt-0.5">
                        Credit never expires and can be used on any future order.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 border rounded-[12px] transition-all cursor-pointer ${
                      refundMethod === 'original'
                        ? 'border-[#D4AF37] bg-[#FDFBF7] shadow-2xs ring-1 ring-[#D4AF37]/50'
                        : 'bg-white border-[#E8E6E1]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      className="mt-0.5 w-4 h-4 accent-[#2A2927] cursor-pointer"
                      checked={refundMethod === 'original'}
                      onChange={() => setRefundMethod('original')}
                    />
                    <div className="flex-1">
                      <h4 className="font-bold uppercase tracking-widest text-[10px] text-[#2A2927]">
                        {order?.paymentMethod === 'cod'
                          ? 'DIRECT UPI REFUND (CASH ON DELIVERY)'
                          : 'ORIGINAL PAYMENT METHOD'}
                      </h4>
                      <p className="text-[9px] text-secondary mt-0.5">
                        {order?.paymentMethod === 'cod'
                          ? 'Transferred directly to your UPI ID.'
                          : 'Returned to your bank account (5-7 business days).'}
                      </p>

                      {refundMethod === 'original' && (
                        <div className="mt-3 pt-2.5 border-t border-outline-variant/20">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#2A2927] mb-1">
                            {order?.paymentMethod === 'cod'
                              ? 'YOUR UPI ID *'
                              : 'UPI ID FOR FASTER SETTLEMENT (OPTIONAL)'}
                          </label>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="username@bank or 9876543210@upi"
                            className="w-full bg-white border border-[#E8E6E1] text-[#2A2927] placeholder-secondary/50 px-3.5 py-2 rounded-[24px] text-[10px] focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="pt-5 flex justify-between items-center border-t border-outline-variant/20 mt-8">
              <button
                onClick={() => setStep(2)}
                className="bg-transparent border border-outline-variant/30 text-[#2A2927] px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center transition-all hover:bg-surface-variant/30 cursor-pointer"
                disabled={submitting}
              >
                BACK
              </button>
              <button
                onClick={handleSubmit}
                className="bg-[#2A2927] hover:bg-black text-white px-7 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 disabled:opacity-50 cursor-pointer"
                disabled={submitting}
              >
                {submitting ? (
                  'SUBMITTING...'
                ) : (
                  <>
                    <CheckCircle2 className="text-[14px]" strokeWidth={1.5} />
                    {diff > 0
                      ? `PAY ₹${Math.round(diff).toLocaleString()} & CONFIRM`
                      : 'CONFIRM EXCHANGE'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <motion.div
            key="step-success"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="text-center py-10"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center"
            >
              <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-lg" />
              <div className="relative w-20 h-20 rounded-full bg-[#FDFBF7] border border-emerald-500/30 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.2)] flex items-center justify-center ring-4 ring-emerald-500/10">
                <div className="w-12 h-12 rounded-full bg-linear-to-tr from-emerald-600 via-emerald-500 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
                  <motion.svg
                    className="w-6 h-6 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M20 6L9 17l-5-5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.2, duration: 0.45, ease: 'easeOut' }}
                    />
                  </motion.svg>
                </div>
              </div>
            </motion.div>

            <h2 className="text-[14px] font-bold uppercase tracking-widest text-[#2A2927] mb-2">
              EXCHANGE REQUESTED
            </h2>
            <p className="text-[10px] uppercase tracking-wider text-secondary max-w-md mx-auto mb-8 leading-relaxed">
              We've received your exchange request and our team will review it shortly. You can
              track pickup and replacement progress anytime.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() =>
                  navigate(
                    submittedRequestId
                      ? `/dashboard/returns/${submittedRequestId}`
                      : '/dashboard/returns',
                  )
                }
                className="w-full sm:w-auto bg-[#2A2927] hover:bg-black text-white px-8 py-3 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-lg transition-all border-0 cursor-pointer"
              >
                TRACK EXCHANGE <ArrowRight className="text-[14px]" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => navigate('/dashboard/orders')}
                className="w-full sm:w-auto bg-transparent border border-outline-variant/40 hover:border-black text-[#2A2927] px-6 py-3 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                BACK TO ORDERS
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductSelectionBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        onSelect={(product) => {
          setReplacementProduct(product);
          setIsBottomSheetOpen(false);
        }}
        selectedProductId={replacementProduct?._id}
      />
    </div>
  );
};

export default ExchangeRequestPage;
