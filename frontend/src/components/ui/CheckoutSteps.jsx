import React from 'react';
import { motion } from 'framer-motion';

export function CheckoutSteps({ currentStep, onStepClick }) {
  const steps = ["BAG", "ADDRESS", "PAYMENT"];

  return (
    <div className="bg-surface-bright py-4 px-4 mb-4 border-b border-outline-variant/40 sticky top-0 z-50">
      <div className="max-w-xl mx-auto flex items-center justify-between text-[11px] sm:text-[12px] font-semibold tracking-wider text-secondary uppercase relative">
        
        {steps.map((step, index) => {
          const isActive = currentStep === index;
          const isCompleted = currentStep > index;

          return (
            <React.Fragment key={step}>
              <div 
                onClick={() => onStepClick?.(index)}
                className={`flex items-center gap-1.5 sm:gap-2 z-10 bg-surface-bright transition-all duration-300 cursor-pointer hover:opacity-80 active:scale-95 ${isActive || isCompleted ? 'text-[#c29b38]' : 'text-secondary'}`}
              >
                <motion.div 
                  layout
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-[12px] font-bold transition-all duration-300 ${isActive || isCompleted ? 'bg-[#c29b38] text-surface shadow-sm' : 'bg-surface-container-low text-secondary'}`}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined text-[12px] sm:text-[14px] font-extrabold" style={{ fontVariationSettings: "'FILL' 0, 'wght' 700" }}>check</span>
                  ) : (
                    index + 1
                  )}
                </motion.div>
                <span className={isActive ? "font-extrabold" : "font-bold"}>{step}</span>
              </div>
              
              {/* The connecting line between steps */}
              {index < steps.length - 1 && (
                <div className="flex-1 relative mx-1 sm:mx-3 h-4 flex items-center">
                   {/* Background dashed line */}
                   <div className="absolute w-full border-t-[1.5px] border-dashed border-outline-variant/50 top-1/2 -translate-y-1/2"></div>
                   
                   {/* Animated solid line for completed steps */}
                   <motion.div 
                      className="absolute left-0 h-[2px] bg-[#c29b38] top-1/2 -translate-y-1/2 origin-left z-0"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isCompleted ? 1 : 0 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                   />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
