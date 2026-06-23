import React from 'react';
import { m as motion } from 'framer-motion';
import { fadeUp, formatCurrency } from './utils';
import { ErrorBoundary } from '../../../components/ui/ErrorBoundary';

export function StatCard({
  icon,
  label,
  value,
  change,
  changeType = 'up',
  color = '#6366F1',
  domainColor,
  infoTooltip,
  onClick,
  sparklinePath,
  progress,
}) {
  const finalColor = domainColor ? `var(--admin-domain-${domainColor})` : color;
  const finalBg = domainColor ? `var(--admin-domain-${domainColor}-bg)` : `${color}0A`;

  return (
    <motion.button
      variants={fadeUp}
      onClick={onClick}
      className="admin-card-interactive relative p-3 sm:p-5 text-left w-full overflow-hidden group"
    >
      {/* Accent stripe */}
      <div className="admin-stat-accent" style={{ backgroundColor: finalColor }} />

      <div className="flex items-start justify-between mb-2.5 sm:mb-3 pl-0.5 sm:pl-2">
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-[var(--admin-radius-md)] sm:rounded-[var(--admin-radius-lg)] flex items-center justify-center"
          style={{ backgroundColor: finalBg }}
        >
          <span
            className="material-symbols-outlined text-[16px] sm:text-[18px]"
            style={{ color: finalColor }}
          >
            {icon}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {change && (
            <span
              className={`admin-badge ${
                changeType === 'up' ? 'admin-badge-success' : 'admin-badge-error'
              } text-[8px] sm:text-[9px] max-w-[75px] sm:max-w-none px-1.5 sm:px-2`}
            >
              <span className="material-symbols-outlined text-[9px] sm:text-[10px] font-bold shrink-0">
                {changeType === 'up' ? 'trending_up' : 'trending_down'}
              </span>
              <span className="truncate">{change}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between pl-0.5 sm:pl-2">
        <div className="min-w-0">
          <p className="text-[18px] sm:text-[24px] font-bold text-[var(--admin-text-primary)] leading-none tracking-tight">
            {value}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
            <p
              className="text-[9px] sm:text-[10px] text-[var(--admin-text-tertiary)] font-bold tracking-wider uppercase truncate"
              title={label}
            >
              {label}
            </p>
            {infoTooltip && (
              <span
                className="material-symbols-outlined text-[12px] text-[var(--admin-text-placeholder)] hover:text-[var(--admin-text-secondary)] transition-colors cursor-help"
                title={infoTooltip}
              >
                info
              </span>
            )}
          </div>
        </div>
        {sparklinePath && (
          <div className="w-10 h-5 sm:w-14 sm:h-7 text-[var(--admin-border-strong)] group-hover:text-[var(--admin-accent)] transition-colors duration-300 shrink-0">
            <svg className="w-full h-full" viewBox="0 0 100 30" fill="none">
              <path
                d={sparklinePath}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      {progress !== undefined && (
        <div className="w-full bg-[var(--admin-surface-muted)] h-1 rounded-full mt-4 overflow-hidden ml-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ backgroundColor: finalColor }}
          />
        </div>
      )}
    </motion.button>
  );
}

export function ChartCard({ title, subtitle, legend, children, className = '' }) {
  return (
    <motion.div variants={fadeUp} className={`admin-card p-5 sm:p-6 ${className}`}>
      <div className="flex items-start sm:items-center justify-between mb-5 gap-3 flex-col sm:flex-row">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--admin-text-primary)] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[12px] text-[var(--admin-text-tertiary)] mt-0.5">{subtitle}</p>
          )}
        </div>
        {legend && (
          <div className="flex items-center gap-4 text-[11px] font-medium text-[var(--admin-text-secondary)]">
            {legend}
          </div>
        )}
      </div>
      <ErrorBoundary
        fallback={
          <div className="h-[200px] flex items-center justify-center bg-[var(--admin-error-light)] border border-[var(--admin-error-border)] rounded-[var(--admin-radius-lg)] text-[var(--admin-error)] text-xs p-4 text-center flex-col gap-2">
            <span className="material-symbols-outlined text-2xl">error_outline</span>
            Failed to load chart
          </div>
        }
      >
        {children}
      </ErrorBoundary>
    </motion.div>
  );
}

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="admin-chart-tooltip">
      <p className="admin-chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p
          key={i}
          className="admin-chart-tooltip-value flex items-center gap-2 mt-0.5"
          style={{ color: p.color }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-[var(--admin-text-secondary)] font-normal text-[11px]">
            {p.name}:
          </span>
          <span className="font-bold text-[13px]">
            {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}
