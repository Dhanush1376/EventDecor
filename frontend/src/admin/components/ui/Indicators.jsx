import React from 'react';

export function LiveBadge({ page, section, status = 'published' }) {
  const statusConfig = {
    published: { classes: 'admin-badge-success admin-badge-dot-pulse', label: 'Live' },
    modified: { classes: 'admin-badge-neutral admin-badge-dot', label: 'Modified' },
    draft: { classes: 'admin-badge-neutral', label: 'Draft' },
  };
  const cfg = statusConfig[status] || statusConfig.draft;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`admin-badge ${cfg.classes}`}>{cfg.label}</span>
      <span className="admin-badge admin-badge-neutral text-[9px]">
        <span className="material-symbols-outlined text-[10px] text-[var(--admin-text-tertiary)]">
          link
        </span>
        {page}
        {section ? ` → ${section}` : ''}
      </span>
    </div>
  );
}

export function StatusBadge({ status, className = '' }) {
  const cfg = {
    published: 'admin-badge-success',
    active: 'admin-badge-success',
    confirmed: 'admin-badge-success',
    delivered: 'admin-badge-success',
    modified: 'admin-badge-neutral',
    processing: 'admin-badge-info',
    shipped: 'admin-badge-info',
    pending: 'admin-badge-warning',
    draft: 'admin-badge-neutral',
    inactive: 'admin-badge-neutral',
    cancelled: 'admin-badge-error',
    returned: 'admin-badge-neutral',
    refunded: 'admin-badge-neutral',
    'out of stock': 'admin-badge-error',
    'low stock': 'admin-badge-warning',
  };
  return (
    <span
      className={`admin-badge ${cfg[status?.toLowerCase()] || 'admin-badge-neutral'} ${className}`}
    >
      {status}
    </span>
  );
}

export function EmptyState({ icon = 'inbox', title, description, action, className = '' }) {
  return (
    <div className={`admin-empty-state ${className}`}>
      <div className="w-12 h-12 rounded-full bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center mb-3">
        <span className="material-symbols-outlined text-[24px] text-[var(--admin-text-tertiary)]">
          {icon}
        </span>
      </div>
      {title && (
        <p className="text-[12px] font-semibold text-[var(--admin-text-secondary)] mb-1 tracking-wide uppercase">
          {title}
        </p>
      )}
      {description && (
        <p className="text-[12px] text-[var(--admin-text-tertiary)] max-w-[280px] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
