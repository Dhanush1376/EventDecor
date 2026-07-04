import { motion } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';

export function AddressCard({ addr }) {
  const { handleSetDefaultAddress, handleAddressEdit, handleDeleteAddress } = useDashboard();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`bg-surface-bright border rounded-lg overflow-hidden shadow-2xs hover:shadow-sm transition-all text-left flex flex-col justify-between text-[11px] relative font-body ${
        addr.isDefault
          ? 'border-outline-variant/30 ring-1 ring-primary/10'
          : 'border-outline-variant/20'
      }`}
    >
      {/* Card Header Strip */}
      <div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant/15">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-primary shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface">
            {addr.tag}
          </span>
        </div>

        {addr.isDefault ? (
          <span className="text-[9px] text-primary font-bold bg-primary/5 px-2 py-0.5 border border-primary/20 rounded-sm flex items-center gap-1 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            Default
          </span>
        ) : (
          <button
            onClick={() => handleSetDefaultAddress(addr._id || addr.id)}
            className="text-[9px] text-primary uppercase font-bold hover:underline cursor-pointer active:scale-[0.98] bg-transparent border-0 p-0"
          >
            Set Default
          </button>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col h-full">
        <h4 className="font-display font-medium text-on-surface text-[12px] block mb-1">
          {addr.name}
        </h4>
        <p className="text-secondary text-[10px] font-light font-body leading-relaxed mb-3">
          {addr.addressString}, {addr.locality},<br />
          {addr.city}, {addr.state} -{' '}
          <span className="font-medium text-on-surface">{addr.pincode}</span>
        </p>

        <div className="flex items-center gap-1.5 font-body">
          <span className="text-[10px] text-secondary font-light">Contact:</span>
          <span className="text-xs font-bold text-on-surface">{addr.phone}</span>
        </div>

        {addr.latitude && addr.longitude && (
          <div className="mt-3 text-[9px] text-primary font-bold bg-primary/5 px-2 py-1 border border-primary/20 rounded inline-flex items-center gap-1 uppercase tracking-wider w-fit">
            <span className="material-symbols-outlined text-[12px]">share_location</span>
            Locked: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="px-4 py-2.5 bg-surface-container-low/40 border-t border-outline-variant/15 flex items-center justify-end gap-3 text-[10px] text-secondary font-body">
        <button
          onClick={() => handleAddressEdit(addr)}
          className="text-primary hover:underline font-bold uppercase tracking-widest cursor-pointer bg-transparent border-0 p-0 transition-colors"
        >
          Modify
        </button>
        <span className="text-outline-variant/50">|</span>
        <button
          onClick={() => handleDeleteAddress(addr._id || addr.id)}
          className="text-secondary hover:text-red-600 transition-colors font-bold uppercase tracking-widest cursor-pointer bg-transparent border-0 p-0"
        >
          Remove
        </button>
      </div>
    </motion.div>
  );
}
