import { motion } from 'framer-motion';

export function FilterTabs({ options, value, onChange, layoutId = 'activeFilterTab' }) {
  return (
    <div className="flex justify-center mb-6 w-full px-2 sm:px-0">
      <div className="flex w-full max-w-sm gap-1 p-1.5 items-center bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-lg shadow-inner">
        {options.map((f) => {
          const isActive = value === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onChange(f.id)}
              className={`relative flex-1 h-9 lg:h-8 flex items-center justify-center rounded-lg font-label text-[10px] sm:text-[11px] uppercase tracking-[0.12em] transition-colors duration-300 whitespace-nowrap z-10 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer border-0 ${
                isActive
                  ? 'text-primary font-bold bg-transparent'
                  : 'text-on-surface-variant/70 hover:text-on-surface font-medium bg-transparent'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute inset-0 bg-surface-bright rounded-lg shadow-[0_2px_8px_rgba(115,92,0,0.08)] border border-outline-variant/15 -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
