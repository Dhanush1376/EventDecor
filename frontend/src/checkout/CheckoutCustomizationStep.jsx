import React from 'react';
import toast from 'react-hot-toast';
import { useCheckout } from './CheckoutProvider';

/**
 * Clean, lightweight Customization Note step.
 * Focused entirely on gathering item notes without text bloat.
 */
export function CheckoutCustomizationStep({ onNext }) {
  const {
    activeStep,
    setActiveStep,
    checkoutSteps,
    activeItems,
    customizationNotes,
    setCustomizationNotes,
  } = useCheckout();

  const stepIndex0Based = checkoutSteps.indexOf('CUSTOMIZATION');
  const isComplete = activeStep > stepIndex0Based;

  const customizableItems = React.useMemo(() => {
    return (activeItems || []).filter(
      (item) => item.product?.customizationConfig?.enabled || item.customizationConfig?.enabled,
    );
  }, [activeItems]);

  if (activeStep !== stepIndex0Based && !isComplete) return null;

  // Validate required customizations
  const canProceed = customizableItems.every((item) => {
    const config = item.product?.customizationConfig || item.customizationConfig;
    if (config?.required) {
      const key = `${item.id || item._id || item.productId}-${item.variant || 'default'}`;
      const note = customizationNotes[key];
      return !!note && note.trim().length > 0;
    }
    return true;
  });

  const handleBack = () => {
    const prevIndex = Math.max(0, activeStep - 1);
    setActiveStep(prevIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (!canProceed) {
      toast.error('Please enter the required customization note.');
      return;
    }
    if (onNext) {
      onNext();
    } else {
      setActiveStep(activeStep + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      {/* Simple Header */}
      <div className="pb-1">
        <h2 className="font-label text-[10px] sm:text-[11px] font-bold text-on-surface uppercase tracking-widest flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-primary">edit_note</span>
          Customization Note
        </h2>
      </div>

      {/* Note Cards */}
      <div className="space-y-4">
        {customizableItems.map((item) => {
          const config = item.product?.customizationConfig || item.customizationConfig || {};
          const key = `${item.id || item._id || item.productId}-${item.variant || 'default'}`;
          const value = customizationNotes[key] || '';
          const isRequired = !!config.required;
          const maxLength = config.maxLength || 500;

          return (
            <div
              key={key}
              className="bg-surface-bright rounded-lg border border-outline-variant/40 p-4 sm:p-5 shadow-xs space-y-3"
            >
              {/* Product Info */}
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-md bg-surface-container-low border border-outline-variant/20 overflow-hidden shrink-0">
                  {item.imageSrc ? (
                    <img
                      src={item.imageSrc}
                      alt={item.title || item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline-variant">
                      <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <h3 className="text-[13.5px] font-bold text-on-surface truncate">
                        {item.title || item.name}
                      </h3>
                      {item.variant && item.variant.toLowerCase() !== 'default' && (
                        <span className="text-[10px] text-secondary bg-surface-container-low px-1.5 py-0.5 rounded border border-outline-variant/30 shrink-0">
                          {item.variant}
                        </span>
                      )}
                    </div>
                    {isRequired ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200/60 px-2 py-0.5 rounded-full shrink-0">
                        Required
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-secondary bg-surface-container-low px-2 py-0.5 rounded-full border border-outline-variant/30 shrink-0">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Some of your items are customized
                  </p>
                </div>
              </div>

              {/* Note Textarea */}
              <div className="space-y-1.5">
                <textarea
                  value={value}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= maxLength) {
                      setCustomizationNotes((prev) => ({ ...prev, [key]: val }));
                    }
                  }}
                  placeholder={
                    config.placeholder ||
                    'Enter your customization details (names, dates, colors, or message)...'
                  }
                  rows={3}
                  className="w-full p-3 bg-surface-container-lowest border border-outline-variant/40 rounded-md text-[13px] text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none placeholder:text-secondary/40"
                />
                <div className="flex justify-end text-[10.5px] font-mono text-secondary px-1">
                  {value.length} / {maxLength}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-3 shadow-lg z-40 flex flex-col items-center">
        <div className="max-w-[768px] w-full mx-auto flex gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 bg-transparent text-on-surface font-bold uppercase tracking-widest text-[9px] py-2.5 rounded-full border border-outline-variant/40 hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className="flex-1 btn-primary py-2.5 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-sm transition-all text-center disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 !text-white cursor-pointer"
          >
            <span>Payment</span>
            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
