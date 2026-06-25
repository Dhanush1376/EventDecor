export const getTierBySpend = (spend: number, tiers: any[]): string => {
  let highestTier = tiers.length > 0 ? tiers[0].name : 'Bronze';
  // Assuming tiers are sorted by minSpend ascending. If not, we should sort them.
  const sortedTiers = [...tiers].sort((a, b) => a.minSpend - b.minSpend);

  for (const t of sortedTiers) {
    if (spend >= t.minSpend) {
      highestTier = t.name;
    }
  }
  return highestTier;
};
