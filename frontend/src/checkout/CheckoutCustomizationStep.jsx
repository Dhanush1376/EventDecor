import React from 'react';
import { useCheckout } from './CheckoutProvider';
import { useCart } from '../context/CartContext';

export function CheckoutCustomizationStep({ onNext }) {
  const {
    activeStep,
    checkoutSteps,
    _hasCustomizableItems,
    customizationNotes,
    setCustomizationNotes,
  } = useCheckout();
  const { purchaseCart, rentalCart } = useCart();

  const stepIndex1Based = checkoutSteps.indexOf('CUSTOMIZATION') + 1;
  const stepIndex0Based = checkoutSteps.indexOf('CUSTOMIZATION');
  const isComplete = activeStep > stepIndex0Based;

  // The activeItems logic replicated from provider
  const activeItems = React.useMemo(() => {
    const isRental = checkoutSteps.includes('DURATION');
    return (isRental ? rentalCart?.items || [] : purchaseCart?.items || []).filter((item) =>
      isRental ? item.type === 'rental' : item.type !== 'rental',
    );
  }, [checkoutSteps, rentalCart?.items, purchaseCart?.items]);

  const customizableItems = activeItems.filter(
    (item) => item.product?.customizationConfig?.enabled || item.customizationConfig?.enabled,
  );

  if (activeStep !== stepIndex0Based && !isComplete) return null;

  // Validate required customizations
  const canProceed = customizableItems.every((item) => {
    const config = item.product?.customizationConfig;
    if (config?.required) {
      const key = `${item.id || item._id}-${item.variant || 'default'}`;
      const note = customizationNotes[key];
      return !!note && note.trim().length > 0;
    }
    return true;
  });

  const handleNext = () => {
    if (canProceed) {
      onNext();
    }
  };

  return (
    <div className="bg-surface-container-low -mt-2">
      {/* Step Header */}
      <div className="bg-surface-bright mb-4 p-4 text-[10px] font-label font-bold text-on-surface uppercase tracking-widest border border-outline-variant/40 rounded-lg shadow-xs">
        Customization Notes
      </div>

      <div className="bg-surface-bright p-5 sm:p-6 shadow-xs border border-outline-variant/40 space-y-6 rounded-lg">
        <p className="text-[13px] text-secondary leading-relaxed">
          Some of your items are customized! Please provide the details below.
        </p>

        <div className="space-y-6">
          {customizableItems.map((item) => {
            const config = item.product.customizationConfig;
            const key = `${item.id || item._id}-${item.variant || 'default'}`;
            const value = customizationNotes[key] || '';

            return (
              <div
                key={key}
                className="border-b border-outline-variant/20 pb-6 last:border-0 last:pb-0"
              >
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-14 h-16 bg-surface-container-low rounded-md overflow-hidden flex-shrink-0 border border-outline-variant/20">
                    {item.imageSrc ? (
                      <img
                        src={item.imageSrc}
                        alt={item.title || item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-outline-variant flex items-center justify-center w-full h-full">
                        image
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-on-surface">
                      {item.title || item.name}
                    </p>
                    <p className="text-[12px] text-secondary mt-0.5">
                      {config.label || 'Customization Details'}
                      {config.required ? (
                        <span className="text-error ml-1 font-bold">(Required)</span>
                      ) : (
                        <span className="text-outline ml-1 italic">(Optional)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={value}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= (config.maxLength || 500)) {
                        setCustomizationNotes((prev) => ({ ...prev, [key]: val }));
                      }
                    }}
                    placeholder={config.placeholder || 'Enter your text here...'}
                    rows={3}
                    className="w-full px-4 py-3 bg-surface-bright border border-outline-variant/40 rounded-lg outline-none focus:border-primary/50 transition-colors text-[13px] resize-none text-on-surface"
                  />
                  <div className="flex justify-between items-center text-[11px] text-secondary px-1">
                    <span>
                      {config.helperText || 'Review your text carefully before proceeding.'}
                    </span>
                    <span>
                      {value.length} / {config.maxLength || 500}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isComplete && activeStep !== stepIndex0Based && (
        <div className="mt-4">
          <p className="text-[13px] text-secondary flex items-center gap-1.5 bg-surface-container-low w-fit px-3 py-1.5 rounded-lg border border-outline-variant/40">
            <span className="material-symbols-outlined text-[14px] text-green-600">edit_note</span>
            Notes added
          </p>
        </div>
      )}

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-bright border-t border-outline-variant/20 p-4 shadow-lg z-40 flex justify-center">
        <div className="max-w-[1240px] w-full mx-auto">
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`w-full py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm transition-colors text-center cursor-pointer ${
              !canProceed
                ? 'bg-outline-variant text-on-surface/40 opacity-50 cursor-not-allowed'
                : 'btn-primary !text-white'
            }`}
          >
            Continue to {checkoutSteps[stepIndex1Based] === 'ADDRESS' ? 'Shipping' : 'Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
