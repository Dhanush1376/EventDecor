import React from 'react';
import toast from 'react-hot-toast';
import { useCheckout } from './CheckoutProvider';

export default function CheckoutVerificationStep() {
  const {
    setActiveStep,
    aadhaarNumber,
    setAadhaarNumber,
    agreementAccepted,
    setAgreementAccepted,
  } = useCheckout();

  const handleAadhaarChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 12);
    setAadhaarNumber(val);
  };

  const handleContinue = () => {
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      toast.error('Please enter a valid 12-digit Aadhaar Number to proceed.');
      return;
    }
    if (!agreementAccepted) {
      toast.error('Please accept the rental agreement to proceed.');
      return;
    }
    setActiveStep(4); // Proceed to Payment
  };

  return (
    <div className="bg-surface-container-low -mt-2">
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs">
        <h2 className="font-sans text-base font-bold text-on-surface uppercase tracking-wider mb-5">
          Identity Verification
        </h2>

        <div className="p-3 bg-blue-50 text-blue-800 rounded text-[12px] font-semibold mb-6 border border-blue-100 flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] mt-0.5">verified_user</span>
          <p>
            To rent items, we require basic identity verification. Your documents are securely
            stored and encrypted.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <label
              htmlFor="aadhaar"
              className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5"
            >
              Aadhaar Number*
            </label>
            <input
              id="aadhaar"
              type="tel"
              required
              placeholder="12-digit Aadhaar Number"
              value={aadhaarNumber}
              onChange={handleAadhaarChange}
              className="w-full bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold"
            />
            <p className="text-[10px] text-secondary mt-1.5 ml-1">
              Enter your 12-digit Aadhaar number
            </p>
          </div>
        </div>

        {/* Rental Agreement Checkbox */}
        <div className="mt-8 pt-4 border-t border-outline-variant/30">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                checked={agreementAccepted}
                onChange={(e) => setAgreementAccepted(e.target.checked)}
                className="peer w-5 h-5 appearance-none rounded border-2 border-outline-variant checked:border-primary checked:bg-primary transition-colors cursor-pointer"
              />
              <span className="material-symbols-outlined text-[16px] text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100">
                check
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-on-surface group-hover:text-primary transition-colors">
                I accept the Rental Agreement <span className="text-red-500">*</span>
              </p>
              <p className="text-[11px] text-secondary mt-1 leading-relaxed">
                I agree to the terms and conditions regarding the rental period, security deposit,
                and potential damage/late fees as outlined in the rental policy.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-4 shadow-lg z-40 flex justify-center">
        <div className="max-w-[768px] w-full mx-auto">
          <button
            onClick={handleContinue}
            disabled={!aadhaarNumber || aadhaarNumber.length !== 12 || !agreementAccepted}
            className="w-full btn-primary py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
}
