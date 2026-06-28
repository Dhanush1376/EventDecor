import { motion, AnimatePresence } from 'framer-motion';
import { useDashboard } from '../../context/DashboardContext';
import { AddressCard } from '../../components/dashboard/AddressCard';

export function AddressesSection() {
  const {
    isAddressesLoading,
    addresses,
    setEditingAddressId,
    setAddressFormData,
    setIsAddressModalOpen,
    user,
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
                name: user?.name || '',
                phone: user?.phone || '',
                alternatePhone: '',
                email: user?.email || '',
                pincode: '',
                locality: '',
                addressString: '',
                landmark: '',
                city: '',
                state: '',
                country: 'India',
                tag: 'Home',
                deliveryInstructions: '',
                latitude: null,
                longitude: null,
              });
              setIsAddressModalOpen(true);
            }}
            className="w-8 h-8 p-0 min-h-0 rounded-full border border-primary/50 text-primary bg-transparent flex items-center justify-center cursor-pointer hover:bg-primary hover:text-surface transition-all shrink-0 shadow-sm"
            title="Add New Delivery Destination"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
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
            {[...addresses]
              .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
              .map((addr) => (
                <AddressCard key={addr._id || addr.id} addr={addr} />
              ))}
          </AnimatePresence>
        </div>
      )}

      {addresses.length === 0 && !isAddressesLoading && (
        <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-10 text-center shadow-xs flex flex-col items-center justify-center min-h-[40vh]">
          <div className="w-12 h-12 rounded-full bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-center mb-4 text-secondary">
            <span className="material-symbols-outlined text-[20px]">pin_drop</span>
          </div>
          <h3 className="font-bold text-[10px] uppercase tracking-widest text-on-surface mb-2">
            No Delivery Sites
          </h3>
          <p className="text-secondary text-[9px] font-bold uppercase tracking-widest max-w-[250px] mb-6">
            Configure your delivery locations or event site parameters here.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => {
                setEditingAddressId('new');
                setAddressFormData({
                  id: 'new',
                  name: user?.name || '',
                  phone: user?.phone || '',
                  alternatePhone: '',
                  email: user?.email || '',
                  pincode: '',
                  locality: '',
                  addressString: '',
                  landmark: '',
                  city: '',
                  state: '',
                  country: 'India',
                  tag: 'Home',
                  deliveryInstructions: '',
                  latitude: null,
                  longitude: null,
                });
                setIsAddressModalOpen(true);
              }}
              className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white border-0 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer outline-none"
            >
              Add New Site
              <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
