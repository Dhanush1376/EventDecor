import React from 'react';

export function StatusPill({ children, color = 'neutral', className = '' }) {
  const colorStyles = {
    neutral: 'bg-surface-container text-secondary border-outline-variant/10',
    primary: 'bg-primary/5 text-primary border-primary/20',
    success: 'bg-green-500/10 text-green-700 border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-700 border-red-500/20',
    accent: 'bg-[#8c7335]/5 text-[#8c7335] border-[#8c7335]/30',
  };

  const style = colorStyles[color] || colorStyles.neutral;

  return (
    <span
      className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] border ${style} ${className}`}
    >
      {children}
    </span>
  );
}
