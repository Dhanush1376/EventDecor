import React from 'react';

export function Skeleton({ className = '', variant = 'rect', delay = 0 }) {
  const variants = {
    rect: 'rounded-2xl',
    circle: 'rounded-full',
    text: 'rounded-lg h-4 w-3/4',
  };

  return (
    <div
      className={`bg-surface-container border border-outline-variant/10 ${variants[variant]} ${className} relative overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent animate-shimmer" />
    </div>
  );
}
