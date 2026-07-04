import React from 'react';
import { motion } from 'framer-motion';
import { LoyaltySkeleton } from '../../components/ui';

const LoyaltyPanel = React.lazy(() =>
  import('../../components/loyalty/LoyaltyPanel').then((m) => ({ default: m.LoyaltyPanel })),
);

export function WalletSection() {
  return (
    <motion.div
      id="panel-loyalty"
      role="tabpanel"
      key="tab-loyalty"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs font-body mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
            Wallet & Loyalty
          </h2>
        </div>
      </div>
      <React.Suspense fallback={<LoyaltySkeleton />}>
        <LoyaltyPanel />
      </React.Suspense>
    </motion.div>
  );
}
