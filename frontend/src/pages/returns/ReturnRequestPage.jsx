import {
  PackageCheck,
  Ban,
  CheckCircle2,
  ListChecks,
  HelpCircle,
  CreditCard,
  Truck,
  Wallet,
  Landmark,
  Eye,
  Info,
  Check,
  ArrowRight,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { returnService } from '../../services/api/returnService';
import { orderService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { OptimizedImage } from '../../components/ui';
import { ReturnExchangeSkeleton } from '../../components/ui/skeletons/PageSkeletons';
import { SEO } from '../../components/seo/SEO';
import EvidenceUploader from './components/EvidenceUploader';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

const RETURN_REASONS = [
  { value: 'Defective / Damaged', label: 'Damaged', icon: 'broken_image' },
  { value: 'Wrong Item Sent', label: 'Wrong Item', icon: 'swap_horiz' },
  { value: 'Size too small/large', label: 'Size Issue', icon: 'straighten' },
  { value: "Product doesn't match description", label: 'Mismatch', icon: 'difference' },
  { value: 'Changed my mind', label: 'Changed Mind', icon: 'undo' },
  { value: 'Other', label: 'Other', icon: 'more_horiz' },
];

export const ReturnRequestPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [returnState, setReturnState] = useState(null);

  // 7-Step Wizard
  const [step, setStep] = useState(1);
  const totalSteps = 6; // Step 7 is success

  const [selectedItems, setSelectedItems] = useState({}); // { itemId: { ...details } }
  const [refundMethod, setRefundMethod] = useState('original');
  const [upiId, setUpiId] = useState('');
  const [pickupAddress, setPickupAddress] = useState(null);

  const DRAFT_KEY = `return_draft_${orderId}`;

  useEffect(() => {
    if (orderId) {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.selectedItems) setSelectedItems(parsed.selectedItems);
          if (parsed.refundMethod) setRefundMethod(parsed.refundMethod);
          if (parsed.upiId) setUpiId(parsed.upiId);
          if (parsed.step && parsed.step < 7) setStep(parsed.step);
        }
      } catch (e) {}
    }
  }, [orderId, DRAFT_KEY]);

  useEffect(() => {
    if (orderId && step < 7) {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ selectedItems, refundMethod, upiId, step }),
        );
      } catch (e) {}
    }
  }, [orderId, selectedItems, refundMethod, upiId, step, DRAFT_KEY]);

  useEffect(() => {
    if (!orderId) {
      toast.error('Order ID is missing');
      navigate('dashboard/orders');
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
        }
      } catch (err) {
        toast.error('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId, navigate]);

  const handleItemSelect = (item, checked) => {
    if (checked) {
      setSelectedItems((prev) => ({
        ...prev,
        [item._id]: {
          productId: item.productId._id || item.productId,
          returnQuantity: 1,
          maxQuantity: item.quantity,
          condition: '',
          reason: '',
          description: '',
          evidenceImages: [],
          evidenceVideos: [],
          resolution: 'refund',
          title: item.title,
          image: item.imageSrc || item.productId.imageSrc,
          price: item.price,
        },
      }));
    } else {
      const next = { ...selectedItems };
      delete next[item._id];
      setSelectedItems(next);
    }
  };

  const updateItemDetails = (itemId, field, value) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleNext = () => {
    if (step === 1 && Object.keys(selectedItems).length === 0) {
      return toast.error('Please select at least one item');
    }
    if (step === 2 && Object.values(selectedItems).some((item) => !item.condition)) {
      return toast.error('Please assess the condition of all items');
    }
    if (step === 3 && Object.values(selectedItems).some((item) => !item.reason)) {
      return toast.error('Please provide a reason for all items');
    }
    if (step === 5 && refundMethod === 'original' && !upiId.trim()) {
      return toast.error('Please provide a UPI ID for original payment refund');
    }

    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const idempotencyKey = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : Math.random().toString();

      const payload = {
        orderId,
        refundMethod,
        upiId: refundMethod === 'original' ? upiId.trim() : undefined,
        pickupAddress,
        idempotencyKey,
        items: Object.values(selectedItems).map((item) => ({
          productId: item.productId,
          returnQuantity: item.returnQuantity,
          reason: item.reason,
          description: item.description,
          evidenceImages: item.evidenceImages,
          evidenceVideos: item.evidenceVideos,
        })),
      };

      const res = await returnService.createReturn(payload);
      if (res.data.success) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch (e) {}
        toast.success('Return request submitted');
        setStep(7);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ReturnExchangeSkeleton />;
  if (!order) return null;

  const renderStepIndicator = () => (
    <div className="mb-8">
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
          STEP {step} OF {totalSteps}
        </span>
        <span>
          {step === 1 && 'SELECT ITEMS'}
          {step === 2 && 'CONDITION'}
          {step === 3 && 'REASON & EVIDENCE'}
          {step === 4 && 'PICKUP ADDRESS'}
          {step === 5 && 'REFUND METHOD'}
          {step === 6 && 'REVIEW'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl text-left text-[11px] py-5">
      <SEO title="Return Request | Siri Arts & Crafts" noindex />

      {step < 7 && renderStepIndicator()}

      <AnimatePresence mode="wait">
        {/* Step 1: Select Items */}
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
                <PackageCheck className="text-[12px]" strokeWidth={1.5} />
                WHICH ITEMS WOULD YOU LIKE TO RETURN?
              </h2>
            </div>

            <div className="grid gap-4">
              {order.items.map((item) => {
                const productId = item.productId._id || item.productId;
                const isNonRefundable =
                  item.isNonRefundable === true || item.productId?.isNonRefundable === true;

                let eligibility = returnState?.items?.find((i) => i.productId === productId);
                if (isNonRefundable) {
                  eligibility = { isEligibleForReturn: false, reason: 'Non-Returnable Item' };
                }

                const isEligible = eligibility?.isEligibleForReturn ?? !isNonRefundable;
                const isSelected = !!selectedItems[item._id];

                return (
                  <label
                    key={item._id}
                    className={`flex items-start gap-4 p-4 border rounded-[16px] transition-all ${!isEligible ? 'opacity-60 bg-surface-container-lowest border-outline-variant/20 cursor-not-allowed' : isSelected ? 'border-[#D4AF37] bg-[#FDFBF7] cursor-pointer shadow-sm' : 'bg-[#FDFBF7] border-[#E8E6E1]  hover:border-[#D4AF37] cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      className={`mt-1 w-4 h-4 accent-[#2A2927] rounded-sm ${!isEligible && 'cursor-not-allowed'}`}
                      checked={isSelected}
                      disabled={!isEligible}
                      onChange={(e) => isEligible && handleItemSelect(item, e.target.checked)}
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
                      <p className="text-[10px] text-secondary mt-1">
                        ₹{item.price} • QTY: {item.quantity}
                      </p>

                      {!isEligible && eligibility && (
                        <div className="inline-flex items-center gap-1.5 mt-2 text-error text-[9px] uppercase tracking-widest font-bold">
                          <Ban className="text-[12px]" strokeWidth={1.5} />
                          {eligibility.reason}
                        </div>
                      )}

                      {isEligible && (
                        <div className="inline-flex items-center gap-1 mt-2 text-success text-[9px] uppercase tracking-widest font-bold">
                          <CheckCircle2 className="text-[12px]" strokeWidth={1.5} />
                          RETURN WINDOW OPEN
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step 2: Condition Assessment */}
        {step === 2 && (
          <motion.div
            key="step2"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-6"
          >
            <div className="pb-5 mb-5 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <ListChecks className="text-[12px]" strokeWidth={1.5} />
                WHAT IS THE CONDITION OF THE ITEMS?
              </h2>
            </div>
            {Object.entries(selectedItems).map(([itemId, data]) => (
              <div key={itemId} className="p-4 border rounded-[16px] border-outline-variant/30">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-outline-variant/20">
                  <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0">
                    <OptimizedImage
                      src={data.image}
                      alt={data.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="font-bold uppercase tracking-wider text-[#2A2927] text-[10px] flex-1">
                    {data.title}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Unopened & Sealed', 'Opened but Unused', 'Used', 'Damaged/Defective'].map(
                    (cond) => (
                      <div
                        key={cond}
                        onClick={() => updateItemDetails(itemId, 'condition', cond)}
                        className={`p-3 border rounded-[12px] cursor-pointer transition-all text-center uppercase tracking-widest text-[9px] font-bold ${data.condition === cond ? 'bg-[#2A2927] border-[#2A2927] text-white' : 'bg-[#FDFBF7] border-[#E8E6E1]  hover:border-[#D4AF37] text-[#2A2927]'}`}
                      >
                        <span>{cond}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Step 3: Reason & Evidence */}
        {step === 3 && (
          <motion.div
            key="step3"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-6"
          >
            <div className="pb-5 mb-5 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <HelpCircle className="text-[12px]" strokeWidth={1.5} />
                WHY ARE YOU RETURNING THESE?
              </h2>
            </div>
            {Object.entries(selectedItems).map(([itemId, data]) => (
              <div
                key={itemId}
                className="p-4 border rounded-[16px] border-outline-variant/30 space-y-5"
              >
                <div className="flex items-center gap-4 border-b border-outline-variant/20 pb-4">
                  <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0">
                    <OptimizedImage
                      src={data.image}
                      alt={data.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold uppercase tracking-wider text-[#2A2927] text-[10px] block">
                      {data.title}
                    </span>

                    <div className="mt-2 flex items-center gap-3">
                      <label className="text-[9px] uppercase tracking-widest font-bold text-secondary">
                        RETURN QTY
                      </label>
                      <select
                        className="form-field py-1 px-2 text-[10px]"
                        value={data.returnQuantity}
                        onChange={(e) =>
                          updateItemDetails(itemId, 'returnQuantity', parseInt(e.target.value))
                        }
                      >
                        {[...Array(data.maxQuantity)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label mb-2 text-[9px] uppercase tracking-widest font-bold">
                    PRIMARY REASON
                  </label>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {RETURN_REASONS.map((r) => (
                      <div
                        key={r.value}
                        onClick={() => updateItemDetails(itemId, 'reason', r.value)}
                        className={`p-3 border rounded-[12px] cursor-pointer flex flex-col items-center gap-2 text-center transition-all ${data.reason === r.value ? 'bg-[#2A2927] border-[#2A2927] text-white' : 'bg-[#FDFBF7] border-[#E8E6E1] text-secondary  hover:border-[#D4AF37]'}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">{r.icon}</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest">
                          {r.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label mb-2 text-[9px] uppercase tracking-widest font-bold block">
                    ADDITIONAL COMMENTS {data.reason === 'Other' && '*'}
                  </label>
                  <textarea
                    className="form-field resize-none h-20"
                    placeholder="Provide more details..."
                    value={data.description}
                    onChange={(e) => updateItemDetails(itemId, 'description', e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label mb-2 text-[9px] uppercase tracking-widest font-bold block">
                    UPLOAD EVIDENCE (OPTIONAL)
                  </label>
                  <EvidenceUploader
                    images={data.evidenceImages}
                    videos={data.evidenceVideos}
                    onImagesChange={(imgs) => updateItemDetails(itemId, 'evidenceImages', imgs)}
                    onVideosChange={(vids) => updateItemDetails(itemId, 'evidenceVideos', vids)}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Step 4: Pickup */}
        {step === 4 && (
          <motion.div
            key="step4"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-6"
          >
            <div className="pb-5 mb-5 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <Truck className="text-[12px]" strokeWidth={1.5} />
                CONFIRM PICKUP ADDRESS
              </h2>
            </div>
            <div className="border rounded-[16px] border-outline-variant/30 p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#2A2927]"></div>
              {pickupAddress ? (
                <div>
                  <h3 className="font-bold text-[11px] text-[#2A2927] uppercase tracking-wider mb-2">
                    {pickupAddress.name}
                  </h3>
                  <p className="text-[10px] text-secondary leading-relaxed uppercase tracking-wider">
                    {pickupAddress.address}
                  </p>
                  {(pickupAddress.locality || pickupAddress.landmark) && (
                    <p className="text-[10px] text-secondary leading-relaxed uppercase tracking-wider">
                      {pickupAddress.locality}{' '}
                      {pickupAddress.landmark ? `(Near ${pickupAddress.landmark})` : ''}
                    </p>
                  )}
                  <p className="text-[10px] text-secondary leading-relaxed uppercase tracking-wider">
                    {pickupAddress.city}, {pickupAddress.state} {pickupAddress.pincode}
                  </p>
                  <p className="text-[10px] text-secondary mt-2 font-bold uppercase tracking-wider">
                    PHONE: {pickupAddress.phone}
                  </p>
                </div>
              ) : (
                <p className="text-error font-bold uppercase tracking-widest text-[9px]">
                  No address found on order.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 5: Refund */}
        {step === 5 && (
          <motion.div
            key="step5"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-6"
          >
            <div className="pb-5 mb-5 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <Wallet className="text-[12px]" strokeWidth={1.5} />
                SELECT REFUND METHOD
              </h2>
            </div>

            <div className="space-y-4">
              <label
                className={`flex items-start p-4 border rounded-[16px] transition-all cursor-pointer ${refundMethod === 'wallet' ? 'bg-[#2A2927] border-[#2A2927] text-white' : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'}`}
              >
                <input
                  type="radio"
                  name="refundMethod"
                  value="wallet"
                  className="hidden"
                  checked={refundMethod === 'wallet'}
                  onChange={(e) => setRefundMethod(e.target.value)}
                />
                <div className="flex-1">
                  <div
                    className={`font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 ${refundMethod === 'wallet' ? 'text-white' : 'text-[#2A2927]'}`}
                  >
                    <Wallet className="text-[14px]" strokeWidth={1.5} />
                    STORE WALLET (RECOMMENDED)
                  </div>
                  <p
                    className={`text-[9px] uppercase tracking-wider mt-1.5 ${refundMethod === 'wallet' ? 'text-white/80' : 'text-secondary'}`}
                  >
                    Instant refund to your wallet. Use it for your next purchase.
                  </p>
                </div>
              </label>

              <div
                className={`border transition-all overflow-hidden rounded-[16px] ${refundMethod === 'original' ? 'bg-[#2A2927] border-[#2A2927] text-white' : 'bg-[#FDFBF7] border-[#E8E6E1] hover:border-[#D4AF37]'}`}
              >
                <label className="flex items-start p-4 cursor-pointer">
                  <input
                    type="radio"
                    name="refundMethod"
                    value="original"
                    className="hidden"
                    checked={refundMethod === 'original'}
                    onChange={(e) => setRefundMethod(e.target.value)}
                  />
                  <div className="flex-1">
                    <div
                      className={`font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 ${refundMethod === 'original' ? 'text-white' : 'text-[#2A2927]'}`}
                    >
                      <Landmark className="text-[14px]" strokeWidth={1.5} />
                      ORIGINAL PAYMENT METHOD
                    </div>
                    <p
                      className={`text-[9px] uppercase tracking-wider mt-1.5 ${refundMethod === 'original' ? 'text-white/80' : 'text-secondary'}`}
                    >
                      Refund to your original bank account or card (takes 5-7 business days).
                    </p>
                  </div>
                </label>

                <AnimatePresence>
                  {refundMethod === 'original' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4"
                    >
                      <div className="pt-4 border-t border-white/20">
                        <label className="form-label mb-1.5 uppercase tracking-widest text-[9px] text-white/80">
                          UPI ID FOR BANK TRANSFER *
                        </label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="username@bank"
                          className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-2.5 rounded-[32px] text-[11px] focus:outline-none focus:border-white focus:ring-1 focus:ring-white"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 6: Review & Submit */}
        {step === 6 && (
          <motion.div
            key="step6"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="space-y-6"
          >
            <div className="pb-5 mb-5 border-b border-outline-variant/20">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
                <Eye className="text-[12px]" strokeWidth={1.5} />
                REVIEW YOUR REQUEST
              </h2>
            </div>

            <div className="border rounded-[16px] border-outline-variant/30 overflow-hidden">
              <div className="bg-surface-variant/20 p-3 border-b border-outline-variant/20">
                <h3 className="font-bold uppercase tracking-widest text-[9px] text-[#2A2927]">
                  ITEMS TO RETURN
                </h3>
              </div>
              <div className="divide-y divide-outline-variant/20">
                {Object.values(selectedItems).map((data, idx) => (
                  <div key={idx} className="p-4 flex gap-4">
                    <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-surface-container border border-outline-variant/20 shrink-0">
                      <OptimizedImage
                        src={data.image}
                        alt={data.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold uppercase tracking-wider text-[10px] text-[#2A2927]">
                        {data.title}
                      </h4>
                      <p className="text-[9px] uppercase tracking-wider text-secondary mt-1">
                        QTY: {data.returnQuantity} • REASON: {data.reason}
                      </p>
                      <span className="inline-block mt-2 text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[4px] bg-[#2A2927]/5 text-[#2A2927] border border-[#2A2927]/10">
                        REQUESTING REFUND
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="border rounded-[16px] border-outline-variant/30 p-4">
                <h3 className="font-bold uppercase tracking-widest text-[9px] text-[#2A2927] mb-3 flex items-center gap-2">
                  <Truck className="text-[14px]" strokeWidth={1.5} /> PICKUP ADDRESS
                </h3>
                <div className="text-[10px] text-secondary uppercase tracking-wider space-y-1">
                  <p className="font-bold text-[#2A2927] mb-1">{pickupAddress?.name}</p>
                  <p>{pickupAddress?.address}</p>
                  {(pickupAddress?.locality || pickupAddress?.landmark) && (
                    <p>
                      {pickupAddress?.locality}{' '}
                      {pickupAddress?.landmark ? `(Near ${pickupAddress.landmark})` : ''}
                    </p>
                  )}
                  <p>
                    {pickupAddress?.city}, {pickupAddress?.state} {pickupAddress?.pincode}
                  </p>
                  <p className="pt-1 text-[#2A2927] font-medium">PHONE: {pickupAddress?.phone}</p>
                </div>
              </div>

              <div className="border rounded-[16px] border-outline-variant/30 p-4">
                <h3 className="font-bold uppercase tracking-widest text-[9px] text-[#2A2927] mb-3 flex items-center gap-2">
                  <CreditCard className="text-[14px]" strokeWidth={1.5} /> REFUND METHOD
                </h3>
                <div className="text-[10px] text-secondary uppercase tracking-wider space-y-1">
                  <p className="font-bold text-[#2A2927] mb-1">
                    {refundMethod === 'wallet' ? 'STORE WALLET' : 'ORIGINAL PAYMENT'}
                  </p>
                  {refundMethod === 'wallet' ? (
                    <p>INSTANT REFUND</p>
                  ) : (
                    <>
                      <p>5-7 BUSINESS DAYS</p>
                      {upiId && (
                        <p className="pt-1 text-[#2A2927] font-medium break-all">UPI: {upiId}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#2A2927] rounded-[16px] p-4 flex items-start gap-3 shadow-sm">
              <Info className="text-white mt-0.5 text-[14px]" strokeWidth={1.5} />
              <p className="text-[9px] uppercase tracking-wider text-white font-medium leading-relaxed">
                By submitting this request, you agree to our{' '}
                <Link
                  to="/policies/returns"
                  className="underline hover:text-white/80 transition-colors font-bold cursor-pointer"
                >
                  return policy
                </Link>
                . Items must be returned in their original packaging.
              </p>
            </div>
          </motion.div>
        )}

        {/* Step 7: Success */}
        {step === 7 && (
          <motion.div
            key="step7"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="text-center py-10"
          >
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-200">
              <Check className="text-[40px]" strokeWidth={2} />
            </div>
            <h2 className="text-[14px] font-bold uppercase tracking-widest text-[#2A2927] mb-3">
              REQUEST SUBMITTED SUCCESSFULLY
            </h2>
            <p className="text-[10px] uppercase tracking-wider text-secondary max-w-md mx-auto mb-8 leading-relaxed">
              We've received your request and our team will review it shortly. You'll receive an
              email confirmation with tracking details.
            </p>
            <button
              onClick={() => navigate('/dashboard/returns')}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-lg transition-all border-0 cursor-pointer"
            >
              TRACK RETURN STATUS <ArrowRight className="text-[14px]" strokeWidth={1.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Controls */}
      {step < 7 && (
        <div className="mt-8 pt-5 border-t border-outline-variant/20 flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="bg-transparent border border-outline-variant/30 text-[#2A2927] px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center transition-all hover:bg-surface-variant/30 disabled:opacity-50 cursor-pointer"
              disabled={submitting}
            >
              BACK
            </button>
          ) : (
            <div></div>
          )}

          <button
            onClick={step === 6 ? handleSubmit : handleNext}
            className="bg-[#2A2927] hover:bg-black text-white px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 disabled:opacity-50 cursor-pointer"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[14px]">
                  progress_activity
                </span>{' '}
                PROCESSING
              </>
            ) : step === 6 ? (
              'SUBMIT REQUEST'
            ) : (
              <>
                CONTINUE <ArrowRight className="text-[14px]" strokeWidth={1.5} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReturnRequestPage;
