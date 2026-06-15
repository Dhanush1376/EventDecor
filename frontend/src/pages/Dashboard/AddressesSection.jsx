import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';

export function AddressesSection() {
  const {
    isAddressesLoading,
    addresses,
    setEditingAddressId,
    setAddressFormData,
    setIsAddressModalOpen,
  } = useDashboard();

  return (
    <motion.div
      id="panel-addresses"
      role="tabpanel"
      key="tab-addresses"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 text-left"
    >
      <div className="bg-surface-bright border border-outline-variant/30 rounded-lg p-5 flex flex-col gap-1.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-on-surface tracking-wide">Delivery Sites</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setEditingAddressId('new');
              setAddressFormData({
                id: 'new',
                name: '',
                phone: '',
                pincode: '',
                locality: '',
                addressString: '',
                city: '',
                state: '',
                tag: 'Home',
                latitude: null,
                longitude: null,
              });
              setIsAddressModalOpen(true);
            }}
            className="w-6 h-6 p-0 min-h-0 rounded-full border border-primary/50 text-primary bg-transparent flex items-center justify-center cursor-pointer hover:bg-primary hover:text-surface transition-all shrink-0"
            title="Add New Delivery Destination"
          >
            <span className="material-symbols-outlined text-[12px] font-bold">add</span>
          </motion.button>
        </div>
      </div>

      {isAddressesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-40 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
          <div className="h-40 bg-white border border-outline-variant/20 rounded-lg animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence>
            {addresses.map((addr) => (
              <AddressCard key={addr._id || addr.id} addr={addr} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {addresses.length === 0 && !isAddressesLoading && (
        <div className="text-center max-w-2xl mx-auto py-16 md:py-24 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-6 mx-auto relative">
            <div className="absolute inset-0 bg-primary/15 rounded-full blur-xl" />
            <span className="material-symbols-outlined text-primary text-[30px] relative z-10">
              pin_drop
            </span>
          </div>

          <h2 className="font-display text-[22px] text-on-surface tracking-tight mb-2">
            No Delivery Sites
          </h2>
          <p className="font-body text-[13px] text-secondary/60 font-light max-w-[220px] mx-auto leading-relaxed mb-8">
            Configure your delivery locations or event site parameters here.
          </p>

          <div className="flex justify-center">
            <button
              onClick={() => {
                setEditingAddressId('new');
                setAddressFormData({
                  id: 'new',
                  name: '',
                  phone: '',
                  pincode: '',
                  locality: '',
                  addressString: '',
                  city: '',
                  state: '',
                  tag: 'Home',
                  latitude: null,
                  longitude: null,
                });
                setIsAddressModalOpen(true);
              }}
              className="group inline-flex items-center gap-2 text-on-surface hover:text-primary transition-colors py-2 font-label text-[11px] uppercase tracking-[0.2em] font-bold border-b-2 border-on-surface hover:border-primary bg-transparent border-0 cursor-pointer outline-none"
            >
              <span>Add New Site</span>
              <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
