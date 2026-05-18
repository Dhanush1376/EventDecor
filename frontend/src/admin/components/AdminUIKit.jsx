import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════
// LIVE CONNECTION BADGE
// ═══════════════════════════════════════════════════════════
export function LiveBadge({ page, section, status = "published" }) {
  const statusConfig = {
    published: {
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      dot: "bg-emerald-500",
      label: "Live",
    },
    modified: {
      color: "text-slate-900 bg-slate-100 border-slate-300",
      dot: "bg-slate-900",
      label: "Modified",
    },
    draft: {
      color: "text-slate-500 bg-slate-50 border-slate-200",
      dot: "bg-slate-400",
      label: "Draft",
    },
  };
  const cfg = statusConfig[status] || statusConfig.draft;

  return (
    <div className="flex items-center gap-2 flex-wrap text-[10px] font-sans">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${cfg.color} font-semibold uppercase tracking-wider text-[9px] transition-all`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === "published" ? "animate-pulse" : ""}`}
        />
        {cfg.label}
      </span>
      <span className="text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1 text-[9px] bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/50">
        <span className="material-symbols-outlined text-[11px] block font-bold text-slate-400">link</span>
        {page}
        {section ? ` → ${section}` : ""}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION HEADER with connection info
// ═══════════════════════════════════════════════════════════
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px] text-slate-500 block">
              {icon}
            </span>
          </div>
        )}
        <div>
          <h2 className="text-[14px] font-semibold text-slate-900 tracking-tight font-sans block leading-tight">
            {title}
          </h2>
          {description && (
            <p className="text-[11px] text-slate-500 mt-0.5 block leading-normal font-normal">{description}</p>
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

// ═══════════════════════════════════════════════════════════
// FRONTEND MINI PREVIEW
// ═══════════════════════════════════════════════════════════
export function FrontendPreview({ label, children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 overflow-hidden shadow-xs bg-white ${className}`}
    >
      <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200/60">
        <div className="flex gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2">
          {label || "Frontend Preview"}
        </span>
        <span className="material-symbols-outlined text-[13px] text-slate-400 ml-auto block">
          visibility
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PUBLISH BAR (Floating action bar for publishing changes)
// ═══════════════════════════════════════════════════════════
export function PublishBar({ hasChanges, onPublish, onReset, lastSaved }) {
  return (
    <AnimatePresence>
      {hasChanges && (
        <motion.div
          initial={{ y: 80, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: 80, x: "-50%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="fixed bottom-8 left-1/2 z-[60] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-5 border border-slate-800 max-w-[95vw] xs:max-w-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                CMS Sandbox
              </span>
              <span className="text-[9px] text-slate-400 font-normal">
                Unpublished changes
              </span>
            </div>
          </div>
          
          <div className="h-6 w-px bg-slate-850" />
          
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all active:scale-95"
            >
              Discard
            </button>
            <button
              onClick={onPublish}
              className="px-4 py-2 rounded-lg text-[11px] font-semibold bg-black hover:bg-slate-900 text-white shadow-sm transition-all flex items-center gap-1.5 uppercase tracking-wider"
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

// ═══════════════════════════════════════════════════════════
// PUBLISH TOAST — Success notification
// ═══════════════════════════════════════════════════════════
export function PublishToast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ y: -40, x: "-50%", opacity: 0, scale: 0.95 }}
          animate={{ y: 0, x: "-50%", opacity: 1, scale: 1 }}
          exit={{ y: -40, x: "-50%", opacity: 0, scale: 0.95 }}
          className="fixed top-20 left-1/2 z-[200] bg-emerald-900 text-emerald-100 border border-emerald-800 px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 text-[11px] font-semibold"
        >
          <span className="material-symbols-outlined text-[15px] text-emerald-400">
            check_circle
          </span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN FIELD
// ═══════════════════════════════════════════════════════════
export function AdminField({
  label,
  description,
  frontendTarget,
  children,
  className = "",
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </label>
        {frontendTarget && (
          <span className="text-[9px] text-black font-medium uppercase tracking-wider flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            <span className="material-symbols-outlined text-[10px] block font-bold">
              arrow_forward
            </span>
            {frontendTarget}
          </span>
        )}
      </div>
      {description && (
        <p className="text-[11px] text-slate-400 font-normal leading-normal block pb-0.5">{description}</p>
      )}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN INPUT — Styled text input
// ═══════════════════════════════════════════════════════════
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
      className={`w-full bg-white rounded-lg px-3 py-2 text-[12px] text-slate-800 outline-none border border-slate-200 focus:border-black focus:ring-1 focus:ring-slate-900 transition-all font-sans ${className}`}
      {...props}
    />
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN TEXTAREA
// ═══════════════════════════════════════════════════════════
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
      className={`w-full bg-white rounded-lg px-3 py-2 text-[12px] text-slate-800 outline-none border border-slate-200 focus:border-black focus:ring-1 focus:ring-slate-900 transition-all font-sans resize-none ${className}`}
      {...props}
    />
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN TOGGLE
// ═══════════════════════════════════════════════════════════
export function AdminToggle({ label, description, checked, onChange, disabled = false }) {
  const switchEl = (
    <button
      role="switch"
      type="button"
      aria-checked={!!checked}
      aria-label={label || "Toggle"}
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`relative shrink-0 p-0 border-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/50 select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
      style={{
        width: "40px",
        height: "22px",
        minHeight: "0px",
        minWidth: "0px",
        borderRadius: "9999px",
        display: "flex",
        alignItems: "center",
        padding: "2px",
        backgroundColor: checked ? "#000000" : "#E2E8F0",
        transition: "background-color 0.2s ease"
      }}
    >
      <motion.div
        animate={{ x: checked ? 18 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
        }}
      />
    </button>
  );

  if (!label && !description) {
    return switchEl;
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 w-full">
      <div className="pr-4 text-left">
        {label && (
          <span className="text-[12px] text-slate-800 font-semibold block">
            {label}
          </span>
        )}
        {description && (
          <p className="text-[11px] text-slate-400 mt-0.5 block leading-normal font-normal">
            {description}
          </p>
        )}
      </div>
      {switchEl}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════
export function StatusBadge({ status }) {
  const cfg = {
    published: "text-emerald-700 bg-emerald-50 border-emerald-200",
    modified: "text-slate-900 bg-slate-100 border-slate-300",
    draft: "text-slate-500 bg-slate-50 border-slate-200",
    active: "text-emerald-700 bg-emerald-50 border-emerald-200",
    inactive: "text-slate-500 bg-slate-50 border-slate-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wider ${cfg[status] || cfg.draft}`}
    >
      {status}
    </span>
  );
}
