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

const VARIANT_CONFIGS = {
  success: {
    classes:
      'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    chevron: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    classes:
      'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60',
    dot: 'bg-amber-600 dark:bg-amber-400',
    chevron: 'text-amber-700 dark:text-amber-400',
  },
  error: {
    classes:
      'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60',
    dot: 'bg-rose-600 dark:bg-rose-400',
    chevron: 'text-rose-700 dark:text-rose-400',
  },
  info: {
    classes:
      'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700/60',
    dot: 'bg-blue-600 dark:bg-blue-400',
    chevron: 'text-blue-700 dark:text-blue-400',
  },
  primary: {
    classes:
      'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700/60',
    dot: 'bg-indigo-600 dark:bg-indigo-400',
    chevron: 'text-indigo-700 dark:text-indigo-400',
  },
  neutral: {
    classes:
      'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
    dot: 'bg-slate-500 dark:bg-slate-400',
    chevron: 'text-slate-600 dark:text-slate-400',
  },
};

export function getStatusVariant(status, variant) {
  if (variant) return variant;
  const s = (status || '').toString().toLowerCase().trim().replace(/[\s-]/g, '_');
  if (
    [
      'delivered',
      'settled',
      'completed',
      'active',
      'published',
      'event_day',
      'approved',
      'refund_completed',
      'vip',
      'platinum',
      'gold',
    ].includes(s)
  ) {
    return 'success';
  }
  if (
    [
      'pending',
      'pending_payment',
      'pendingpayment',
      'inspection_pending',
      'return_requested',
      'refund_initiated',
      'low stock',
      'low_stock',
      'overdue',
      'due_today',
      'due_soon',
      'silver',
    ].includes(s)
  ) {
    return 'warning';
  }
  if (['cancelled', 'rejected', 'out of stock', 'out_of_stock', 'expired'].includes(s)) {
    return 'error';
  }
  if (
    [
      'processing',
      'shipped',
      'in_progress',
      'setup_in_progress',
      'team_assigned',
      'packing',
      'dispatch',
      'installation',
      'return_received',
      'return_picked_up',
      'inspection_completed',
      'replacement_dispatched',
      'bronze',
      'refunded',
      'returned',
      'exchanged',
    ].includes(s)
  ) {
    return 'info';
  }
  if (['confirmed', 'rental'].includes(s)) {
    return 'primary';
  }
  return 'neutral';
}

