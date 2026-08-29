import {
  ArrowLeftRight,
  ArrowRight,
  SlidersHorizontal,
  Search,
  Receipt,
  Truck,
  Info,
  CheckCircle2,
  Check,
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

export const ExchangeRequestPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [exchangeReason, setExchangeReason] = useState('');
  const [exchangeReasonOther, setExchangeReasonOther] = useState('');
  const [exchangeType, setExchangeType] = useState('same');
  const [replacementProduct, setReplacementProduct] = useState(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [pickupAddress, setPickupAddress] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

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

  const [refundMethod, setRefundMethod] = useState('original');

  const stepsList = ['SELECT ITEM', 'REASON', 'EXCHANGE PREFERENCES'];
  if (Math.abs(diff) > 0) stepsList.push('PRICE ADJUSTMENT');
  stepsList.push('VERIFY & SUBMIT');
  const totalSteps = stepsList.length;

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
          // If stateRes exists, check if exchange is allowed globally
          if (stateRes && stateRes.data && stateRes.data.success) {
            const state = stateRes.data.data;
            if (state.orderStatus !== 'Delivered') {
              toast.error('Returns/Exchanges are only available for delivered orders.');
              navigate('/dashboard/orders');
              return;
            }
            if (!state.canInitiateExchange) {
              toast.error(state.reasonIfBlocked || 'This order is not eligible for exchange.');
              navigate('/dashboard/orders');
              return;
            }
          } else if (orderRes.data.orderStatus !== 'Delivered') {
            // Fallback check
            toast.error('Returns/Exchanges are only available for delivered orders.');
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
    setStep(2);
  };

  const handleNextReason = () => {
    if (!exchangeReason) {
      toast.error('Please select a reason for exchange');
      return;
    }
    if (exchangeReason === 'Other' && !exchangeReasonOther.trim()) {
      toast.error('Please provide details for the exchange reason');
      return;
    }
    setStep(3);
  };

  const handleNext2 = () => {
    if (exchangeType === 'different_product' && !replacementProduct) {
      toast.error('Please select a replacement product');
      return;
    }
    setStep(4);
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

  const openRazorpay = (razorpayOrderId, amountToPay) => {
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
          toast.success('Payment successful and exchange submitted');
          setStep(totalSteps + 1);
        } catch (err) {
          toast.error('Payment verification failed');
        } finally {
          setSubmitting(false);
        }
      },
      modal: {
        ondismiss: function () {
          toast.error('Payment cancelled. Click Pay & Confirm to try again.');
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
      openRazorpay(pendingPayment.razorpayOrderId, pendingPayment.amountToPay);
      return;
    }

    try {
      const payload = {
        orderId,
        pickupAddress,
        originalProductId: selectedItem.productId._id || selectedItem.productId,
        replacementProductId:
          exchangeType === 'different_product' && replacementProduct
            ? replacementProduct._id
            : selectedItem.productId._id || selectedItem.productId,
        exchangeType: exchangeType === 'different_product' ? 'different_product' : 'variant',
        quantity: quantity,
        reason: exchangeReason === 'Other' ? exchangeReasonOther : exchangeReason,
        idempotencyKey,
        refundMethod: diff < 0 ? refundMethod : undefined,
      };

      const res = await returnService.createExchange(payload);
      if (res.data.success) {
        if (res.data.data.razorpayOrderId) {
          const { razorpayOrderId, amountToPay } = res.data.data;
          setPendingPayment({ razorpayOrderId, amountToPay });
          const isLoaded = await loadRazorpay();
          if (!isLoaded) {
            toast.error('Failed to load payment gateway');
            setSubmitting(false);
            return;
          }
          openRazorpay(razorpayOrderId, amountToPay);
        } else {
          toast.success('Exchange request submitted');
          setStep(totalSteps + 1);
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

      {step < 4 && renderStepIndicator()}

      <AnimatePresence mode="wait">
        {/* STEP 1 */}
        {step === 1 && (
          <motion.div
            key="step1"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-4"
          >
            <div className="pb-5 mb-5 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <ArrowLeftRight className="text-[12px]" strokeWidth={1.5} />
                SELECT ITEM TO EXCHANGE
              </h2>
            </div>

            <div className="space-y-4">
              {order?.items.map((item) => (
                <label
                  key={item._id}
                  className={`flex items-start gap-4 p-4 border rounded-[16px] transition-all cursor-pointer ${selectedItem?._id === item._id ? 'bg-[#2A2927] border-[#2A2927] text-white shadow-sm' : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'}`}
                >
                  <input
                    type="radio"
                    name="exchangeItem"
                    className="hidden"
                    checked={selectedItem?._id === item._id}
                    onChange={() => setSelectedItem(item)}
                  />
                  <div
                    className={`w-16 h-16 rounded-[12px] overflow-hidden bg-surface-container shrink-0 border ${selectedItem?._id === item._id ? 'border-white/20' : 'border-outline-variant/20'}`}
                  >
                    <OptimizedImage
                      src={item.imageSrc || item.productId?.imageSrc}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3
                      className={`font-bold uppercase tracking-wider text-[10px] truncate ${selectedItem?._id === item._id ? 'text-white' : 'text-[#2A2927]'}`}
                    >
                      {item.title || item.productId?.title}
                    </h3>
                    <p
                      className={`text-[9px] uppercase tracking-wider mt-1 ${selectedItem?._id === item._id ? 'text-white/80' : 'text-secondary'}`}
                    >
                      CURRENT VARIANT: {item.variant || 'DEFAULT'}
                    </p>
                    {selectedItem?._id === item._id && (
                      <div className="mt-4 flex items-center gap-3 bg-black/20 p-2 rounded-xl inline-flex w-auto border border-white/10">
                        <span className="text-[9px] font-bold text-white uppercase tracking-widest pl-2">
                          QTY:
                        </span>
                        <div className="flex items-center bg-white/10 rounded-full">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setQuantity(Math.max(1, quantity - 1));
                            }}
                            className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer border-0"
                          >
                            -
                          </button>
                          <span className="text-[10px] font-bold text-white w-6 text-center leading-none">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setQuantity(Math.min(item.quantity || 1, quantity + 1));
                            }}
                            className="w-7 h-7 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors cursor-pointer border-0"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-5 flex justify-end border-t border-outline-variant/20 mt-8">
              <button
                onClick={handleNext1}
                className="bg-[#2A2927] hover:bg-black text-white px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 cursor-pointer"
              >
                CONTINUE <ArrowRight className="text-[14px]" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2 - REASON */}
        {step === 2 && (
          <motion.div
            key="step2"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-4"
          >
            <div className="pb-5 mb-5 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <Info className="text-[12px]" strokeWidth={1.5} />
                EXCHANGE REASON
              </h2>
            </div>

            <div className="space-y-3">
              {[
                'Wrong size / fit',
                'Product damaged on arrival',
                'Product defective / not working',
                'Product not as described',
                'Need a different variant',
                'Other',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-start p-4 border rounded-[16px] transition-all cursor-pointer ${exchangeReason === reason ? 'bg-[#2A2927] border-[#2A2927] text-white shadow-sm' : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'}`}
                >
                  <input
                    type="radio"
                    name="exchangeReason"
                    className="hidden"
                    checked={exchangeReason === reason}
                    onChange={() => setExchangeReason(reason)}
                  />
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-bold uppercase tracking-widest text-[10px] ${exchangeReason === reason ? 'text-white' : 'text-[#2A2927]'}`}
                    >
                      {reason.toUpperCase()}
                    </h3>
                  </div>
                </label>
              ))}

              {exchangeReason === 'Other' && (
                <div className="mt-4">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-secondary mb-2">
                    Tell us more
                  </label>
                  <textarea
                    value={exchangeReasonOther}
                    onChange={(e) => setExchangeReasonOther(e.target.value)}
                    placeholder="Please explain the reason for exchange..."
                    className="w-full bg-[#FDFBF7] border border-outline-variant/30 rounded-[12px] p-4 text-[11px] text-[#2A2927] focus:outline-none focus:border-[#D4AF37] transition-colors resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="pt-5 flex justify-between items-center border-t border-outline-variant/20 mt-8">
              <button
                onClick={() => setStep(1)}
                className="bg-transparent border border-outline-variant/30 text-[#2A2927] px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center transition-all hover:bg-surface-variant/30 cursor-pointer"
              >
                BACK
              </button>
              <button
                onClick={handleNextReason}
                className="bg-[#2A2927] hover:bg-black text-white px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 cursor-pointer"
              >
                CONTINUE <ArrowRight className="text-[14px]" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3 - EXCHANGE PREFERENCES */}
        {step === 3 && (
          <motion.div
            key="step2"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-4"
          >
            <div className="pb-5 mb-5 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <SlidersHorizontal className="text-[12px]" strokeWidth={1.5} />
                EXCHANGE PREFERENCES
              </h2>
            </div>

            <div className="space-y-4">
              {/* Option 1 */}
              <label
                className={`flex items-start p-4 border rounded-[16px] transition-all cursor-pointer ${exchangeType === 'same' ? 'bg-[#2A2927] border-[#2A2927] text-white shadow-sm' : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'}`}
              >
                <input
                  type="radio"
                  name="exchangeType"
                  className="hidden"
                  checked={exchangeType === 'same'}
                  onChange={() => {
                    setExchangeType('same');
                    setReplacementProduct(null);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-bold uppercase tracking-widest text-[10px] ${exchangeType === 'same' ? 'text-white' : 'text-[#2A2927]'}`}
                  >
                    REPLACE WITH SAME PRODUCT
                  </h3>
                  <p
                    className={`text-[9px] uppercase tracking-wider mt-1.5 leading-relaxed ${exchangeType === 'same' ? 'text-white/80' : 'text-secondary'}`}
                  >
                    Exact same specifications. No price difference.
                  </p>
                </div>
              </label>

              {/* Option 2 */}
              <label
                className={`flex items-start p-4 border rounded-[16px] transition-all cursor-pointer ${exchangeType === 'different_product' ? 'bg-[#2A2927] border-[#2A2927] text-white shadow-sm' : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'}`}
              >
                <input
                  type="radio"
                  name="exchangeType"
                  className="hidden"
                  checked={exchangeType === 'different_product'}
                  onChange={() => {
                    setExchangeType('different_product');
                    if (!replacementProduct) setIsBottomSheetOpen(true);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-bold uppercase tracking-widest text-[10px] ${exchangeType === 'different_product' ? 'text-white' : 'text-[#2A2927]'}`}
                  >
                    CHOOSE ANOTHER PRODUCT
                  </h3>
                  <p
                    className={`text-[9px] uppercase tracking-wider mt-1.5 leading-relaxed ${exchangeType === 'different_product' ? 'text-white/80' : 'text-secondary'}`}
                  >
                    Select a different item from the catalog.
                  </p>

                  {exchangeType === 'different_product' && (
                    <div className="mt-4">
                      {replacementProduct ? (
                        <div className="flex items-center gap-4 p-3 border border-white/20 bg-white/5 rounded-[12px]">
                          <div className="w-12 h-12 shrink-0 rounded-[8px] overflow-hidden bg-white/10 border border-white/20">
                            <OptimizedImage
                              src={replacementProduct.imageSrc}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-white truncate">
                              {replacementProduct.title}
                            </p>
                            <p className="text-[9px] uppercase tracking-widest text-white/60 mt-0.5">
                              SELECTED REPLACEMENT
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsBottomSheetOpen(true);
                            }}
                            className="shrink-0 px-4 py-2 bg-transparent border border-white/30 text-white text-[9px] font-bold uppercase tracking-widest rounded-[32px] transition-all hover:bg-white/10"
                          >
                            CHANGE
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsBottomSheetOpen(true);
                          }}
                          className="px-5 py-2.5 bg-transparent border border-white/30 text-white text-[9px] font-bold uppercase tracking-widest rounded-[32px] flex items-center gap-1.5 transition-all hover:bg-white/10"
                        >
                          <Search className="text-[14px]" strokeWidth={1.5} />
                          BROWSE CATALOG
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Price Difference Summary */}
            {exchangeType === 'different_product' && replacementProduct && (
              <div className="border rounded-[16px] border-outline-variant/30 p-4 mt-4">
                <h3 className="text-[9px] font-bold uppercase tracking-widest text-secondary mb-4 flex items-center gap-1.5 border-b border-outline-variant/20 pb-3">
                  <Receipt className="text-[14px]" strokeWidth={1.5} />
                  PRICE DIFFERENCE SUMMARY
                </h3>

                <div className="space-y-3 text-[10px] uppercase tracking-wider">
                  <>
                    <div className="flex justify-between text-secondary">
                      <span>AMOUNT PAID FOR ITEM</span>
                      <span>₹{Math.round(effectivePaidPrice).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-secondary">
                      <span>REPLACEMENT ITEM PRICE</span>
                      <span>₹{(replacementProduct?.price || 0).toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-outline-variant/20 my-2"></div>

                    {diff > 0 ? (
                      <>
                        <div className="flex justify-between font-bold text-[#2A2927]">
                          <span>ADDITIONAL PAYMENT REQUIRED</span>
                          <span>+₹{Math.round(diff).toLocaleString()}</span>
                        </div>
                        <p className="text-[9px] text-secondary mt-1">
                          Online Payment via Razorpay required in the next step.
                        </p>
                      </>
                    ) : diff < 0 ? (
                      <>
                        <div className="flex justify-between font-bold text-success">
                          <span>REFUND AMOUNT</span>
                          <span>-₹{Math.round(Math.abs(diff)).toLocaleString()}</span>
                        </div>
                        <p className="text-[9px] text-secondary mt-1">
                          Select your refund method in the next step.
                        </p>
                      </>
                    ) : (
                      <div className="flex justify-between font-bold text-[#2A2927]">
                        <span>NO PRICE DIFFERENCE</span>
                        <span>₹0</span>
                      </div>
                    )}
                  </>
                </div>
              </div>
            )}

            <div className="pt-5 flex justify-between items-center border-t border-outline-variant/20 mt-8">
              <button
                onClick={() => setStep(2)}
                className="bg-transparent border border-outline-variant/30 text-[#2A2927] px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center transition-all hover:bg-surface-variant/30 cursor-pointer"
              >
                BACK
              </button>
              <button
                onClick={handleNext2}
                disabled={exchangeType === 'different_product' && !replacementProduct}
                className="bg-[#2A2927] hover:bg-black text-white px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 disabled:opacity-50 cursor-pointer"
              >
                CONTINUE <ArrowRight className="text-[14px]" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4 (Conditional) - PRICE ADJUSTMENT */}
        {step === 4 && Math.abs(diff) > 0 && (
          <motion.div
            key="step3"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-4"
          >
            <div className="pb-5 mb-5 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <Receipt className="text-[12px]" strokeWidth={1.5} />
                PRICE ADJUSTMENT
              </h2>
            </div>

            {diff > 0 ? (
              <div className="border rounded-[16px] border-outline-variant/30 p-5">
                <h3 className="font-bold uppercase tracking-widest text-[9px] text-[#2A2927] mb-3">
                  PAYMENT METHOD
                </h3>
                <label className="flex items-start p-4 border rounded-[16px] transition-all cursor-pointer bg-[#2A2927] border-[#2A2927] text-white shadow-sm">
                  <input type="radio" className="hidden" checked readOnly />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold uppercase tracking-widest text-[10px] text-white">
                      ONLINE PAYMENT (RAZORPAY)
                    </h3>
                    <p className="text-[9px] uppercase tracking-wider mt-1.5 leading-relaxed text-white/80">
                      Pay securely via UPI, Credit/Debit Card, or Netbanking.
                    </p>
                  </div>
                </label>
                <div className="mt-4 pt-4 border-t border-outline-variant/20">
                  <p className="text-[9px] text-secondary font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Info className="text-[14px]" strokeWidth={1.5} />
                    You will pay ₹{Math.round(diff).toLocaleString()} upon submission.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border rounded-[16px] border-outline-variant/30 p-5">
                <h3 className="font-bold uppercase tracking-widest text-[9px] text-[#2A2927] mb-3">
                  REFUND METHOD
                </h3>
                <div className="space-y-4">
                  <label
                    className={`flex items-start p-4 border rounded-[16px] transition-all cursor-pointer ${refundMethod === 'wallet' ? 'bg-[#2A2927] border-[#2A2927] text-white shadow-sm' : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'}`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      className="hidden"
                      checked={refundMethod === 'wallet'}
                      onChange={() => setRefundMethod('wallet')}
                    />
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-bold uppercase tracking-widest text-[10px] ${refundMethod === 'wallet' ? 'text-white' : 'text-[#2A2927]'}`}
                      >
                        STORE WALLET (INSTANT)
                      </h3>
                      <p
                        className={`text-[9px] uppercase tracking-wider mt-1.5 leading-relaxed ${refundMethod === 'wallet' ? 'text-white/80' : 'text-secondary'}`}
                      >
                        Fastest refund. Credits never expire and can be used for any future
                        purchase.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start p-4 border rounded-[16px] transition-all ${order?.paymentMethod === 'cod' ? 'opacity-50 cursor-not-allowed bg-surface-variant/20 border-outline-variant/20' : `cursor-pointer ${refundMethod === 'original' ? 'bg-[#2A2927] border-[#2A2927] text-white shadow-sm' : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'}`}`}
                  >
                    <input
                      type="radio"
                      name="refundMethod"
                      className="hidden"
                      checked={refundMethod === 'original'}
                      onChange={() => {
                        if (order?.paymentMethod !== 'cod') setRefundMethod('original');
                      }}
                      disabled={order?.paymentMethod === 'cod'}
                    />
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-bold uppercase tracking-widest text-[10px] ${refundMethod === 'original' ? 'text-white' : 'text-[#2A2927]'}`}
                      >
                        ORIGINAL PAYMENT METHOD
                      </h3>
                      <p
                        className={`text-[9px] uppercase tracking-wider mt-1.5 leading-relaxed ${refundMethod === 'original' ? 'text-white/80' : 'text-secondary'}`}
                      >
                        {order?.paymentMethod === 'cod'
                          ? 'Not available for Cash on Delivery orders.'
                          : 'Refund to source account (5-7 business days).'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="pt-5 flex justify-between items-center border-t border-outline-variant/20 mt-8">
              <button
                onClick={() => setStep(3)}
                className="bg-transparent border border-outline-variant/30 text-[#2A2927] px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center transition-all hover:bg-surface-variant/30 cursor-pointer"
              >
                BACK
              </button>
              <button
                onClick={() => setStep(totalSteps)}
                className="bg-[#2A2927] hover:bg-black text-white px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 cursor-pointer"
              >
                CONTINUE <ArrowRight className="text-[14px]" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}

        {/* VERIFY & SUBMIT (Always last active step) */}
        {step === totalSteps && (
          <motion.div
            key="step-submit"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-4"
          >
            <div className="pb-5 mb-5 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <Truck className="text-[12px]" strokeWidth={1.5} />
                PICKUP & VERIFICATION
              </h2>
            </div>

            <div className="border rounded-[16px] border-outline-variant/30 p-5">
              <h3 className="font-bold uppercase tracking-widest text-[9px] text-[#2A2927] mb-3">
                PICKUP ADDRESS
              </h3>
              {pickupAddress && (
                <div className="text-[10px] text-secondary uppercase tracking-wider space-y-1">
                  <p className="font-bold text-[#2A2927] mb-1">{pickupAddress.name}</p>
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

              <div className="mt-4 pt-4 border-t border-outline-variant/20">
                <p className="text-[9px] text-secondary font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Info className="text-[14px]" strokeWidth={1.5} />A courier will pick up the old
                  item and deliver the new one.
                </p>
              </div>
            </div>

            <div className="pt-5 flex justify-between items-center border-t border-outline-variant/20 mt-8">
              <button
                onClick={() => setStep(totalSteps - 1)}
                className="bg-transparent border border-outline-variant/30 text-[#2A2927] px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center transition-all hover:bg-surface-variant/30 cursor-pointer"
                disabled={submitting}
              >
                BACK
              </button>
              <button
                onClick={handleSubmit}
                className="bg-[#2A2927] hover:bg-black text-white px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 disabled:opacity-50 cursor-pointer"
                disabled={submitting}
              >
                {submitting ? (
                  'SUBMITTING...'
                ) : (
                  <>
                    <CheckCircle2 className="text-[14px]" strokeWidth={1.5} />{' '}
                    {diff > 0 ? 'PAY & CONFIRM' : 'CONFIRM EXCHANGE'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* SUCCESS */}
        {step === totalSteps + 1 && (
          <motion.div
            key="step-success"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="text-center py-10"
          >
            <div className="w-16 h-16 bg-[#FDFBF7] text-[#2A2927] flex items-center justify-center mx-auto mb-6">
              <Check className="text-[32px]" strokeWidth={1.5} />
            </div>
            <h2 className="text-[14px] font-bold uppercase tracking-widest text-[#2A2927] mb-3">
              EXCHANGE REQUESTED
            </h2>
            <p className="text-[10px] uppercase tracking-wider text-secondary max-w-md mx-auto mb-8 leading-relaxed">
              We've received your exchange request and our team will review it shortly. You'll
              receive an email confirmation with tracking details.
            </p>
            <button
              onClick={() => navigate('/dashboard/orders')}
              className="bg-[#2A2927] hover:bg-black text-white px-8 py-3 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-lg transition-all border-0 cursor-pointer"
            >
              BACK TO ORDERS <ArrowRight className="text-[14px]" strokeWidth={1.5} />
            </button>
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
