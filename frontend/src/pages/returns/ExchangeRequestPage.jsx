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

  // Step 1: Select Item, Step 2: Select Replacement, Step 3: Details & Pickup, Step 4: Success
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const [selectedItem, setSelectedItem] = useState(null);
  const [exchangeType, setExchangeType] = useState('same');
  const [replacementProduct, setReplacementProduct] = useState(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [pickupAddress, setPickupAddress] = useState(null);

  useEffect(() => {
    if (!orderId) {
      toast.error('Order ID is missing');
      navigate('dashboard/orders');
      return;
    }

    const fetchOrder = async () => {
      try {
        const res = await orderService.getById(orderId);
        if (res.success) {
          setOrder(res.data);
          setPickupAddress(res.data.shippingAddress);
        }
      } catch (err) {
        toast.error('Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, navigate]);

  const handleNext1 = () => {
    if (!selectedItem) {
      toast.error('Please select an item to exchange');
      return;
    }
    setStep(2);
  };

  const handleNext2 = () => {
    if (exchangeType === 'different_product' && !replacementProduct) {
      toast.error('Please select a replacement product');
      return;
    }
    setStep(3);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
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
        quantity: 1,
      };

      const res = await returnService.createExchange(payload);
      if (res.data.success) {
        toast.success('Exchange request submitted');
        setStep(4);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit exchange');
    } finally {
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
          STEP {step} OF {totalSteps}
        </span>
        <span>
          {step === 1 && 'SELECT ITEM'}
          {step === 2 && 'EXCHANGE PREFERENCES'}
          {step === 3 && 'VERIFY & SUBMIT'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-5 text-left text-[11px] text-on-surface">
      <SEO title="Exchange Item | EventDecor" />

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
                <span className="material-symbols-outlined text-[12px]">swap_horiz</span>
                SELECT ITEM TO EXCHANGE
              </h2>
            </div>

            <div className="space-y-4">
              {order?.items.map((item) => (
                <label
                  key={item._id}
                  className={`flex items-start gap-4 p-4 border rounded-[16px] transition-all cursor-pointer ${selectedItem?._id === item._id ? 'border-[#D4AF37] bg-[#FDFBF7]' : 'bg-[#FDFBF7] border-[#E8E6E1]  hover:border-[#D4AF37]'}`}
                >
                  <input
                    type="radio"
                    name="exchangeItem"
                    className="mt-1 w-4 h-4 accent-[#2A2927] cursor-pointer"
                    checked={selectedItem?._id === item._id}
                    onChange={() => setSelectedItem(item)}
                  />
                  <div className="w-16 h-16 rounded-[12px] overflow-hidden bg-surface-container shrink-0 border border-outline-variant/20">
                    <OptimizedImage
                      src={item.imageSrc || item.productId?.imageSrc}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold uppercase tracking-wider text-[#2A2927] text-[10px] truncate">
                      {item.title || item.productId?.title}
                    </h3>
                    <p className="text-[9px] uppercase tracking-wider text-secondary mt-1">
                      CURRENT VARIANT: {item.variant || 'DEFAULT'}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-5 flex justify-end border-t border-outline-variant/20 mt-8">
              <button
                onClick={handleNext1}
                className="bg-[#2A2927] hover:bg-black text-white px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 cursor-pointer"
              >
                CONTINUE{' '}
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2 */}
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
                <span className="material-symbols-outlined text-[12px]">tune</span>
                EXCHANGE PREFERENCES
              </h2>
            </div>

            <div className="space-y-4">
              {/* Option 1 */}
              <label
                className={`flex items-start gap-4 p-4 border rounded-[16px] transition-all cursor-pointer ${exchangeType === 'same' ? 'border-[#D4AF37] bg-[#FDFBF7]' : 'bg-[#FDFBF7] border-[#E8E6E1]  hover:border-[#D4AF37]'}`}
              >
                <input
                  type="radio"
                  name="exchangeType"
                  className="mt-0.5 w-4 h-4 accent-[#2A2927] cursor-pointer"
                  checked={exchangeType === 'same'}
                  onChange={() => {
                    setExchangeType('same');
                    setReplacementProduct(null);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold uppercase tracking-widest text-[#2A2927] text-[10px]">
                    REPLACE WITH SAME PRODUCT
                  </h3>
                  <p className="text-[9px] uppercase tracking-wider text-secondary mt-1.5 leading-relaxed">
                    Exact same specifications. No price difference.
                  </p>
                </div>
              </label>

              {/* Option 2 */}
              <label
                className={`flex items-start gap-4 p-4 border rounded-[16px] transition-all cursor-pointer ${exchangeType === 'different_product' ? 'border-[#D4AF37] bg-[#FDFBF7]' : 'bg-[#FDFBF7] border-[#E8E6E1]  hover:border-[#D4AF37]'}`}
              >
                <input
                  type="radio"
                  name="exchangeType"
                  className="mt-0.5 w-4 h-4 accent-[#2A2927] cursor-pointer"
                  checked={exchangeType === 'different_product'}
                  onChange={() => {
                    setExchangeType('different_product');
                    if (!replacementProduct) setIsBottomSheetOpen(true);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold uppercase tracking-widest text-[#2A2927] text-[10px]">
                    CHOOSE ANOTHER PRODUCT
                  </h3>
                  <p className="text-[9px] uppercase tracking-wider text-secondary mt-1.5 leading-relaxed">
                    Select a different item from the catalog.
                  </p>

                  {exchangeType === 'different_product' && (
                    <div className="mt-4">
                      {replacementProduct ? (
                        <div className="flex items-center gap-4 p-3 border border-outline-variant/20 bg-surface-container">
                          <img
                            src={replacementProduct.imageSrc}
                            alt=""
                            className="w-10 h-10 object-cover rounded-[8px] bg-surface-bright"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#2A2927] truncate">
                              {replacementProduct.title}
                            </p>
                            <p className="text-[9px] uppercase tracking-widest text-secondary mt-0.5">
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
                            className="px-4 py-2 bg-transparent border border-outline-variant/30 text-[#2A2927] text-[9px] font-bold uppercase tracking-widest rounded-[32px] transition-all hover:bg-surface-variant/30"
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
                          className="px-5 py-2.5 bg-transparent border border-outline-variant/30 text-[#2A2927] text-[9px] font-bold uppercase tracking-widest rounded-[32px] flex items-center gap-1.5 transition-all hover:bg-surface-variant/30"
                        >
                          <span className="material-symbols-outlined text-[14px]">search</span>
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
                  <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                  PRICE DIFFERENCE SUMMARY
                </h3>

                <div className="space-y-3 text-[10px] uppercase tracking-wider">
                  {(() => {
                    const totalDeductions = (order?.discount || 0) + (order?.walletDeduction || 0);
                    let effectivePaidPrice = selectedItem?.price || 0;

                    if (totalDeductions > 0 && order?.subtotal > 0) {
                      const ratio = effectivePaidPrice / order.subtotal;
                      effectivePaidPrice = Math.max(
                        0,
                        effectivePaidPrice - totalDeductions * ratio,
                      );
                    }

                    const diff = (replacementProduct?.price || 0) - effectivePaidPrice;

                    return (
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
                              You will be redirected to payment on the next step.
                            </p>
                          </>
                        ) : diff < 0 ? (
                          <>
                            <div className="flex justify-between font-bold text-success">
                              <span>REFUND AMOUNT</span>
                              <span>-₹{Math.round(Math.abs(diff)).toLocaleString()}</span>
                            </div>
                            <p className="text-[9px] text-secondary mt-1">
                              Refund will be processed to original payment method.
                            </p>
                          </>
                        ) : (
                          <div className="flex justify-between font-bold text-[#2A2927]">
                            <span>NO PRICE DIFFERENCE</span>
                            <span>₹0</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
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
                CONTINUE{' '}
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
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
                <span className="material-symbols-outlined text-[12px]">local_shipping</span>
                PICKUP & VERIFICATION
              </h2>
            </div>

            <div className="border rounded-[16px] border-outline-variant/30 p-5">
              <h3 className="font-bold uppercase tracking-widest text-[9px] text-[#2A2927] mb-3">
                PICKUP ADDRESS
              </h3>
              {pickupAddress && (
                <div className="text-[10px] text-secondary uppercase tracking-wider leading-relaxed">
                  <p className="font-bold text-[#2A2927]">
                    {pickupAddress.firstName} {pickupAddress.lastName}
                  </p>
                  <p className="mt-1">
                    {pickupAddress.addressLine1}, {pickupAddress.city}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-outline-variant/20">
                <p className="text-[9px] text-secondary font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">info</span>A courier will
                  pick up the old item and deliver the new one.
                </p>
              </div>
            </div>

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
                className="bg-[#2A2927] hover:bg-black text-white px-6 py-2.5 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-sm transition-all border-0 disabled:opacity-50 cursor-pointer"
                disabled={submitting}
              >
                {submitting ? (
                  'SUBMITTING...'
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>{' '}
                    CONFIRM EXCHANGE
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <motion.div
            key="step4"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="text-center py-10"
          >
            <div className="w-16 h-16 bg-[#FDFBF7] text-[#2A2927] flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-[32px]">check</span>
            </div>
            <h2 className="text-[14px] font-bold uppercase tracking-widest text-[#2A2927] mb-3">
              EXCHANGE REQUESTED
            </h2>
            <p className="text-[10px] uppercase tracking-wider text-secondary max-w-md mx-auto mb-8 leading-relaxed">
              We've received your exchange request and our team will review it shortly. You'll
              receive an email confirmation with tracking details.
            </p>
            <button
              onClick={() => navigate('dashboard/orders')}
              className="bg-[#2A2927] hover:bg-black text-white px-8 py-3 rounded-[32px] font-bold uppercase tracking-widest text-[10px] inline-flex items-center justify-center gap-2 shadow-lg transition-all border-0 cursor-pointer"
            >
              BACK TO ORDERS{' '}
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
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
