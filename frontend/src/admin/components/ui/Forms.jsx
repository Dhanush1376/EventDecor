import React, { useState, useRef, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { StatusBadge } from './Indicators';

export function AdminField({ label, description, frontendTarget, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="admin-label mb-0">{label}</label>
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

export function AdminInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
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

export function AdminTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
  className = '',
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

export function AdminToggle({
  label,
  description,
  consequence,
  statusBadge,
  checked,
  onChange,
  disabled = false,
  size = 'md',
  variant = 'accent',
  activeBgColor = null,
  className = '',
  ...props
}) {
  const isSm = size === 'sm';
  const translateDistance = 16;

  const trackStyle = activeBgColor && checked ? { backgroundColor: activeBgColor } : {};

  const switchEl = (
    <button
      role="switch"
      type="button"
      aria-checked={!!checked}
      aria-label={label || props['aria-label'] || 'Toggle'}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`admin-toggle-btn ${isSm ? 'touch-target-sm' : 'touch-target-md'} ${className}`}
      {...props}
    >
      <div
        className={`admin-toggle-track ${isSm ? 'size-sm' : 'size-md'}`}
        data-state={checked ? 'checked' : 'unchecked'}
        data-variant={variant}
        style={trackStyle}
      >
        <motion.div
          animate={{ x: checked ? translateDistance : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`admin-toggle-thumb ${isSm ? 'size-sm' : 'size-md'}`}
        />
      </div>
    </button>
  );

  if (!label && !description && !consequence && !statusBadge) return switchEl;

  return (
    <div
      className={`flex flex-row items-center justify-between py-3 border-b border-[var(--admin-border-subtle)] w-full gap-4 ${className}`}
    >
      <div className="text-left flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {label && (
            <span className="text-[13px] text-[var(--admin-text-primary)] font-bold block">
              {label}
            </span>
          )}
          {statusBadge && <StatusBadge status={statusBadge} className="scale-90 origin-left" />}
        </div>
        {description && (
          <p className="text-[11px] text-[var(--admin-text-tertiary)] mt-0.5 leading-normal">
            {description}
          </p>
        )}
        {consequence && (
          <p
            className={`text-[11px] font-semibold mt-1.5 flex items-center gap-1.5 ${checked ? 'text-[var(--admin-domain-revenue)]' : 'text-[var(--admin-domain-danger)]'}`}
          >
            <span className="material-symbols-outlined text-[13px]">
              {checked ? 'check_circle' : 'warning'}
            </span>
            {consequence}
          </p>
        )}
      </div>
      <div className="shrink-0">{switchEl}</div>
    </div>
  );
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 250 && rect.top > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full admin-input !bg-[var(--admin-surface-muted)] flex items-center justify-between transition-colors text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--admin-border-strong)]'
        }`}
      >
        <span
          className={`block truncate pr-2 ${selectedOption ? 'text-[var(--admin-text-primary)] font-semibold' : 'text-[var(--admin-text-tertiary)]'}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span
          className={`material-symbols-outlined text-[18px] shrink-0 text-[var(--admin-text-tertiary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: openUpwards ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpwards ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-[999] left-0 w-full bg-[var(--admin-surface)] border border-[var(--admin-border-strong)] rounded-[var(--admin-radius-md)] shadow-[var(--admin-shadow-lg)] overflow-hidden ${
              openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
              {options.length === 0 ? (
                <div className="px-4 py-3 text-[13px] text-[var(--admin-text-tertiary)] text-center font-medium">
                  No options available
                </div>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center justify-between group ${
                      value === opt.value
                        ? 'bg-[var(--admin-accent)] text-white font-medium'
                        : 'text-[var(--admin-text-primary)] font-medium hover:bg-[var(--admin-surface-muted)]'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {value === opt.value && (
                      <span className="material-symbols-outlined text-[16px] shrink-0 ml-2">
                        check
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
