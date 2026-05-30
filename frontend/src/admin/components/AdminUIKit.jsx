import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════
// SHARED ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════
export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};
export const stagger = {
  show: { transition: { staggerChildren: 0.05 } },
};

// ═══════════════════════════════════════════════════════════════
// FORMAT UTILITIES (centralized — deduplicated from 3 files)
// ═══════════════════════════════════════════════════════════════
export function formatCurrency(val) {
  if (val == null) return "₹0";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

export function formatNumber(val) {
  if (val == null) return "0";
  return Number(val).toLocaleString("en-IN");
}

export function getRelativeTime(date) {
  if (!date) return "Recently";
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ═══════════════════════════════════════════════════════════════
// PAGE HEADER — unified page title across all admin pages
// ═══════════════════════════════════════════════════════════════
export function PageHeader({ title, subtitle, children, className = "", mobileRow = false }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`flex ${mobileRow ? 'flex-row' : 'flex-col sm:flex-row'} justify-between items-start sm:items-center gap-3 sm:gap-4 border-b border-[var(--admin-border-subtle)] pb-5 ${className}`}
    >
      <div className={mobileRow ? "flex-1 min-w-0 pr-2" : "w-full sm:w-auto"}>
        <h1 className="text-[20px] sm:text-[26px] font-bold text-[var(--admin-text-primary)] font-display tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12px] sm:text-[13px] text-[var(--admin-text-tertiary)] mt-1 font-medium leading-normal">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className={`${mobileRow ? 'w-auto flex flex-row gap-0.5' : 'w-full sm:w-auto flex flex-col sm:flex-row gap-2'} shrink-0`}>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              const isBtn = child.type === "button" || child.props?.className?.includes("admin-btn");
              if (isBtn) {
                const isOutline = child.props.className?.includes("admin-btn-outline");
                const isSecondary = child.props.className?.includes("admin-btn-secondary");
                const isGhost = child.props.className?.includes("admin-btn-ghost");
                
                let extraClasses = `${isGhost ? 'w-auto' : 'w-full sm:w-auto'} justify-center text-[11px] font-bold uppercase tracking-wider rounded-[var(--admin-radius-lg)] active:scale-95 transition-all shadow-none hover:shadow-none min-h-[36px] flex items-center gap-2`;
                
                if (isGhost) {
                  extraClasses += " rounded-full p-1.5 bg-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] border-none";
                } else {
                  extraClasses += " px-3 py-2 sm:py-2.5";
                  if (!isOutline && !isSecondary) {
                    // Style as minimal soft gold
                    extraClasses += " bg-[var(--admin-accent-light)] hover:bg-[var(--admin-accent-muted)] text-[var(--admin-accent)] border border-[rgba(139,115,64,0.18)] hover:border-[rgba(139,115,64,0.3)]";
                  } else if (isOutline) {
                    extraClasses += " bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-hover)] text-[var(--admin-text-primary)] border border-[var(--admin-border)]";
                  } else if (isSecondary) {
                    extraClasses += " bg-[var(--admin-text-primary)] hover:bg-[#27272A] text-white border-none";
                  }
                }
                
                return React.cloneElement(child, {
                  className: `${child.props.className || ""} ${extraClasses}`.trim()
                });
              }
            }
            return child;
          })}
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD — unified KPI metric card with sparkline
// ═══════════════════════════════════════════════════════════════
export function StatCard({
  icon,
  label,
  value,
  change,
  changeType = "up",
  color = "#6366F1",
  onClick,
  sparklinePath,
  progress,
}) {
  return (
    <motion.button
      variants={fadeUp}
      onClick={onClick}
      className="admin-card-interactive relative p-3 sm:p-5 text-left w-full overflow-hidden group"
    >
      {/* Accent stripe */}
      <div
        className="admin-stat-accent"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between mb-2.5 sm:mb-3 pl-0.5 sm:pl-2">
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-[var(--admin-radius-md)] sm:rounded-[var(--admin-radius-lg)] flex items-center justify-center"
          style={{ backgroundColor: `${color}0A`, border: `1px solid ${color}15` }}
        >
          <span
            className="material-symbols-outlined text-[16px] sm:text-[18px]"
            style={{ color }}
          >
            {icon}
          </span>
        </div>
        {change && (
          <span
            className={`admin-badge ${
              changeType === "up" ? "admin-badge-success" : "admin-badge-error"
            } text-[8px] sm:text-[9px] max-w-[75px] sm:max-w-none px-1.5 sm:px-2`}
          >
            <span className="material-symbols-outlined text-[9px] sm:text-[10px] font-bold shrink-0">
              {changeType === "up" ? "trending_up" : "trending_down"}
            </span>
            <span className="truncate">{change}</span>
          </span>
        )}
      </div>

      <div className="flex items-end justify-between pl-0.5 sm:pl-2">
        <div className="min-w-0">
          <p className="text-[18px] sm:text-[24px] font-bold text-[var(--admin-text-primary)] leading-none tracking-tight">
            {value}
          </p>
          <p className="text-[9px] sm:text-[10px] text-[var(--admin-text-tertiary)] mt-1.5 sm:mt-2 font-bold tracking-wider uppercase truncate" title={label}>
            {label}
          </p>
        </div>
        {sparklinePath && (
          <div className="w-10 h-5 sm:w-14 sm:h-7 text-[var(--admin-border-strong)] group-hover:text-[var(--admin-accent)] transition-colors duration-300 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 100 30" fill="none">
              <path d={sparklinePath} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="w-full bg-[var(--admin-surface-muted)] h-1 rounded-full mt-4 overflow-hidden ml-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      )}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHART CARD — wrapper for Recharts with proper padding
// ═══════════════════════════════════════════════════════════════
export function ChartCard({ title, subtitle, legend, children, className = "" }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`admin-card p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-start sm:items-center justify-between mb-5 gap-3 flex-col sm:flex-row">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[12px] text-[var(--admin-text-tertiary)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {legend && (
          <div className="flex items-center gap-4 text-[11px] font-medium text-[var(--admin-text-secondary)]">
            {legend}
          </div>
        )}
      </div>
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHART TOOLTIP — single premium tooltip (replaces 3 duplicates)
// ═══════════════════════════════════════════════════════════════
export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="admin-chart-tooltip">
      <p className="admin-chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="admin-chart-tooltip-value flex items-center gap-2 mt-0.5" style={{ color: p.color }}>
          <span
            className="w-2 h-2 rounded-full inline-block shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-[var(--admin-text-secondary)] font-normal text-[11px]">{p.name}:</span>
          <span className="font-bold text-[13px]">
            {typeof p.value === "number" && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION HEADER — section-level header with optional live badge
// ═══════════════════════════════════════════════════════════════
export function SectionHeader({
  icon,
  title,
  description,
  page,
  section,
  status,
  children,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[var(--admin-border-subtle)] pb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-[var(--admin-radius-lg)] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)] block">
              {icon}
            </span>
          </div>
        )}
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--admin-text-primary)] tracking-tight leading-tight">
            {title}
          </h2>
          {description && (
            <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 leading-normal">
              {description}
            </p>
          )}
          {page && (
            <div className="mt-2">
              <LiveBadge page={page} section={section} status={status} />
            </div>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIVE BADGE — connection/status indicator
// ═══════════════════════════════════════════════════════════════
export function LiveBadge({ page, section, status = "published" }) {
  const statusConfig = {
    published: { classes: "admin-badge-success admin-badge-dot-pulse", label: "Live" },
    modified: { classes: "admin-badge-neutral admin-badge-dot", label: "Modified" },
    draft: { classes: "admin-badge-neutral", label: "Draft" },
  };
  const cfg = statusConfig[status] || statusConfig.draft;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`admin-badge ${cfg.classes}`}>
        {cfg.label}
      </span>
      <span className="admin-badge admin-badge-neutral text-[9px]">
        <span className="material-symbols-outlined text-[10px] text-[var(--admin-text-tertiary)]">link</span>
        {page}
        {section ? ` → ${section}` : ""}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATUS BADGE — unified status display
// ═══════════════════════════════════════════════════════════════
export function StatusBadge({ status, className = "" }) {
  const cfg = {
    published: "admin-badge-success",
    active: "admin-badge-success",
    confirmed: "admin-badge-success",
    delivered: "admin-badge-success",
    modified: "admin-badge-neutral",
    processing: "admin-badge-info",
    shipped: "admin-badge-info",
    pending: "admin-badge-warning",
    draft: "admin-badge-neutral",
    inactive: "admin-badge-neutral",
    cancelled: "admin-badge-error",
    returned: "admin-badge-neutral",
    refunded: "admin-badge-neutral",
    "out of stock": "admin-badge-error",
    "low stock": "admin-badge-warning",
  };
  return (
    <span className={`admin-badge ${cfg[status?.toLowerCase()] || "admin-badge-neutral"} ${className}`}>
      {status}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE — consistent empty/no-data illustration
// ═══════════════════════════════════════════════════════════════
export function EmptyState({ icon = "inbox", title, description, action, className = "" }) {
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

// ═══════════════════════════════════════════════════════════════
// PERIOD SELECTOR — unified time period toggle
// ═══════════════════════════════════════════════════════════════
export function PeriodSelector({ periods = ["weekly", "monthly", "yearly"], value, onChange }) {
  return (
    <div className="flex w-full sm:w-auto bg-[var(--admin-surface-muted)] rounded-[var(--admin-radius-lg)] p-0.5 border border-[var(--admin-border-subtle)]">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`flex-1 text-center px-3 py-1.5 rounded-[var(--admin-radius-md)] text-[11px] font-semibold capitalize cursor-pointer transition-all min-h-0 ${
            value === p
              ? "bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-[var(--admin-shadow-xs)] border border-[var(--admin-border-subtle)]"
              : "text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// FILTER BAR — unified filter tabs
// ═══════════════════════════════════════════════════════════════
export function FilterBar({ filters, value, onChange, counts, className = "" }) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-smooth admin-filter-bar ${className}`}>
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`admin-filter-pill min-h-0 ${
            value === f ? "admin-filter-pill-active" : ""
          }`}
        >
          {f}
          {counts?.[f] !== undefined && (
            <span
              className={`ml-1 px-1.5 py-0 rounded text-[10px] font-bold ${
                value === f
                  ? "bg-white/20 text-white"
                  : "bg-[var(--admin-surface-muted)] text-[var(--admin-text-tertiary)]"
              }`}
            >
              {counts[f]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN SKELETON SYSTEM — comprehensive layout-preserving loaders
// ═══════════════════════════════════════════════════════════════
export function AdminSkeleton({ className = "", style }) {
  return (
    <div
      className={`admin-skeleton ${className}`}
      style={style}
      role="progressbar"
      aria-busy="true"
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`admin-card p-5 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <AdminSkeleton className="w-9 h-9 rounded-[var(--admin-radius-lg)]" />
        <AdminSkeleton className="w-16 h-5 rounded-[var(--admin-radius-md)]" />
      </div>
      <AdminSkeleton className="w-24 h-7 rounded-[var(--admin-radius-md)]" />
      <AdminSkeleton className="w-20 h-3 rounded" />
    </div>
  );
}

export function SkeletonChart({ className = "", height = "280px" }) {
  return (
    <div className={`admin-card p-6 ${className}`}>
      <div className="flex items-start sm:items-center justify-between mb-6 flex-col sm:flex-row gap-3">
        <div className="space-y-2">
          <AdminSkeleton className="w-32 h-5 rounded-[var(--admin-radius-md)]" />
          <AdminSkeleton className="w-48 h-3 rounded" />
        </div>
        <div className="flex gap-2">
          <AdminSkeleton className="w-12 h-3 rounded" />
          <AdminSkeleton className="w-12 h-3 rounded" />
        </div>
      </div>
      <AdminSkeleton className="w-full rounded-[var(--admin-radius-lg)]" style={{ height }} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className = "" }) {
  return (
    <div className={`admin-card overflow-hidden ${className}`}>
      <div className="p-4 border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)]">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <AdminSkeleton key={i} className="h-3 rounded flex-1 max-w-[120px]" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-4 border-b border-[var(--admin-border-subtle)] last:border-b-0">
          <div className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, i) => (
              <AdminSkeleton
                key={i}
                className={`h-4 rounded flex-1 ${i === 0 ? "max-w-[100px]" : i === cols - 1 ? "max-w-[80px]" : ""}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm({ fields = 4, className = "" }) {
  return (
    <div className={`admin-card p-6 space-y-6 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <AdminSkeleton className="w-24 h-3 rounded" />
          <AdminSkeleton className="w-full h-10 rounded-[var(--admin-radius-lg)]" />
        </div>
      ))}
      <div className="pt-4 flex justify-end gap-3">
        <AdminSkeleton className="w-20 h-10 rounded-[var(--admin-radius-lg)]" />
        <AdminSkeleton className="w-24 h-10 rounded-[var(--admin-radius-lg)]" />
      </div>
    </div>
  );
}

export function SkeletonProfile({ className = "" }) {
  return (
    <div className={`admin-card p-6 ${className}`}>
      <div className="flex items-center gap-5 mb-8">
        <AdminSkeleton className="w-20 h-20 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <AdminSkeleton className="w-48 h-6 rounded-[var(--admin-radius-md)]" />
          <AdminSkeleton className="w-32 h-4 rounded" />
          <div className="flex gap-2 pt-2">
            <AdminSkeleton className="w-16 h-5 rounded-[var(--admin-radius-md)]" />
            <AdminSkeleton className="w-20 h-5 rounded-[var(--admin-radius-md)]" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between py-3 border-b border-[var(--admin-border-subtle)] last:border-0">
            <AdminSkeleton className="w-24 h-4 rounded" />
            <AdminSkeleton className="w-32 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5, className = "" }) {
  return (
    <div className={`admin-card p-4 flex flex-col gap-2 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]">
          <AdminSkeleton className="w-10 h-10 rounded-[var(--admin-radius-md)] shrink-0" />
          <div className="flex-1 space-y-2">
            <AdminSkeleton className="w-1/3 h-4 rounded" />
            <AdminSkeleton className="w-1/4 h-3 rounded" />
          </div>
          <AdminSkeleton className="w-16 h-6 rounded-[var(--admin-radius-md)] shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 admin-animate-in" aria-busy="true">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <AdminSkeleton className="w-48 h-7 rounded-[var(--admin-radius-lg)]" />
          <AdminSkeleton className="w-64 h-4 rounded" />
        </div>
        <AdminSkeleton className="w-40 h-9 rounded-[var(--admin-radius-lg)]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="admin-grid-charts">
        <SkeletonChart height="280px" />
        <SkeletonChart height="240px" />
      </div>
      <div className="admin-grid-content">
        <SkeletonList items={4} />
        <SkeletonList items={4} />
        <SkeletonList items={4} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FRONTEND MINI PREVIEW
// ═══════════════════════════════════════════════════════════════
export function FrontendPreview({ label, children, className = "" }) {
  return (
    <div className={`admin-card-flush ${className}`}>
      <div className="bg-[var(--admin-bg-subtle)] px-4 py-2.5 flex items-center gap-2 border-b border-[var(--admin-border)]">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--admin-border-strong)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--admin-border-strong)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--admin-border-strong)]" />
        </div>
        <span className="text-[10px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-wider ml-2">
          {label || "Frontend Preview"}
        </span>
        <span className="material-symbols-outlined text-[13px] text-[var(--admin-text-tertiary)] ml-auto block">
          visibility
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PUBLISH BAR — floating action bar
// ═══════════════════════════════════════════════════════════════
export function PublishBar({ hasChanges, onPublish, onReset, lastSaved }) {
  return (
    <AnimatePresence>
      {hasChanges && (
        <motion.div
          initial={{ y: 80, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: 80, x: "-50%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="admin-floating-bar max-w-[95vw]"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--admin-accent)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--admin-accent)]" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-accent)] opacity-90">
                CMS Sandbox
              </span>
              <span className="text-[9px] text-[var(--admin-text-tertiary)] font-normal">
                Unpublished changes
              </span>
            </div>
          </div>

          <div className="h-5 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="px-3 py-1.5 rounded-[var(--admin-radius-md)] text-[11px] font-medium text-[var(--admin-text-tertiary)] hover:text-white hover:bg-white/5 transition-all min-h-0 active:scale-95"
            >
              Discard
            </button>
            <button
              onClick={onPublish}
              className="px-4 py-2 rounded-[var(--admin-radius-md)] text-[11px] font-semibold bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] text-white shadow-sm transition-all flex items-center gap-1.5 uppercase tracking-wider min-h-0"
            >
              <span className="material-symbols-outlined text-[13px] font-bold">publish</span>
              Publish Live
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════
// PUBLISH TOAST — success notification
// ═══════════════════════════════════════════════════════════════
export function PublishToast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -40, x: "-50%", opacity: 0, scale: 0.95 }}
          animate={{ y: 0, x: "-50%", opacity: 1, scale: 1 }}
          exit={{ y: -40, x: "-50%", opacity: 0, scale: 0.95 }}
          className="fixed top-20 left-1/2 z-[200] bg-[var(--admin-success)] text-white border border-[var(--admin-success-border)] px-5 py-2.5 rounded-[var(--admin-radius-xl)] shadow-[var(--admin-shadow-lg)] flex items-center gap-2 text-[12px] font-semibold"
        >
          <span className="material-symbols-outlined text-[15px]">
            check_circle
          </span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN FIELD — form field wrapper with label
// ═══════════════════════════════════════════════════════════════
export function AdminField({
  label,
  description,
  frontendTarget,
  children,
  className = "",
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="admin-label mb-0">
          {label}
        </label>
        {frontendTarget && (
          <span className="admin-badge admin-badge-neutral text-[9px]">
            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
            {frontendTarget}
          </span>
        )}
      </div>
      {description && (
        <p className="text-[11px] text-[var(--admin-text-tertiary)] leading-normal pb-0.5">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN INPUT — styled text input
// ═══════════════════════════════════════════════════════════════
export function AdminInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
  ...props
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`admin-input ${className}`}
      {...props}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN TEXTAREA
// ═══════════════════════════════════════════════════════════════
export function AdminTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
  className = "",
  ...props
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`admin-textarea ${className}`}
      {...props}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN TOGGLE — accessible toggle switch
// ═══════════════════════════════════════════════════════════════
export function AdminToggle({ 
  label, 
  description, 
  checked, 
  onChange, 
  disabled = false,
  size = "md",
  variant = "accent",
  activeBgColor = null,
  className = "",
  ...props
}) {
  const isSm = size === "sm";
  const translateDistance = 16; // both sm and md translate by 16px as per visual math!

  // Active track styling override (if any custom color is passed, e.g. activeBgColor)
  const trackStyle = activeBgColor && checked ? { backgroundColor: activeBgColor } : {};

  const switchEl = (
    <button
      role="switch"
      type="button"
      aria-checked={!!checked}
      aria-label={label || props["aria-label"] || "Toggle"}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`admin-toggle-btn ${
        isSm ? "touch-target-sm" : "touch-target-md"
      } ${className}`}
      {...props}
    >
      <div 
        className={`admin-toggle-track ${isSm ? "size-sm" : "size-md"}`}
        data-state={checked ? "checked" : "unchecked"}
        data-variant={variant}
        style={trackStyle}
      >
        <motion.div
          animate={{ x: checked ? translateDistance : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`admin-toggle-thumb ${isSm ? "size-sm" : "size-md"}`}
        />
      </div>
    </button>
  );

  if (!label && !description) return switchEl;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--admin-border-subtle)] w-full gap-4">
      <div className="text-left flex-1 min-w-0">
        {label && (
          <span className="text-[13px] text-[var(--admin-text-primary)] font-semibold block">
            {label}
          </span>
        )}
        {description && (
          <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 leading-normal">
            {description}
          </p>
        )}
      </div>
      {switchEl}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
// CHART COLOR PALETTE
// ═══════════════════════════════════════════════════════════════
export const CHART_COLORS = [
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#F97316", // Orange
  "#14B8A6", // Teal
];
