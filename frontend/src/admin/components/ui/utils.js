export const fadeUp = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
};
export const stagger = {
  show: { transition: { staggerChildren: 0.03 } },
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
  '#826237', // Custom Gold
  '#7a8b76', // Sage
  '#bc6c5c', // Terracotta
  '#c29b62', // Ochre
  '#6b8ead', // Slate Blue
  '#9b82a3', // Mauve
  '#8a816f', // Warm Grey
];

export function smoothScrollCardIntoView(elementOrId, bottomOffset = 95) {
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    const el =
      typeof elementOrId === 'string'
        ? document.getElementById(elementOrId) ||
          document.querySelector(`[data-card-id="${elementOrId}"]`)
        : elementOrId;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const visibleBottom = window.innerHeight - bottomOffset;
    if (rect.bottom > visibleBottom) {
      const scrollNeeded = rect.bottom - visibleBottom;
      window.scrollBy({ top: scrollNeeded + 16, behavior: 'smooth' });
    }
  }, 220);
}
