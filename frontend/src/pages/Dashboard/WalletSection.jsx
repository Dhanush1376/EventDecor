import React from 'react';

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
    >
      <React.Suspense fallback={<LoyaltySkeleton />}>
        <LoyaltyPanel />
      </React.Suspense>
    </motion.div>
  );
}
