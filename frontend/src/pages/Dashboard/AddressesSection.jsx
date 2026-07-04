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
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 flex items-center justify-between shadow-xs font-body mb-4">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">pin_drop</span>
          Delivery Sites
        </h2>
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
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-bold text-primary hover:bg-primary/5 transition-colors uppercase tracking-widest cursor-pointer bg-transparent border-0"
          title="Add New Delivery Destination"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add New
        </button>
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
          <div className="flex justify-center mt-6">
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
              className="group flex items-center gap-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] pb-2 border-b-[1.5px] border-[#1a1a1a] transition-all hover:opacity-70 bg-transparent outline-none"
            >
              Add New Site
              <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
