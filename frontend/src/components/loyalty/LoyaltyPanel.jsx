const LoyaltySkeleton = () => <div className="animate-pulse bg-gray-200 h-48 rounded-md"></div>;
import { m as motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { loyaltyService } from '../../services/domainServices';
import toast from 'react-hot-toast';

import logger from '../../utils/logger';
export function LoyaltyPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [referralInput, setReferralInput] = useState('');
  const [submittingReferral, setSubmittingReferral] = useState(false);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  const fetchLoyaltyData = async () => {
    setLoading(true);
    try {
      const res = await loyaltyService.getDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      logger.error('Failed to load loyalty dashboard:', err);
      toast.error('Could not fetch wallet details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLoyaltyData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isCouponModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCouponModalOpen]);

  const handleApplyReferral = async (e) => {
    e.preventDefault();
    if (!referralInput.trim()) {
      toast.error('Please enter a valid referral code');
      return;
    }

    setSubmittingReferral(true);
    const toastId = toast.loading('Verifying referral code...');
    try {
      const res = await loyaltyService.applyReferral(referralInput);
      if (res.success) {
        toast.success(res.message, { id: toastId, duration: 5000 });
        setReferralInput('');
        fetchLoyaltyData(); // reload statistics
      } else {
        toast.error(res.message || 'Verification failed', { id: toastId });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid referral code or self-referral.';
      toast.error(errMsg, { id: toastId });
    } finally {
      setSubmittingReferral(false);
    }
  };

  const copyToClipboard = (text, message = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    toast.success(message, {
      icon: '✦',
      style: {
        background: '#121110',
        color: '#d4af37',
        border: '1px solid #d4af37/30',
      },
    });
  };

  if (loading) {
    return <LoyaltySkeleton />;
  }

  if (!data) return null;

  // Curate color palettes for loyalty tiers
  const getTierStyles = (tier) => {
    switch (tier) {
      case 'Platinum':
        return {
          bg: 'bg-gradient-to-tr from-[#302e3b] via-[#484559] to-[#746f8c]',
          border: 'border-[#746f8c]/40',
          text: 'text-[#e2e1e6]',
          badge: 'bg-[#746f8c] text-white',
          glow: 'shadow-[0_0_20px_rgba(116,111,140,0.25)]',
        };
      case 'Gold':
        return {
          bg: 'bg-gradient-to-tr from-[#2d2212] via-[#4c391d] to-[#806132]',
          border: 'border-[#d4af37]/35',
          text: 'text-[#f4e6d4]',
          badge: 'bg-[#d4af37] text-[#121110]',
          glow: 'shadow-[0_0_25px_rgba(212,175,55,0.2)]',
        };
      case 'Silver':
        return {
          bg: 'bg-gradient-to-tr from-[#222426] via-[#3d4247] to-[#6c757d]',
          border: 'border-[#a8b2bd]/40',
          text: 'text-[#f1f3f5]',
          badge: 'bg-[#adb5bd] text-[#212529]',
          glow: 'shadow-[0_0_15px_rgba(173,181,189,0.15)]',
        };
      default: // Bronze starting tier
        return {
          bg: 'bg-gradient-to-tr from-[#241a15] via-[#423126] to-[#6e503f]',
          border: 'border-[#cd7f32]/40',
          text: 'text-[#f5ebec]',
          badge: 'bg-[#cd7f32] text-white',
          glow: 'shadow-none',
        };
    }
  };

  const tier = getTierStyles(data.loyaltyTier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* 1. GAMIFIED TIER CARD SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Luxury Member Pass Card */}
        <div
          className={`lg:col-span-7 rounded-xl border p-6 ${tier.bg} ${tier.border} ${tier.glow} relative overflow-hidden flex flex-col justify-between group`}
        >
          {/* Subtle metallic reflection effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          <div className="absolute top-0 right-0 -translate-y-10 translate-x-10 w-44 h-44 bg-white/5 rounded-full blur-xl pointer-events-none" />

          <div className="flex justify-between items-start z-10 gap-2">
            <div>
              <span
                className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${tier.text} opacity-60 block leading-snug`}
              >
                Bespoke Membership Pass
              </span>
              <h3 className="font-body text-[18px] sm:text-2xl font-bold text-white tracking-widest uppercase mt-1">
                {data.loyaltyTier} MEMBER
              </h3>
            </div>
            <span
              className={`text-[8px] sm:text-[10px] font-bold tracking-widest uppercase px-2 sm:px-3 py-1 rounded-full ${tier.badge} shadow-sm shrink-0 whitespace-nowrap mt-1`}
            >
              ✦ {data.loyaltyTier}
            </span>
          </div>

          <div className="mt-6 mb-5 z-10 flex items-center justify-between gap-1 sm:gap-2">
            <div className="space-y-1 flex-1">
              <span
                className={`text-[8px] sm:text-[9px] uppercase tracking-widest font-bold ${tier.text} opacity-55 block truncate`}
              >
                Siri Pay Wallet
              </span>
              <div className="text-[22px] sm:text-3xl font-display font-light text-white flex items-baseline gap-1">
                <span className="text-sm sm:text-lg">₹</span>
                {data.walletBalance.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="w-[1px] h-10 bg-white/10 shrink-0" />

            <div className="space-y-1 text-right flex-1">
              <span
                className={`text-[8px] sm:text-[9px] uppercase tracking-widest font-bold ${tier.text} opacity-55 block truncate`}
              >
                Bespoke Siri Coins
              </span>
              <div className="text-[18px] sm:text-2xl font-display font-light text-[#ffdf79] flex items-center justify-end gap-1.5">
                <span className="material-symbols-outlined text-xs sm:text-sm">stars</span>
                {data.siriCoins}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[9px] sm:text-[10px] z-10 gap-3 sm:gap-0">
            <div className={`${tier.text} opacity-70 leading-relaxed pr-2`}>
              {data.loyaltyTier === 'Bronze' && '✦ Earn 2% Cashback & 1 Coin per ₹10 spent'}
              {data.loyaltyTier === 'Silver' && '✦ Earn 5% Cashback & 1 Coin per ₹10 spent'}
              {data.loyaltyTier === 'Gold' && '✦ Earn 8% Cashback & 1 Coin per ₹10 spent'}
              {data.loyaltyTier === 'Platinum' &&
                '✦ Earn 12% Platinum Cashback & VIP Priority Perks'}
            </div>
            <span className="font-mono text-[9px] text-white/50 tracking-wider bg-black/20 px-2 py-1 rounded self-start sm:self-auto">
              SIRI-PASS-{data.referralCode?.split('-')[2] || '9999'}
            </span>
          </div>
        </div>

        {/* Loyalty Progression metrics panel */}
        <div className="lg:col-span-5 flex flex-col justify-between pt-4 lg:pt-0 lg:pl-6 lg:border-l border-outline-variant/30">
          <div>
            <h4 className="font-body font-bold text-xs uppercase tracking-widest text-on-surface mb-1">
              VIP Tier Progression
            </h4>
            <span className="text-[10px] text-secondary font-light">
              Upgrade lifetime purchases to unlock higher cashback percentages.
            </span>
          </div>

          {/* Gamified progress bar bar */}
          <div className="my-5 space-y-2">
            <div className="flex justify-between items-baseline text-[10px]">
              <span className="text-secondary font-medium">Progress to {data.nextTier}</span>
              <span className="font-bold text-primary">{data.progressPercentage}%</span>
            </div>

            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${data.progressPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary/70 to-primary rounded-full"
              />
            </div>

            {data.spendRequired > 0 ? (
              <span className="text-[9px] text-secondary font-light block text-center">
                Spend another{' '}
                <strong className="font-semibold text-on-surface">
                  ₹{data.spendRequired.toLocaleString('en-IN')}
                </strong>{' '}
                to unlock {data.nextTier} status!
              </span>
            ) : (
              <span className="text-[9px] text-green-600 font-semibold block text-center">
                🎉 Maximum elite tier reached! Enjoy 12% cashback rewards!
              </span>
            )}
          </div>

          <div className="bg-surface-container-low rounded-lg p-3 text-[10px] text-secondary space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Lifetime Valid Spending:</span>
              <strong className="text-on-surface font-semibold">
                ₹{data.lifetimeSpend.toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Current Referral Count:</span>
              <strong className="text-on-surface font-semibold">{data.referralsCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. REFERRAL & REWARD PROGRAM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-outline-variant/30">
        {/* Refer Friends Panel */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shrink-0">
              <span className="material-symbols-outlined text-sm">share</span>
            </div>
            <div>
              <h4 className="font-body font-bold text-xs uppercase tracking-widest text-on-surface">
                Refer & Earn Siri Cash
              </h4>
              <span className="text-[10px] text-secondary font-light block">
                Share your code. They get{' '}
                <strong className="text-on-surface font-semibold">₹50 welcome cash</strong>. You
                earn <strong className="text-on-surface font-semibold">₹150</strong> on their first
                order!
              </span>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-[9px] uppercase tracking-widest text-secondary font-bold mb-1.5">
              Your Personal Referral Link
            </label>
            <div className="flex bg-surface-container-low border border-outline-variant/30 rounded-lg overflow-hidden p-1 items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono text-on-surface font-medium pl-3 pr-2 truncate select-all">
                {`${window.location.origin}/auth?ref=${data.referralCode}`}
              </span>
              <button
                onClick={() =>
                  copyToClipboard(
                    `${window.location.origin}/auth?ref=${data.referralCode}`,
                    'Referral link copied! Share with your friends.',
                  )
                }
                className="bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer shrink-0"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>

        {/* Claim Referral Bonus */}
        <div className="space-y-4 md:border-l border-outline-variant/30 md:pl-8">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-green-700 border border-green-200 shrink-0">
              <span className="material-symbols-outlined text-sm">redeem</span>
            </div>
            <div>
              <h4 className="font-body font-bold text-xs uppercase tracking-widest text-on-surface">
                Have a Referral Code?
              </h4>
              <span className="text-[10px] text-secondary font-light block">
                Claim ₹50 onboarding wallet credit instantly by entering a friend's referral code.
              </span>
            </div>
          </div>

          <form onSubmit={handleApplyReferral} className="pt-2">
            <label className="block text-[9px] uppercase tracking-widest text-secondary font-bold mb-1.5">
              Friend's Referral Code
            </label>
            <div className="flex bg-surface-container-low border border-outline-variant/30 rounded-lg overflow-hidden p-1 items-center justify-between">
              <input
                type="text"
                disabled={submittingReferral}
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                placeholder="e.g. SIRI-AMB-1080"
                className="flex-1 bg-transparent border-none outline-none text-[10px] sm:text-[11px] font-mono text-on-surface font-medium pl-3 pr-2 placeholder:text-secondary/50 uppercase"
              />
              <button
                type="submit"
                disabled={submittingReferral}
                className="bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer shrink-0 min-w-[80px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReferral ? 'Claiming...' : 'Claim ₹50'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 3. BESPOKE ACTIVE COUPONS CAROUSEL CENTER */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
          <div>
            <h4 className="font-body font-bold text-xs uppercase tracking-widest text-on-surface">
              Promotional Coupons & Voucher Center
            </h4>
            <span className="text-[10px] text-secondary font-light">
              Tap any verified code card below to copy and redeem during checkout.
            </span>
          </div>
          <span className="material-symbols-outlined text-secondary text-sm">local_activity</span>
        </div>

        <div className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[24px]">local_activity</span>
            </div>
            <div className="space-y-0.5">
              <h5 className="font-body text-[13px] font-bold text-on-surface uppercase tracking-wider">
                {data.coupons?.length || 0} Exclusive Vouchers Available
              </h5>
              <p className="text-[10px] text-secondary font-light leading-relaxed">
                Unlock bespoke member discounts and special savings on your next luxury craft
                selection.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCouponModalOpen(true)}
            className="w-full sm:w-auto text-[10px] text-primary border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 font-bold px-5 py-2.5 rounded-lg cursor-pointer uppercase tracking-widest shrink-0 text-center"
          >
            View Available Coupons
          </button>
        </div>
      </div>

      {/* Premium Coupon Selector Modal bottom sheet */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isCouponModalOpen && (
              <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4">
                {/* Backdrop blur */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCouponModalOpen(false)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />

                {/* Bottom Sheet Card */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="relative bg-surface-bright w-full max-w-[500px] rounded-t-[24px] sm:rounded-[24px] p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-[1001]"
                >
                  {/* Pull Indicator for Mobile */}
                  <div className="w-12 h-1.5 bg-outline-variant/60 rounded-full mx-auto mb-6 sm:hidden" />

                  {/* Close Button */}
                  <button
                    onClick={() => setIsCouponModalOpen(false)}
                    className="absolute top-6 right-6 w-8 h-8 min-h-0 rounded-full bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-center hover:bg-surface-container transition-all z-50 cursor-pointer shadow-xs hidden sm:flex"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>

                  {/* Content Container */}
                  <div className="relative z-10 flex flex-col h-full max-h-[75vh]">
                    {/* Header */}
                    <div className="mb-6">
                      <h2 className="text-[20px] font-bold text-on-surface leading-tight mb-1 font-body">
                        Promotional Coupons
                      </h2>
                      <p className="text-secondary text-[12px]">
                        Tap any luxury coupon code to copy and apply at checkout
                      </p>
                    </div>

                    {/* Scrollable Coupons List */}
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-secondary block">
                        Available Offers
                      </span>

                      {!data.coupons || data.coupons.length === 0 ? (
                        <div className="text-center py-10 space-y-2">
                          <span className="material-symbols-outlined text-secondary/40 text-4xl">
                            local_activity
                          </span>
                          <p className="text-xs font-semibold text-secondary/70">
                            No coupons available right now.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {data.coupons.map((coupon) => (
                            <div
                              key={coupon._id || coupon.code}
                              onClick={() => {
                                copyToClipboard(
                                  coupon.code,
                                  `Coupon "${coupon.code}" copied! Paste at checkout.`,
                                );
                              }}
                              className="bg-surface-container-lowest border border-outline-variant/60 hover:border-primary/45 rounded-2xl p-4 transition-all duration-300 flex flex-col gap-3 cursor-pointer group hover:shadow-xs"
                            >
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-on-surface text-[13px] uppercase tracking-wider group-hover:text-primary transition-colors">
                                      {coupon.code}
                                    </span>
                                  </div>
                                  <p className="text-[13px] font-bold text-on-surface leading-snug">
                                    {coupon.discountType === 'percentage'
                                      ? `${coupon.discountValue}% off`
                                      : `₹${coupon.discountValue} off`}
                                    {coupon.maxDiscount ? ` up to ₹${coupon.maxDiscount}` : ''}
                                  </p>
                                  <p className="text-[11px] text-secondary">
                                    On minimum purchase of ₹{coupon.minOrderAmount}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all text-primary bg-primary/10 group-hover:bg-primary/20 flex items-center gap-1.5"
                                >
                                  Copy
                                  <span className="material-symbols-outlined text-[13px]">
                                    content_copy
                                  </span>
                                </button>
                              </div>

                              {/* Expiry Footer */}
                              <div className="flex items-center justify-between border-t border-outline-variant/30 pt-3 mt-1 text-[10px] text-secondary">
                                <span className="font-semibold text-primary group-hover:underline">
                                  TAP TO COPY
                                </span>
                                <span>
                                  Valid till{' '}
                                  {new Date(coupon.expiryDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* 4. WALLET AUDIT TRANSACTION HISTORY TIMELINE */}
      <div className="space-y-4 pt-4 border-t border-outline-variant/30">
        <div className="pb-2">
          <h4 className="font-body font-bold text-xs uppercase tracking-widest text-on-surface">
            Wallet Transaction Ledger
          </h4>
          <span className="text-[10px] text-secondary font-light">
            Auditable double-entry record of all Siri Cash credit and debit events.
          </span>
        </div>

        {data.transactions && data.transactions.length > 0 ? (
          <div className="relative border-l border-outline-variant/50 ml-3.5 pl-6 space-y-5 py-2">
            {data.transactions.map((tx) => {
              const isCredit = tx.type === 'credit';
              return (
                <div key={tx._id} className="relative text-[11px] group">
                  {/* Ledger node marker icon */}
                  <div
                    className={`absolute -left-[33px] top-0 w-4 h-4 rounded-full flex items-center justify-center border-2 ${
                      isCredit
                        ? 'bg-green-50 border-green-500 text-green-600'
                        : 'bg-red-50 border-red-400 text-red-500'
                    }`}
                  >
                    <span className="text-[8px] font-bold font-mono">{isCredit ? '+' : '-'}</span>
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-on-surface font-semibold">{tx.description}</strong>
                        <span
                          className={`text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                            tx.source === 'purchase_cashback'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                              : tx.source === 'referral_bonus'
                                ? 'bg-green-50 text-green-700 border border-green-200/50'
                                : tx.source === 'checkout_redeem'
                                  ? 'bg-red-50 text-red-700 border border-red-200/50'
                                  : 'bg-surface-container text-secondary'
                          }`}
                        >
                          {tx.source}
                        </span>
                      </div>

                      <div className="flex gap-3 text-[9px] text-secondary font-light">
                        <span>
                          {new Date(tx.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {tx.orderId && (
                          <span className="font-mono text-[var(--color-gold-dark)]/80 font-medium">
                            Linked Order: {tx.orderId.invoiceNumber || tx.orderId._id || 'INV-999'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`font-mono text-xs font-bold whitespace-nowrap text-right ${
                        isCredit ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {isCredit ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[11px] text-secondary italic">
            No transactions found. Make purchases, write reviews, or invite friends to accumulate
            Siri Cash!
          </div>
        )}
      </div>
    </motion.div>
  );
}
