import { useDashboard } from '../../context/DashboardContext';

export function AddressCard({ addr }) {
  const { handleSetDefaultAddress, handleAddressEdit, handleDeleteAddress } = useDashboard();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-surface-bright border rounded-lg p-5 shadow-xs flex flex-col justify-between text-[11px] relative transition-colors ${
        addr.isDefault
          ? 'border-primary/80 ring-1 ring-primary/20'
          : 'border-outline-variant/40 hover:border-outline-variant'
      }`}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="bg-surface-container text-secondary text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">
              {addr.tag}
            </span>

            {addr.isDefault ? (
              <span className="text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 border border-green-200 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">check_circle</span>
                Default Destination
              </span>
            ) : (
              <button
                onClick={() => handleSetDefaultAddress(addr._id || addr.id)}
                className="text-[9px] text-primary uppercase font-bold hover:underline cursor-pointer active:scale-[0.98] bg-transparent border-0 p-0"
              >
                Set as Default
              </button>
            )}
          </div>

          <strong className="text-xs text-on-surface block mb-1 font-bold">{addr.name}</strong>
          <p className="text-secondary leading-relaxed mb-3 text-[11px]">
            {addr.addressString}, {addr.locality},<br />
            {addr.city}, {addr.state} -{' '}
            <strong className="text-on-surface font-semibold">{addr.pincode}</strong>
          </p>
          <span className="text-on-surface font-semibold block text-[11px]">
            Mobile Contact: {addr.phone}
          </span>
          {addr.latitude && addr.longitude && (
            <div className="mt-2 text-[9px] text-green-700 font-bold bg-green-50 px-2 py-0.5 border border-green-200 rounded-sm inline-flex items-center gap-1 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[10px]">share_location</span>
              GPS Locked: {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-end gap-3.5 font-bold text-[11px] uppercase tracking-wider">
          <button
            onClick={() => handleAddressEdit(addr)}
            className="text-primary hover:underline cursor-pointer active:scale-[0.98] bg-transparent border-0 p-0"
          >
            Modify
          </button>
          <span className="text-outline-variant">|</span>
          <button
            onClick={() => handleDeleteAddress(addr._id || addr.id)}
            className="text-secondary hover:text-red-600 transition-colors cursor-pointer active:scale-[0.98] bg-transparent border-0 p-0"
          >
            Remove
          </button>
        </div>
      </div>
    </motion.div>
  );
}
