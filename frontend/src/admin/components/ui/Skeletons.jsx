import React from 'react';

export function AdminSkeleton({ className = '', style }) {
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

export function SkeletonCard({ className = '' }) {
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

export function SkeletonChart({ className = '', height = '280px' }) {
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

export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  const mobileCount = Math.min(rows, 6);

  return (
    <div className={className}>
      {/* Desktop Table View Skeleton */}
      <div className="hidden md:block admin-card overflow-hidden">
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
                  className={`h-4 rounded flex-1 ${i === 0 ? 'max-w-[100px]' : i === cols - 1 ? 'max-w-[80px]' : ''}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Card List Skeleton */}
      <div className="md:hidden flex flex-col gap-3">
        {Array.from({ length: mobileCount }).map((_, r) => (
          <div
            key={r}
            className="admin-card p-3.5 rounded-[4px] border border-[var(--admin-border)] shadow-xs bg-[var(--admin-surface)] flex flex-col gap-3"
          >
            {/* Header: ID / Title + Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <AdminSkeleton className="w-24 h-4 rounded" />
                <AdminSkeleton className="w-12 h-3.5 rounded-[4px]" />
              </div>
              <AdminSkeleton className="w-16 h-5 rounded-full shrink-0" />
            </div>

            {/* Middle: Item / Info Block */}
            <div className="bg-[var(--admin-bg-subtle)] p-2.5 rounded-[4px] border border-[var(--admin-border-subtle)] flex items-center gap-3">
              <AdminSkeleton className="w-11 h-11 rounded-[4px] shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <AdminSkeleton className="w-3/4 h-3.5 rounded" />
                <AdminSkeleton className="w-1/2 h-3 rounded" />
              </div>
            </div>

            {/* Footer: Value / Metric + Action */}
            <div className="flex items-center justify-between pt-1 border-t border-[var(--admin-border-subtle)]">
              <div className="space-y-1">
                <AdminSkeleton className="w-16 h-4 rounded" />
                <AdminSkeleton className="w-20 h-2.5 rounded" />
              </div>
              <AdminSkeleton className="w-20 h-7 rounded-[4px] shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonForm({ fields = 4, className = '' }) {
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

export function SkeletonProfile({ className = '' }) {
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
          <div
            key={i}
            className="flex justify-between py-3 border-b border-[var(--admin-border-subtle)] last:border-0"
          >
            <AdminSkeleton className="w-24 h-4 rounded" />
            <AdminSkeleton className="w-32 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5, className = '' }) {
  return (
    <div className={`admin-card p-4 flex flex-col gap-2 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)]"
        >
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

export function SkeletonWizard({ steps = 4, className = '' }) {
  return (
    <div className={`space-y-6 admin-animate-in ${className}`} aria-busy="true">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <AdminSkeleton className="w-10 h-10 rounded-full shrink-0" />
          <div>
            <AdminSkeleton className="w-32 h-4 mb-2 rounded" />
            <AdminSkeleton className="w-48 h-3 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AdminSkeleton className="w-24 h-8 rounded-full hidden md:block" />
          <AdminSkeleton className="w-40 h-8 rounded-full hidden md:block" />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="admin-card p-4 hidden lg:block overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] px-2">
          {Array.from({ length: steps }).map((_, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <AdminSkeleton className="w-8 h-8 rounded-xl shrink-0" />
                <div className="space-y-1">
                  <AdminSkeleton className="w-12 h-2.5 rounded" />
                  <AdminSkeleton className="w-20 h-3 rounded" />
                </div>
              </div>
              {i < steps - 1 && <AdminSkeleton className="flex-1 h-[2px] mx-4 rounded-full" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="lg:hidden admin-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AdminSkeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-1">
            <AdminSkeleton className="w-16 h-2 rounded" />
            <AdminSkeleton className="w-24 h-3 rounded" />
          </div>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="admin-card p-5 sm:p-8 space-y-8">
        <div className="space-y-2">
          <AdminSkeleton className="w-48 h-6 rounded" />
          <AdminSkeleton className="w-64 h-3 rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <AdminSkeleton className="w-24 h-3 rounded" />
            <AdminSkeleton className="w-full h-11 rounded-[var(--admin-radius-lg)]" />
          </div>
          <div className="space-y-2">
            <AdminSkeleton className="w-32 h-3 rounded" />
            <AdminSkeleton className="w-full h-11 rounded-[var(--admin-radius-lg)]" />
          </div>
        </div>

        <div className="space-y-2">
          <AdminSkeleton className="w-24 h-3 rounded" />
          <AdminSkeleton className="w-full h-32 rounded-[var(--admin-radius-lg)]" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--admin-border-subtle)]">
          <AdminSkeleton className="w-24 h-10 rounded-[var(--admin-radius-lg)]" />
          <AdminSkeleton className="w-32 h-10 rounded-[var(--admin-radius-lg)]" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonBox({
  width = 'w-10',
  height = 'h-10',
  rounded = 'md',
  className = '',
  style,
}) {
  const isWidthClass =
    typeof width === 'string' &&
    (width.startsWith('w-') || width.startsWith('max-w') || width.startsWith('min-w'));
  const isHeightClass =
    typeof height === 'string' &&
    (height.startsWith('h-') || height.startsWith('max-h') || height.startsWith('min-h'));

  const roundedClass =
    rounded === 'full'
      ? 'rounded-full'
      : rounded === 'sm'
        ? 'rounded-[3px]'
        : rounded === 'lg'
          ? 'rounded-lg'
          : rounded === 'xl'
            ? 'rounded-xl'
            : rounded === 'xs'
              ? 'rounded-[2px]'
              : 'rounded-[4px]';

  const computedStyle = {
    ...(!isWidthClass && width ? { width } : {}),
    ...(!isHeightClass && height ? { height } : {}),
    ...style,
  };

  const computedClasses = [
    isWidthClass ? width : '',
    isHeightClass ? height : '',
    roundedClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <AdminSkeleton className={computedClasses} style={computedStyle} />;
}

export function SkeletonTextLine({ width = 'w-24', height = 'h-3.5', className = '', style }) {
  const isWidthClass =
    typeof width === 'string' &&
    (width.startsWith('w-') || width.startsWith('max-w') || width.startsWith('min-w'));
  const isHeightClass =
    typeof height === 'string' &&
    (height.startsWith('h-') || height.startsWith('max-h') || height.startsWith('min-h'));

  const computedStyle = {
    ...(!isWidthClass && width ? { width } : {}),
    ...(!isHeightClass && height ? { height } : {}),
    ...style,
  };

  const computedClasses = [
    isWidthClass ? width : '',
    isHeightClass ? height : '',
    'rounded',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <AdminSkeleton className={computedClasses} style={computedStyle} />;
}

export function SkeletonBadge({ width = 'w-16', height = 'h-5', className = '', style }) {
  const isWidthClass =
    typeof width === 'string' &&
    (width.startsWith('w-') || width.startsWith('max-w') || width.startsWith('min-w'));
  const isHeightClass =
    typeof height === 'string' &&
    (height.startsWith('h-') || height.startsWith('max-h') || height.startsWith('min-h'));

  const computedStyle = {
    ...(!isWidthClass && width ? { width } : {}),
    ...(!isHeightClass && height ? { height } : {}),
    ...style,
  };

  const computedClasses = [
    isWidthClass ? width : '',
    isHeightClass ? height : 'h-5',
    'rounded-full',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <AdminSkeleton className={computedClasses} style={computedStyle} />;
}

export function SkeletonButton({ width = 'w-24', height = 'h-[42px]', className = '' }) {
  return <AdminSkeleton className={`${width} ${height} rounded-[4px] shrink-0 ${className}`} />;
}

export function SkeletonAvatar({ size = 'w-10 h-10', className = '' }) {
  return <AdminSkeleton className={`${size} rounded-full shrink-0 ${className}`} />;
}

export function SkeletonInput({ height = 'h-10', className = '' }) {
  return <AdminSkeleton className={`w-full ${height} rounded-[4px] ${className}`} />;
}

export function SkeletonHeader({
  titleWidth = 'w-44',
  subtitleWidth = 'w-64',
  hasAction = true,
  actionWidth = 'w-32',
  className = '',
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${className}`}
    >
      <div className="space-y-2">
        <AdminSkeleton className={`${titleWidth} h-7 rounded-[4px]`} />
        <AdminSkeleton className={`${subtitleWidth} h-4 rounded-[4px]`} />
      </div>
      {hasAction && <AdminSkeleton className={`${actionWidth} h-[42px] rounded-[4px] shrink-0`} />}
    </div>
  );
}

export function SkeletonToolbar({
  hasFilters = true,
  hasExport = false,
  hasSecondary = false,
  className = '',
}) {
  return (
    <div
      className={`sticky top-[var(--admin-topbar-height,56px)] z-20 -my-2 py-2.5 bg-[var(--admin-bg)]/95 backdrop-blur-md mb-6 ${className}`}
    >
      <div className="flex flex-row items-center gap-2 w-full">
        <div className="relative flex-1 min-w-0 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border)] flex items-center px-3 h-[42px]">
          <AdminSkeleton className="w-5 h-5 rounded shrink-0 mr-2" />
          <AdminSkeleton className="w-1/3 h-3.5 rounded" />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {hasFilters && <SkeletonButton width="w-10 sm:w-28" />}
          {hasExport && <SkeletonButton width="w-10 sm:w-28" />}
          {hasSecondary && <SkeletonButton width="w-10 sm:w-24" />}
        </div>
      </div>
    </div>
  );
}
