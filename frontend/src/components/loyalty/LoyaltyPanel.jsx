import { Wallet } from 'lucide-react';
const LoyaltySkeleton = () => <div className="animate-pulse bg-gray-200 h-48 rounded-md"></div>;
import { m as motion } from 'framer-motion';
import PartyPopper from 'lucide-react/dist/esm/icons/party-popper';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import storeSettingsService from '../../services/api/storeSettingsService';
import { loyaltyService } from '../../services/domainServices';
import toast from 'react-hot-toast';

import logger from '../../utils/core/logger';
export function LoyaltyPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['storeSettings', 'public'],
    queryFn: () => storeSettingsService.getPublicSettings(),
    staleTime: 10 * 60 * 1000,
  });

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

  const copyToClipboard = (text, message = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    toast.success(message, {
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
              • {data.loyaltyTier}
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
              {(() => {
                const currentTier = settings?.loyalty?.tiers?.find(
                  (t) => t.name === data.loyaltyTier,
                );
                const percent =
                  currentTier?.cashbackPercent ||
                  (data.loyaltyTier === 'Platinum'
                    ? 12
                    : data.loyaltyTier === 'Gold'
                      ? 8
                      : data.loyaltyTier === 'Silver'
                        ? 5
                        : 2);
                if (data.loyaltyTier === 'Platinum')
                  return `• Earn ${percent}% Platinum Cashback & VIP Priority Perks`;
                return `• Earn ${percent}% Cashback & ${settings?.loyalty?.earnRatePoints || 1} Coin per ₹${settings?.loyalty?.earnRateAmount || 10} spent`;
              })()}
            </div>
          </div>
        </div>

        {/* Loyalty Progression metrics panel */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs font-body">
          <div>
            <h4 className="font-body font-bold text-xs uppercase tracking-widest text-on-surface mb-1">
              VIP Tier Progression
            </h4>
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
                <PartyPopper
                  className="inline-block w-4 h-4 mr-1.5 -mt-0.5 text-yellow-500"
                  aria-hidden="true"
                />{' '}
                Maximum elite tier reached! Enjoy 12% cashback rewards!
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
          </div>
        </div>
      </div>

      {/* 4. WALLET AUDIT TRANSACTION HISTORY TIMELINE */}
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs font-body space-y-4">
        <div className="pb-3 border-b border-outline-variant/20">
          <h4 className="font-body font-bold text-[11px] uppercase tracking-widest text-on-surface">
            Wallet Transaction Ledger
          </h4>
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
                          className={`text-[7px] sm:text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full ${
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
          <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-10 text-center shadow-xs flex flex-col items-center justify-center min-h-[40vh] mt-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center mb-4 text-secondary">
              <Wallet className="text-[20px]" strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-[10px] uppercase tracking-widest text-on-surface mb-2">
              No Transactions Found
            </h3>
            <p className="text-secondary text-[9px] font-bold uppercase tracking-widest max-w-[250px]">
              Make purchases, write reviews, or invite friends to accumulate Siri Cash!
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
