import { m as motion } from 'framer-motion';

export function WizardHeader({ steps, currentStep, setCurrentStep }) {
  return (
    <div className="flex border-b border-[var(--admin-border-subtle)]">
      {steps.map((step, idx) => {
        const isActive = idx === currentStep;
        const isPast = idx < currentStep;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentStep(idx)}
            className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 relative transition-all ${isActive ? 'bg-[var(--admin-surface)]' : 'hover:bg-[var(--admin-surface-muted)]'}`}
          >
            <span
              className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-[var(--admin-accent)]' : isPast ? 'text-success' : 'text-[var(--admin-text-tertiary)]'}`}
            >
              {isPast ? 'check_circle' : step.icon}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-secondary)]'}`}
            >
              {step.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="activeStepIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--admin-accent)]"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
