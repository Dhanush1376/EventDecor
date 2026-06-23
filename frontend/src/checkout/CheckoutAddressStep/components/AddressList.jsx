import { m as motion, AnimatePresence } from 'framer-motion';

export function AddressList({
  savedAddresses,
  selectedAddressId,
  setSelectedAddressId,
  handleEdit,
  handleAddNew,
  setIsSelectingList,
}) {
  return (
    <div className="bg-surface-container-low pb-24 -mt-2">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto flex items-center justify-between mb-2">
        <h2 className="font-display text-sm font-extrabold text-on-surface uppercase tracking-wider">
          Saved Addresses
        </h2>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary/50 text-[10px] font-bold text-primary hover:bg-primary/5 transition-colors uppercase tracking-widest cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add New
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 flex flex-col gap-4">
        {savedAddresses.map((addr) => {
          const addrId = addr._id || addr.id;
          const isSelected = selectedAddressId === addrId;
          return (
            <div
              key={addrId}
              onClick={() => setSelectedAddressId(addrId)}
              className={`relative p-5 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-outline-variant/40 bg-surface-bright hover:border-primary/40 hover:shadow-sm'
              }`}
            >
              <div className="flex gap-4">
                <div className="pt-1 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-colors ${
                      isSelected ? 'border-primary' : 'border-outline-variant'
                    }`}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[14px] font-extrabold text-on-surface capitalize">
                      {addr.name}
                    </span>
                    {addr.tag && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-primary text-primary rounded-full bg-primary/10">
                        {addr.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-on-surface/85 leading-relaxed w-[90%] mb-2">
                    {addr.addressString || addr.address}, {addr.locality}, {addr.city}, {addr.state}{' '}
                    {addr.pincode}
                  </p>
                  <div className="text-[12px] flex items-center gap-1.5 text-secondary">
                    <span className="material-symbols-outlined text-[14px] text-primary">
                      phone
                    </span>
                    <span>Mobile:</span>
                    <span className="font-extrabold text-on-surface">{addr.phone}</span>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex gap-3 overflow-hidden"
                      >
                        <button className="px-5 py-2 border border-outline-variant/40 rounded-full text-[10px] font-bold text-on-surface uppercase tracking-widest hover:bg-surface-container transition-colors cursor-pointer bg-white">
                          Remove
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(addr);
                          }}
                          className="px-5 py-2 border border-outline-variant/40 rounded-full text-[10px] font-bold text-on-surface uppercase tracking-widest hover:bg-surface-container transition-colors cursor-pointer bg-white"
                        >
                          Edit
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-4 shadow-lg z-40 flex justify-center">
        <div className="max-w-[1240px] w-full mx-auto">
          <button
            onClick={() => setIsSelectingList(false)}
            className="w-full btn-primary py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm transition-colors text-center !text-white"
          >
            Confirm Address
          </button>
        </div>
      </div>
    </div>
  );
}
