export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};
export const stagger = {
  show: { transition: { staggerChildren: 0.05 } },
};

export function formatCurrency(val) {
  if (val == null) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

export function formatNumber(val) {
  if (val == null) return '0';
  return Number(val).toLocaleString('en-IN');
}

export function getRelativeTime(date) {
  if (!date) return 'Recently';
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const CHART_COLORS = [
  '#3c362a', // Deep Brown
  '#8b7355', // Warm Gold
  '#7a8b76', // Sage
  '#bc6c5c', // Terracotta
  '#c29b62', // Ochre
  '#6b8ead', // Slate Blue
  '#9b82a3', // Mauve
  '#8a816f', // Warm Grey
];
