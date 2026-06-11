import React from 'react';
import { m as motion } from 'framer-motion';

export function CheckoutSteps({
  currentStep,
  onStepClick,
  steps = ['BAG', 'ADDRESS', 'PAYMENT'],
  orderType = 'purchase',
}) {
  return (
    <div className="bg-surface-bright border-b border-outline-variant/40 sticky top-[60px] md:top-[72px] z-40 shadow-[0_2px_15px_rgba(0,0,0,0.03)] backdrop-blur-md bg-surface-bright/95 py-3 sm:py-4 px-3 sm:px-8">
      <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        {/* Left: Brand/Title - Mobile Top Bar */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-start">
          <div className="flex items-center gap-2">
            {orderType === 'rental' && (
              <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-extrabold uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm flex items-center gap-1">
                Rental
              </span>
            )}
          </div>

          {/* Secure badge shows on mobile right side */}
          <div className="md:hidden flex items-center gap-1 text-green-700">
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            <span className="text-[9px] font-bold uppercase tracking-widest">100% Secure</span>
          </div>
        </div>

        {/* Center: Steps */}
        <div className="w-full md:flex-1 flex justify-center overflow-x-auto no-scrollbar pb-1 md:pb-0 px-1">
          <div className="flex items-center justify-between md:justify-center w-full max-w-[600px] text-[9px] sm:text-[11px] font-bold tracking-widest text-secondary uppercase relative">
            {steps.map((step, index) => {
              const isActive = currentStep === index;
              const isCompleted = currentStep > index;

              return (
                <React.Fragment key={step}>
                  <div
                    onClick={() => onStepClick?.(index)}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 z-10 transition-all duration-300 cursor-pointer hover:opacity-80 active:scale-95 group ${isActive || isCompleted ? 'text-on-surface' : 'text-secondary/70'}`}
                  >
                    <motion.div
                      layout
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-[12px] font-extrabold transition-all duration-500 shrink-0 ${isActive ? 'bg-on-surface text-surface shadow-md ring-4 ring-on-surface/10' : isCompleted ? 'bg-on-surface text-surface' : 'bg-surface-container border border-outline-variant/40 text-secondary/70'}`}
                    >
                      {isCompleted ? (
                        <span
                          className="material-symbols-outlined text-[14px] sm:text-[16px] font-bold"
                          style={{ fontVariationSettings: "'FILL' 0, 'wght' 700" }}
                        >
                          check
                        </span>
                      ) : (
                        index + 1
                      )}
                    </motion.div>
                    <span
                      className={`hidden sm:block whitespace-nowrap ${isActive ? 'font-extrabold text-on-surface' : 'font-bold'}`}
                    >
                      {step === 'CUSTOMIZATION' ? 'NOTE' : step}
                    </span>
                    {/* Show text below circle on mobile only */}
                    <span
                      className={`block sm:hidden text-[8px] sm:mt-1 text-center leading-tight whitespace-nowrap mt-[3px] ${isActive ? 'font-extrabold text-on-surface' : 'font-bold text-secondary/60'}`}
                    >
                      {step === 'CUSTOMIZATION' ? 'NOTE' : step}
                    </span>
                  </div>

                  {index < steps.length - 1 && (
                    <div className="flex-1 min-w-[15px] max-w-[90px] relative mx-1 sm:mx-3 h-4 flex items-center mb-[10px] sm:mb-0">
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
        <div className="hidden md:flex items-center gap-1.5 text-green-700">
          <span className="material-symbols-outlined text-[18px]">verified_user</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">100% Secure</span>
        </div>
      </div>
    </div>
  );
}
