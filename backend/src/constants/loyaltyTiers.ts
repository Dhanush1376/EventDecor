export const LOYALTY_TIERS = [
  { tier: 'Bronze', minSpend: 0, cashbackRate: 0.02 },
  { tier: 'Silver', minSpend: 5000, cashbackRate: 0.05 },
  { tier: 'Gold', minSpend: 15000, cashbackRate: 0.08 },
  { tier: 'Platinum', minSpend: 40000, cashbackRate: 0.12 },
];

export const getTierBySpend = (spend: number): string => {
  let highestTier = 'Bronze';
  for (const t of LOYALTY_TIERS) {
    if (spend >= t.minSpend) {
      highestTier = t.tier;
    }
  }
  return highestTier;
};
