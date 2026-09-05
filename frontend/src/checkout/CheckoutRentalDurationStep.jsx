import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCheckout } from './CheckoutProvider';

export default function CheckoutRentalDurationStep() {
  const {
    activeItems,
    setActiveStep,
    rentalStartDate,
    setRentalStartDate,
    rentalEndDate,
    setRentalEndDate,
    handleRentalCostCalculation,
    rentalCostBreakdown,
    rentalAvailability,
    isCheckingAvailability,
    checkoutSteps,
  } = useCheckout();

  // Find the rental item to check availability (backend handles 1 item per checkout currently)
  const rentalItem = activeItems.find((item) => item.type === 'rental');

  useEffect(() => {
    if (rentalStartDate && rentalEndDate && rentalItem) {
      const start = new Date(rentalStartDate);
      const end = new Date(rentalEndDate);
      if (end > start) {
        handleRentalCostCalculation(
          rentalItem.id || rentalItem._id,
          rentalStartDate,
          rentalEndDate,
          rentalItem.quantity || 1,
        );
      }
    }
  }, [rentalStartDate, rentalEndDate, rentalItem, handleRentalCostCalculation]);

  const handleContinue = () => {
    if (!rentalStartDate || !rentalEndDate) {
      toast.error('Please select both a start and end date for your rental.');
      return;
    }
    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    if (end <= start) {
      toast.error('End date must be after the start date.');
      return;
    }

    if (isCheckingAvailability) {
      toast.error('Please wait while we confirm availability.');
      return;
    }

    if (rentalAvailability && !rentalAvailability.available) {
      toast.error(rentalAvailability.reason || 'Selected dates are not available for this item.');
      return;
    }

    if (!rentalCostBreakdown) {
      toast.error('Please wait for cost calculation to complete.');
      return;
    }

    const packageDurationDays =
      rentalItem?.rentalPricing?.rentalDurationDays ||
      rentalItem?.product?.rentalPricing?.rentalDurationDays ||
      7;
    const minRentalDays = rentalItem?.rentalMinDays || rentalItem?.product?.rentalMinDays || 1;

    if (durationDays > packageDurationDays) {
      toast.error(`Rental duration cannot exceed ${packageDurationDays} day(s) for this package.`);
      return;
    }

    if (durationDays < minRentalDays) {
      toast.error(`Minimum rental duration is ${minRentalDays} day(s).`);
      return;
    }

    const nextIndex = checkoutSteps.indexOf('DURATION') + 1;
    setActiveStep(nextIndex); // Proceed to next step
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const packageDurationDays =
    rentalItem?.rentalPricing?.rentalDurationDays ||
    rentalItem?.product?.rentalPricing?.rentalDurationDays ||
    7;
  const minRentalDays = rentalItem?.rentalMinDays || rentalItem?.product?.rentalMinDays || 1;

  const getMaxEndDate = () => {
    if (!rentalStartDate) return undefined;
    const start = new Date(rentalStartDate);
    start.setDate(start.getDate() + packageDurationDays);
    return start.toISOString().split('T')[0];
  };

  const getMinEndDate = () => {
    if (!rentalStartDate) return getMinDate();
    const start = new Date(rentalStartDate);
    start.setDate(start.getDate() + minRentalDays);
    return start.toISOString().split('T')[0];
  };

  // Calculate duration locally for immediate UX feedback
  const durationDays =
    rentalStartDate && rentalEndDate
      ? Math.max(
          1,
          Math.ceil((new Date(rentalEndDate) - new Date(rentalStartDate)) / (1000 * 60 * 60 * 24)),
        )
      : 0;

  return (
    <div className="bg-surface-container-low -mt-2">
      <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-6 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-sans text-xs sm:text-sm font-bold text-on-surface uppercase tracking-wide whitespace-nowrap">
            Rental Duration
          </h2>
          <span className="text-[10px] sm:text-[11px] font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
            Up to {packageDurationDays} Days
          </span>
        </div>

        <p className="text-[12px] sm:text-[13px] text-secondary mb-5 leading-relaxed">
          Please select your rental dates. This package covers any duration up to{' '}
          <strong>{packageDurationDays} days</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div className="relative">
            <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5">
              Start Date*
            </label>
            <input
              type="date"
              min={getMinDate()}
              value={rentalStartDate || ''}
              onChange={(e) => setRentalStartDate(e.target.value)}
              className="w-full min-w-0 overflow-hidden bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
            />
          </div>
          <div className="relative">
            <label className="block text-[10px] uppercase font-bold text-secondary tracking-widest mb-1.5">
              End Date*
            </label>
            <input
              type="date"
              min={getMinEndDate()}
              max={getMaxEndDate()}
              value={rentalEndDate || ''}
              onChange={(e) => setRentalEndDate(e.target.value)}
              className="w-full min-w-0 overflow-hidden bg-white border border-outline-variant/30 rounded-lg px-4 py-3 text-xs outline-none focus:border-primary transition-all font-semibold cursor-pointer"
            />
          </div>
        </div>

        {durationDays > 0 && (
          <div
            className={`p-4 rounded border space-y-2 mb-4 transition-colors ${rentalAvailability?.available === false ? 'bg-red-50 border-red-200' : 'bg-surface-container-low border-outline-variant/30'}`}
          >
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-secondary font-bold">Rental Duration</span>
              <div className="text-right">
                <span className="text-on-surface font-extrabold">{durationDays} Days</span>
                <span className="text-[11px] text-primary/80 block font-medium">
                  (Package covers up to {packageDurationDays} Days)
                </span>
              </div>
            </div>

            {isCheckingAvailability ? (
              <div className="py-2 text-center text-xs text-secondary animate-pulse">
                Checking availability and calculating cost...
              </div>
            ) : rentalAvailability && !rentalAvailability.available ? (
              <div className="py-2 text-center text-xs text-red-600 font-bold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {rentalAvailability.reason || 'Not available for these dates.'}
              </div>
            ) : (
              rentalCostBreakdown && (
                <div className="py-3 text-center text-[12px] text-emerald-600 font-bold flex items-center justify-center gap-1.5 bg-emerald-50/50 rounded border border-emerald-100">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Dates are available! Price updated in summary.
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-4 shadow-lg z-40 flex justify-center">
        <div className="max-w-[768px] w-full mx-auto">
          <button
            onClick={handleContinue}
            disabled={
              isCheckingAvailability || (rentalAvailability && !rentalAvailability.available)
            }
            className="w-full btn-primary py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Address
          </button>
        </div>
      </div>
    </div>
  );
}
