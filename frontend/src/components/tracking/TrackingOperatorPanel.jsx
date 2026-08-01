import { ShieldCheck } from 'lucide-react';
import React from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';

const statusIcons = {
  Pending: 'schedule',
  Confirmed: 'thumb_up',
  Packed: 'inventory_2',
  'Ready to Ship': 'local_shipping',
  Shipped: 'local_shipping',
  'Out for Delivery': 'directions_run',
  Delivered: 'check_circle',
  Cancelled: 'cancel',
  Returned: 'keyboard_return',
  Refunded: 'payments',
};

export function TrackingOperatorPanel({
  showOperatorPanel,
  setShowOperatorPanel,
  isPinVerified,
  setIsPinVerified,
  operatorPin,
  setOperatorPin,
  operatorNote,
  setOperatorNote,
  verifyCourierPin,
  handleStatusUpdate,
  updatingStatus,
}) {
  return (
    <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Logistics Scanner Terminal
          </h3>
          <p className="text-[10px] text-secondary font-light mt-0.5">
            For courier agents and warehouse managers scanning package labels.
          </p>
        </div>
        <button
          onClick={() => setShowOperatorPanel(!showOperatorPanel)}
          className="px-4 py-2 border border-primary text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5 transition-all cursor-pointer"
        >
          {showOperatorPanel ? 'Lock Terminal' : 'Initialize Scanner Mode'}
        </button>
      </div>

      <AnimatePresence>
        {showOperatorPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-4 pt-4 border-t border-dashed border-outline-variant/30"
          >
            {!isPinVerified ? (
              <form onSubmit={verifyCourierPin} className="max-w-xs space-y-3">
                <label className="block text-[9px] uppercase font-bold text-secondary tracking-widest">
                  Enter Logistics Bypass PIN
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="••••"
                    value={operatorPin}
                    onChange={(e) => setOperatorPin(e.target.value)}
                    className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2 text-xs font-bold tracking-widest w-24 text-center outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-dark text-white rounded-xl px-6 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Authorize
                  </button>
                </div>
                <span className="block text-[8px] text-secondary font-light">
                  Default Bypass PIN for courier scanning verification: <strong>SIRI2026</strong>
                </span>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex items-center justify-between text-green-700">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-sm font-bold" strokeWidth={1.5} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Logistics Operator Session Authorized
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsPinVerified(false);
                      setOperatorPin('');
                    }}
                    className="text-[9px] text-red-600 font-bold uppercase hover:underline"
                  >
                    Reset Session
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest">
                    ATELIER/TRANSIT SCAN NOTE
                  </label>
                  <input
                    type="text"
                    placeholder="Enter courier notes (e.g. Dispatched from Ongole warehouse, Out for delivery at Jubilee Hills hub)"
                    value={operatorNote}
                    onChange={(e) => setOperatorNote(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-primary transition-all font-semibold"
                  />

                  <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest pt-2">
                    TAP CORRESPONDING SCAN EVENT TO UPDATE
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Packed',
                      'Ready to Ship',
                      'Shipped',
                      'Out for Delivery',
                      'Delivered',
                      'Cancelled',
                    ].map((s) => (
                      <button
                        key={s}
                        disabled={updatingStatus}
                        onClick={() => handleStatusUpdate(s)}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-surface border border-outline-variant/40 rounded-xl text-[10.5px] font-bold text-secondary hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.96]"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {statusIcons[s]}
                        </span>
                        <span>{s}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
