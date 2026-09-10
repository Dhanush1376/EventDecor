import { ArrowLeft, ShieldCheck, Check } from 'lucide-react';
import React from 'react';
import { m as motion } from 'framer-motion';
export function CheckoutSteps({
  currentStep,
  onStepClick,
  steps = ['BAG', 'ADDRESS', 'PAYMENT'],
  orderType = 'purchase',
}) {
  const getStepLabel = (step) => {
    switch (step) {
      case 'BAG':
        return 'Cart';
      case 'ADDRESS':
        return 'Delivery';
      case 'DURATION':
        return 'Rental Period';
      case 'VERIFY':
        return 'Confirm';
      case 'PAYMENT':
        return 'Pay';
      case 'CUSTOMIZATION':
        return 'Note';
      default:
        return step;
    }
  };

  return (
    <div className="bg-surface-bright border-b border-outline-variant/40 sticky top-[48px] sm:top-[52px] z-40 shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-md bg-surface-bright/95 py-2 sm:py-2.5 px-3 sm:px-6">
      <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Discreet Back Button & Badges (hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-2 min-w-[90px]">
          {currentStep > 0 && onStepClick && (
            <button
              onClick={() => onStepClick(currentStep - 1)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-secondary hover:text-on-surface hover:bg-black/5 text-[11px] font-semibold transition-colors cursor-pointer"
              aria-label="Go back to previous step"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          {orderType === 'rental' && (
            <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-extrabold uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm flex items-center gap-1">
              Rental
            </span>
          )}
        </div>

        {/* Center: Steps */}
        <div className="flex-1 flex justify-center overflow-x-auto no-scrollbar px-1">
          <div className="flex items-center justify-center w-full max-w-[440px] text-[9px] sm:text-[10px] font-bold tracking-wider text-secondary uppercase relative">
            {steps.map((step, index) => {
              const isActive = currentStep === index;
              const isCompleted = currentStep > index;

              return (
                <React.Fragment key={step}>
                  <div
                    onClick={() => onStepClick?.(index)}
                    role="button"
                    aria-label={`Go to ${step} step`}
                    className={`flex flex-col sm:flex-row items-center justify-center p-2 min-w-[48px] min-h-[48px] gap-1 sm:gap-2 z-10 transition-all duration-300 cursor-pointer hover:opacity-80 active:scale-95 group ${isActive || isCompleted ? 'text-on-surface' : 'text-secondary/70'}`}
                  >
                    <motion.div
                      layout
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-[12px] font-extrabold transition-all duration-500 shrink-0 ${isActive ? 'bg-on-surface text-surface shadow-md ring-4 ring-on-surface/10' : isCompleted ? 'bg-on-surface text-surface' : 'bg-surface-container border border-outline-variant/40 text-secondary/70'}`}
                    >
                      {isCompleted ? (
                        <Check className="text-[14px] sm:text-[16px] font-bold" strokeWidth={1.5} />
                      ) : (
                        index + 1
                      )}
                    </motion.div>
                    <span
                      className={`hidden sm:block whitespace-nowrap ${isActive ? 'font-extrabold text-on-surface' : 'font-bold'}`}
                    >
                      {getStepLabel(step)}
                    </span>
                    {/* Show text below circle on mobile only */}
                    <span
                      className={`block sm:hidden text-[8px] sm:mt-1 text-center leading-tight whitespace-nowrap mt-[3px] ${isActive ? 'font-extrabold text-on-surface' : 'font-bold text-secondary/60'}`}
                    >
                      {getStepLabel(step)}
                    </span>
                  </div>

                  {index < steps.length - 1 && (
                    <div className="flex-1 relative mx-1 sm:mx-3 h-4 flex items-center mb-[10px] sm:mb-0">
                      <div className="absolute w-full border-t-[1.5px] border-dashed border-outline-variant/40 top-1/2 -translate-y-1/2"></div>
                      <motion.div
                        className="absolute left-0 h-[2px] bg-on-surface top-1/2 -translate-y-1/2 origin-left z-0 shadow-sm"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: isCompleted ? 1 : 0 }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Right: Secure Badge (Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 text-green-700">
          <ShieldCheck className="text-[18px]" strokeWidth={1.5} />
          <span className="text-[10px] font-bold uppercase tracking-widest">100% Secure</span>
        </div>
      </div>
    </div>
  );
}
