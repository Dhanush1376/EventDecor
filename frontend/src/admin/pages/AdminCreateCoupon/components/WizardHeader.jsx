import React from 'react';

export function WizardHeader({ steps, currentStep, setCurrentStep }) {
  return (
    <div className="bg-[var(--admin-surface)] p-3 sm:p-4 rounded-[4px] border border-[var(--admin-border)] shadow-xs lg:block hidden overflow-x-auto">
      <div className="flex items-center justify-between min-w-[700px] px-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <React.Fragment key={index}>
              <button
                type="button"
                onClick={() => setCurrentStep(index)}
                className="flex items-center gap-2.5 group cursor-pointer text-left outline-none"
              >
                <div
                  className={`w-8 h-8 rounded-[4px] flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-[var(--admin-accent)] text-white shadow-xs font-bold'
                      : isCompleted
                        ? 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)]'
                        : 'bg-[var(--admin-bg-subtle)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border-subtle)]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isCompleted ? 'check' : step.icon}
                  </span>
                </div>
                <div>
                  <p
                    className={`text-[10.5px] font-bold uppercase tracking-wider ${
                      isActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-tertiary)]'
                    }`}
                  >
                    Step {index + 1}
                  </p>
                  <p
                    className={`text-[12px] font-bold ${
                      isActive
                        ? 'text-[var(--admin-text-primary)]'
                        : 'text-[var(--admin-text-secondary)]'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-4 ${
                    isCompleted ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-subtle)]'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
