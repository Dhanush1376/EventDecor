import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loyaltyService } from '../../services/domainServices';
import toast from 'react-hot-toast';

import logger from '../../utils/logger';
export function LoyaltyPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [referralInput, setReferralInput] = useState('');
  const [submittingReferral, setSubmittingReferral] = useState(false);

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
        border: '1px solid #d4af37/30'
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-[11px] uppercase tracking-widest text-secondary font-semibold">
          Synchronizing Luxury Wallet Ledger...
        </span>
      </div>
    );
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
          glow: 'shadow-[0_0_20px_rgba(116,111,140,0.25)]'
        };
      case 'Gold':
        return {
          bg: 'bg-gradient-to-tr from-[#2d2212] via-[#4c391d] to-[#806132]',
          border: 'border-[#d4af37]/35',
          text: 'text-[#f4e6d4]',
          badge: 'bg-[#d4af37] text-[#121110]',
          glow: 'shadow-[0_0_25px_rgba(212,175,55,0.2)]'
        };
      case 'Silver':
        return {
          bg: 'bg-gradient-to-tr from-[#222426] via-[#3d4247] to-[#6c757d]',
          border: 'border-[#a8b2bd]/40',
          text: 'text-[#f1f3f5]',
          badge: 'bg-[#adb5bd] text-[#212529]',
          glow: 'shadow-[0_0_15px_rgba(173,181,189,0.15)]'
        };
      default: // Bronze starting tier
        return {
          bg: 'bg-gradient-to-tr from-[#241a15] via-[#423126] to-[#6e503f]',
          border: 'border-[#cd7f32]/40',
          text: 'text-[#f5ebec]',
          badge: 'bg-[#cd7f32] text-white',
          glow: 'shadow-none'
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
        <div className={`lg:col-span-7 rounded-xl border p-6 ${tier.bg} ${tier.border} ${tier.glow} relative overflow-hidden flex flex-col justify-between group`}>
          {/* Subtle metallic reflection effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          <div className="absolute top-0 right-0 -translate-y-10 translate-x-10 w-44 h-44 bg-white/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex justify-between items-start z-10 gap-2">
            <div>
              <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${tier.text} opacity-60 block leading-snug`}>
                Bespoke Membership Pass
              </span>
              <h3 className="font-display text-[18px] sm:text-2xl font-light text-white tracking-widest uppercase mt-1">
                {data.loyaltyTier} MEMBER
              </h3>
            </div>
            <span className={`text-[8px] sm:text-[10px] font-bold tracking-widest uppercase px-2 sm:px-3 py-1 rounded-full ${tier.badge} shadow-sm shrink-0 whitespace-nowrap mt-1`}>
              ✦ {data.loyaltyTier}
            </span>
          </div>

          <div className="mt-6 mb-5 z-10 flex items-center justify-between gap-1 sm:gap-2">
            <div className="space-y-1 flex-1">
              <span className={`text-[8px] sm:text-[9px] uppercase tracking-widest font-bold ${tier.text} opacity-55 block truncate`}>
                Siri Pay Wallet
              </span>
              <div className="text-[22px] sm:text-3xl font-display font-light text-white flex items-baseline gap-1">
                <span className="text-sm sm:text-lg">₹</span>
                {data.walletBalance.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="w-[1px] h-10 bg-white/10 shrink-0" />

            <div className="space-y-1 text-right flex-1">
              <span className={`text-[8px] sm:text-[9px] uppercase tracking-widest font-bold ${tier.text} opacity-55 block truncate`}>
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
              {data.loyaltyTier === 'Platinum' && '✦ Earn 12% Platinum Cashback & VIP Priority Perks'}
            </div>
            <span className="font-mono text-[9px] text-white/50 tracking-wider bg-black/20 px-2 py-1 rounded self-start sm:self-auto">SIRI-PASS-{data.referralCode?.split('-')[2] || '9999'}</span>
          </div>
        </div>

        {/* Loyalty Progression metrics panel */}
        <div className="lg:col-span-5 flex flex-col justify-between pt-4 lg:pt-0 lg:pl-6 lg:border-l border-outline-variant/30">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface mb-1">
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
                Spend another <strong className="font-semibold text-on-surface">₹{data.spendRequired.toLocaleString('en-IN')}</strong> to unlock {data.nextTier} status!
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
              <strong className="text-on-surface font-semibold">₹{data.lifetimeSpend.toLocaleString('en-IN')}</strong>
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
              <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface">
                Refer & Earn Siri Cash
              </h4>
              <span className="text-[10px] text-secondary font-light block">
                Share your code. They get <strong className="text-on-surface font-semibold">₹50 welcome cash</strong>. You earn <strong className="text-on-surface font-semibold">₹150</strong> on their first order!
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
                onClick={() => copyToClipboard(`${window.location.origin}/auth?ref=${data.referralCode}`, 'Referral link copied! Share with your friends.')}
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
              <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface">
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
            <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface">
              Promotional Coupons & Voucher Center
            </h4>
            <span className="text-[10px] text-secondary font-light">
              Tap any verified code card below to copy and redeem during checkout.
            </span>
          </div>
          <span className="material-symbols-outlined text-secondary text-sm">local_activity</span>
        </div>

        {data.coupons && data.coupons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {data.coupons.map((coupon) => (
              <motion.div
                key={coupon._id || coupon.code}
                whileHover={{ y: -2 }}
                onClick={() => copyToClipboard(coupon.code, `Coupon "${coupon.code}" copied! Paste at checkout.`)}
                className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 flex flex-col justify-between cursor-pointer group shadow-xs hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[13px] font-bold text-on-surface tracking-widest uppercase group-hover:text-primary transition-colors">
                      {coupon.code}
                    </span>
                    <div className="text-[10px] font-medium text-secondary mt-1">
                      {coupon.discountType === 'percentage' 
                        ? `${coupon.discountValue}% discount up to ₹${coupon.maxDiscount || '200'}` 
                        : `Flat ₹${coupon.discountValue} Off`
                      }
                    </div>
                  </div>
                  <span className="text-[8px] bg-primary/10 text-primary font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0">
                    {coupon.discountType}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/20 flex justify-between items-center text-[9px] text-secondary">
                  <span>Min order: ₹{coupon.minOrderAmount}</span>
                  <span className="font-semibold text-primary group-hover:underline flex items-center gap-1">
                    TAP TO COPY <span className="material-symbols-outlined text-[12px]">content_copy</span>
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-[10px] text-secondary italic">
            No discount coupon vouchers available at this time. Check back during upcoming events!
          </div>
        )}
      </div>

      {/* 4. WALLET AUDIT TRANSACTION HISTORY TIMELINE */}
      <div className="space-y-4 pt-4 border-t border-outline-variant/30">
        <div className="pb-2">
          <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface">
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
                  <div className={`absolute -left-[33px] top-0 w-4 h-4 rounded-full flex items-center justify-center border-2 ${
                    isCredit 
                      ? 'bg-green-50 border-green-500 text-green-600' 
                      : 'bg-red-50 border-red-400 text-red-500'
                  }`}>
                    <span className="text-[8px] font-bold font-mono">{isCredit ? '+' : '-'}</span>
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-on-surface font-semibold">
                          {tx.description}
                        </strong>
                        <span className={`text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                          tx.source === 'purchase_cashback' ? 'bg-amber-50 text-amber-700 border border-amber-200/50' :
                          tx.source === 'referral_bonus' ? 'bg-green-50 text-green-700 border border-green-200/50' :
                          tx.source === 'checkout_redeem' ? 'bg-red-50 text-red-700 border border-red-200/50' :
                          'bg-surface-container text-secondary'
                        }`}>
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
                            minute: '2-digit'
                          })}
                        </span>
                        {tx.orderId && (
                          <span className="font-mono text-[#735c00]/80 font-medium">
                            Linked Order: {tx.orderId.invoiceNumber || tx.orderId._id || 'INV-999'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`font-mono text-xs font-bold whitespace-nowrap text-right ${
                      isCredit ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {isCredit ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-[11px] text-secondary italic">
            No transactions found. Make purchases, write reviews, or invite friends to accumulate Siri Cash!
          </div>
        )}
      </div>

    </motion.div>
  );
}
