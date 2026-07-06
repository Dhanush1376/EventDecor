import toast from 'react-hot-toast';
import Check from 'lucide-react/dist/esm/icons/check';

export function MainDeliveryView({
  activeSelectedAddress,
  hasRentalItems,
  setIsSelectingList,
  handleAddNew,
  activeItems,
  deliveryEstimates,
  setActiveStep,
  checkoutSteps,
}) {
  return (
    <div className="bg-surface-container-low -mt-2">
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs mb-4">
        {activeSelectedAddress ? (
          <div className="relative">
            <button
              onClick={() => setIsSelectingList(true)}
              className="absolute top-0 right-0 text-[12px] font-bold text-primary uppercase tracking-wide cursor-pointer py-1 px-2 hover:opacity-85 transition-opacity"
            >
              Change
            </button>

            <div className="pr-16 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-extrabold text-on-surface capitalize">
                  {activeSelectedAddress.name}
                </span>
                <span className="text-[10px] text-secondary/80 font-medium bg-surface-container-low px-1.5 py-0.5 rounded">
                  Default
                </span>
                {activeSelectedAddress.tag && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-primary text-primary rounded-full">
                    {activeSelectedAddress.tag}
                  </span>
                )}
              </div>
            </div>

            <p className="text-[13px] text-on-surface/85 leading-relaxed w-[85%]">
              {activeSelectedAddress.addressString || activeSelectedAddress.address}
              <br />
              {activeSelectedAddress.locality}
              <br />
              {activeSelectedAddress.city}, {activeSelectedAddress.state}{' '}
              {activeSelectedAddress.pincode}
            </p>

            <div className="mt-4 pt-3 border-t border-outline-variant/30 text-[13px] flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-[15px] text-primary">phone</span>
              <span>Mobile:</span>
              <span className="font-extrabold text-on-surface">{activeSelectedAddress.phone}</span>
            </div>

            {hasRentalItems && (
              <div className="mt-4 p-3 bg-green-50 text-green-800 rounded border border-green-100 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] mt-0.5">verified</span>
                <div>
                  <p className="text-[12px] font-bold">Rental Availability Check</p>
                  <p className="text-[11px] mt-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Rentals are available at your pincode.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-6">
            <span className="material-symbols-outlined text-[44px] text-outline-variant mb-2 select-none">
              location_off
            </span>
            <p className="text-[14px] font-bold text-on-surface mb-1">No Delivery Address Found</p>
            <p className="text-[12px] text-secondary mb-4 max-w-xs leading-normal">
              Please add at least one delivery address to continue.
            </p>
            <button
              type="button"
              onClick={handleAddNew}
              className="btn-primary py-2.5 px-6 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Add Address
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-4 shadow-lg z-40 flex justify-center">
        <div className="max-w-[1240px] w-full mx-auto">
          <button
            onClick={() => {
              if (!activeSelectedAddress) {
                toast.error('Please add and select a delivery address first.');
                return;
              }
              const nextIndex = checkoutSteps.indexOf('ADDRESS') + 1;
              setActiveStep(nextIndex);
            }}
            disabled={!activeSelectedAddress}
            className={`w-full py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm transition-colors text-center cursor-pointer ${
              !activeSelectedAddress
                ? 'bg-outline-variant text-on-surface/40 opacity-50 cursor-not-allowed'
                : 'btn-primary !text-white'
            }`}
          >
            Continue to{' '}
            {checkoutSteps[checkoutSteps.indexOf('ADDRESS') + 1] === 'VERIFY'
              ? 'Verification'
              : checkoutSteps[checkoutSteps.indexOf('ADDRESS') + 1] === 'CUSTOMIZATION'
                ? 'Note'
                : 'Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
