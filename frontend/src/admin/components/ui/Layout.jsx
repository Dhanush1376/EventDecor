import React from 'react';
import { m as motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { fadeUp } from './utils';
import { LiveBadge } from './Indicators';

export function PageHeader({
  title,
  subtitle,
  icon,
  iconColor,
  children,
  className = '',
  mobileRow = false,
  headerAction,
  backButton,
  breadcrumbs,
  badge,
}) {
  const navigate = useNavigate();
  return (
    <motion.div
      variants={fadeUp}
      className={`flex ${mobileRow ? 'flex-row' : 'flex-col sm:flex-row'} justify-between items-start sm:items-center gap-5 sm:gap-6 border-b border-[var(--admin-border-subtle)] pb-6 mb-2 ${className}`}
    >
      <div
        className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${mobileRow ? 'flex-1 min-w-0 pr-2' : 'w-full'}`}
      >
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {backButton && (
            <button
              type="button"
              onClick={() => {
                if (backButton.path) {
                  navigate(backButton.path);
                } else {
                  navigate(-1);
                }
              }}
              className="w-9 h-9 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] cursor-pointer transition-all active:scale-95 shrink-0"
              title={backButton.label || 'Back'}
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
          )}
          {icon && (
            <div
              className="w-10 h-10 rounded-[var(--admin-radius-lg)] flex items-center justify-center shrink-0 mt-1"
              style={{
                backgroundColor: `var(--admin-domain-${iconColor || 'settings'}-bg)`,
                color: `var(--admin-domain-${iconColor || 'settings'})`,
              }}
            >
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--admin-text-tertiary)] mb-1">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    {crumb.path ? (
                      <Link
                        to={crumb.path}
                        className="hover:text-[var(--admin-text-primary)] transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-[var(--admin-text-secondary)]">{crumb.label}</span>
                    )}
                    {idx < breadcrumbs.length - 1 && (
                      <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
            <h1 className="text-[20px] sm:text-[26px] font-bold text-[var(--admin-text-primary)] font-display tracking-tight leading-tight flex items-center gap-2">
              {title}
              {badge !== undefined && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-[var(--admin-surface-hover)] border border-[var(--admin-border-strong)] text-[var(--admin-text-secondary)] text-[12px] font-bold ml-1">
                  {badge}
                </span>
              )}
            </h1>
            {subtitle && (
              <p className="text-[13px] text-[var(--admin-text-secondary)] mt-1.5 font-medium leading-relaxed max-w-[500px]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {headerAction && (
          <div className="w-full sm:w-auto mt-3 sm:mt-0 shrink-0 flex items-center justify-start sm:justify-center">
            {headerAction}
          </div>
        )}
      </div>
      {children && (
        <div
          className={`${mobileRow ? 'w-auto flex flex-row gap-0.5' : 'w-full sm:w-auto flex flex-col sm:flex-row gap-2'} shrink-0`}
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              const isBtn =
                child.type === 'button' || child.props?.className?.includes('admin-btn');
              if (isBtn) {
                const isOutline = child.props.className?.includes('admin-btn-outline');
                const isSecondary = child.props.className?.includes('admin-btn-secondary');
                const isGhost = child.props.className?.includes('admin-btn-ghost');

                let extraClasses = `${isGhost ? 'w-auto' : 'w-full sm:w-auto'} justify-center text-[11px] font-bold uppercase tracking-wider rounded-[var(--admin-radius-lg)] active:scale-95 transition-all shadow-none hover:shadow-none min-h-[36px] flex items-center gap-2`;

                if (isGhost) {
                  extraClasses +=
                    ' rounded-full p-1.5 bg-transparent text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] border-none';
                } else {
                  extraClasses += ' px-3 py-2 sm:py-2.5';
                  if (!isOutline && !isSecondary) {
                    extraClasses += ' admin-btn-primary';
                  } else if (isOutline) {
                    extraClasses += ' admin-btn-outline';
                  } else if (isSecondary) {
                    extraClasses += ' admin-btn-secondary';
                  }
                }

                return React.cloneElement(child, {
                  className: `${child.props.className || ''} ${extraClasses}`.trim(),
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

export function SectionHeader({
  icon,
  title,
  description,
  page,
  section,
  status,
  onBack,
  children,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-[var(--admin-border-subtle)] pb-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 min-h-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] transition-colors shadow-sm flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
        )}
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
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