export function AdminStatusPill({ status, label, variant, pulse, className = '' }) {
  const s = (status || '').toString().toLowerCase().trim().replace(/[\s-]/g, '_');
  const v = getStatusVariant(s, variant);
  const config = VARIANT_CONFIGS[v] || VARIANT_CONFIGS.neutral;
  const isPulse =
    pulse !== undefined
      ? pulse
      : ['pending', 'pending_payment', 'processing', 'in_progress'].includes(s);
  const displayLabel = label || status?.toString().replace(/_/g, ' ').toUpperCase() || '';

  return (
    <span
      className={`admin-badge admin-badge-${v} admin-badge-pill ${config.classes} ${className}`}
      title={displayLabel}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot} ${
          isPulse ? 'animate-pulse' : ''
        }`}
      />
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}

export function StatusBadge(props) {
  return <AdminStatusPill {...props} />;
}

export function AdminStatusDropdown({
  status,
  options = [],
  onChange,
  disabled = false,
  loading = false,
  className = '',
  showDot = true,
}) {
  const s = (status || '').toString().toLowerCase().trim().replace(/[\s-]/g, '_');
  const v = getStatusVariant(s);
  const config = VARIANT_CONFIGS[v] || VARIANT_CONFIGS.neutral;
  const isPulse = ['pending', 'pending_payment', 'processing', 'in_progress'].includes(s);

  const displayLabel = status
    ? status
        .toString()
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  return (
    <div
      className={`relative inline-flex items-center w-[136px] h-8 select-none group ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`w-full h-8 px-2.5 rounded-[6px] border flex items-center justify-between text-[11.5px] font-bold shadow-2xs transition-colors pointer-events-none ${config.classes} group-hover:brightness-95 dark:group-hover:brightness-110`}
      >
        <div className="flex items-center gap-1.5 min-w-0 pr-1">
          {showDot && (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot} ${
                isPulse ? 'animate-pulse' : ''
              }`}
            />
          )}
          <span className="truncate">{displayLabel}</span>
        </div>
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        ) : (
          <span
            className={`material-symbols-outlined text-[16px] shrink-0 leading-none ${
              config.chevron || 'opacity-75'
            }`}
          >
            expand_more
          </span>
        )}
      </div>

      <select
        value={status}
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={disabled || loading}
        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10 text-[11px]"
        title="Change status"
      >
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          return (
            <option
              key={val}
              value={val}
              className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100"
            >
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
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

/**
 * Unified Payment Badge for Order, Rental, Custom Order, Return, Exchange & Booking Cards.
 * Derives badge state from orderStatus, paymentMethod, paymentStatus, settlementStatus, and razorpayPaymentId.
 * Precedence:
 *   Returned -> Cancelled -> Refunded -> Online Verified -> COD Settled -> COD Collected -> COD Pending -> Online Failed/Unpaid
 */
export function AdminPaymentBadge({
  isPaid,
  method,
  status,
  orderStatus,
  settlementStatus,
  razorpayPaymentId,
  className = '',
}) {
  const m = (method || '').toString().toLowerCase().trim();
  const s = (status || '').toString().toLowerCase().trim();
  const ord = (orderStatus || '').toString().toLowerCase().trim();
  const sett = (settlementStatus || '').toString().toLowerCase().trim();

  const isCod =
    m.includes('cod') ||
    m.includes('cash') ||
    m.includes('counter') ||
    s.includes('cod') ||
    m === 'cod';

  // 1. Returned
  const isReturned =
    ord === 'returned' ||
    ord === 'return_received' ||
    ord === 'return_completed' ||
    s === 'returned';

  if (isReturned) {
    const isRefunded = s === 'refunded' || s.includes('refund');
    return (
      <span
        title={isRefunded ? 'Order returned and payment refunded' : 'Order returned by customer'}
        className={`inline-flex items-center h-[22px] text-[9.5px] font-bold uppercase tracking-wider px-2 rounded-[4px] border whitespace-nowrap shrink-0 leading-none ${
          isRefunded
            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
            : 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
        } ${className}`}
      >
        {isRefunded ? 'REFUNDED' : 'RETURNED'}
      </span>
    );
  }

  // 2. Cancelled
  const isCancelled = ord === 'cancelled' || ord === 'rejected' || s === 'cancelled';
  if (isCancelled) {
    const isRefunded = s === 'refunded' || s.includes('refund');
    return (
      <span
        title={isRefunded ? 'Order cancelled and payment refunded' : 'Order was cancelled'}
        className={`inline-flex items-center h-[22px] text-[9.5px] font-bold uppercase tracking-wider px-2 rounded-[4px] border whitespace-nowrap shrink-0 leading-none ${
          isRefunded
            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
        } ${className}`}
      >
        {isRefunded ? 'REFUNDED' : 'CANCELLED'}
      </span>
    );
  }

  // 3. Refunded
  const isRefunded = ord === 'refunded' || s === 'refunded' || s.includes('refund');
  if (isRefunded) {
    return (
      <span
        title="Payment has been refunded to customer"
        className={`inline-flex items-center h-[22px] text-[9.5px] font-bold uppercase tracking-wider px-2 rounded-[4px] border whitespace-nowrap shrink-0 leading-none bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 ${className}`}
      >
        REFUNDED
      </span>
    );
  }

  // 4. Online Verified Paid
  const isOnlinePaid =
    !isCod &&
    (Boolean(razorpayPaymentId) ||
      s === 'paid' ||
      s === 'completed' ||
      s === 'captured' ||
      (isPaid && !isCod));

  if (isOnlinePaid) {
    const isWallet = m.includes('wallet');
    const badgeText = isWallet ? 'PAID (WALLET)' : 'PAID (ONLINE)';
    return (
      <span
        title="Payment completed and verified via payment gateway"
        className={`inline-flex items-center h-[22px] text-[9.5px] font-bold uppercase tracking-wider px-2 rounded-[4px] border whitespace-nowrap shrink-0 leading-none bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 ${className}`}
      >
        {badgeText}
      </span>
    );
  }

  // 5. COD Settled (Merchant received the remittance)
  const isCodSettled = isCod && (sett === 'settled' || ord === 'settled' || s === 'settled');

  if (isCodSettled) {
    return (
      <span
        title="Cash on Delivery payment collected and settled by merchant"
        className={`inline-flex items-center h-[22px] text-[9.5px] font-bold uppercase tracking-wider px-2 rounded-[4px] border whitespace-nowrap shrink-0 leading-none bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 ${className}`}
      >
        SETTLED (COD)
      </span>
    );
  }

  // 6. COD Collected (Cash collected by courier upon delivery; merchant settlement pending)
  const isCodCollected = isCod && (s === 'cod collected' || ord === 'delivered') && !isCodSettled;

  if (isCodCollected) {
    return (
      <span
        title="Cash collected by courier agent — Remittance settlement pending in drawer"
        className={`inline-flex items-center h-[22px] text-[9.5px] font-bold uppercase tracking-wider px-2 rounded-[4px] border whitespace-nowrap shrink-0 leading-none bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 ${className}`}
      >
        COD COLLECTED
      </span>
    );
  }

  // 7. COD Pending Delivery
  if (isCod) {
    return (
      <span
        title="Cash on Delivery — payment will be collected upon delivery"
        className={`inline-flex items-center h-[22px] text-[9.5px] font-bold uppercase tracking-wider px-2 rounded-[4px] border whitespace-nowrap shrink-0 leading-none bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 ${className}`}
      >
        PENDING (COD)
      </span>
    );
  }

  // 8. Online Failed / Unpaid
  const isFailed = s === 'failed';
  return (
    <span
      title={
        isFailed
          ? 'Online payment attempt failed or was declined'
          : 'Online payment pending verification from payment gateway (Razorpay)'
      }
      className={`inline-flex items-center h-[22px] text-[9.5px] font-bold uppercase tracking-wider px-2 rounded-[4px] border whitespace-nowrap shrink-0 leading-none ${
        isFailed
          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
          : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
      } ${className}`}
    >
      {isFailed ? 'FAILED (ONLINE)' : 'UNPAID (ONLINE)'}
    </span>
  );
}
