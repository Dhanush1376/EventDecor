import { m as motion, AnimatePresence } from 'framer-motion';
import { STATUS_STEPS } from '../constants';

export function TimelineTracker({ currentStatusIndex, isTimelineExpanded, setIsTimelineExpanded }) {
  return (
    <div className="bg-surface-bright rounded-lg border border-outline-variant/30 p-5 space-y-5 shadow-2xs text-[11px]">
      <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
        <div>
          <span className="font-label text-[8px] uppercase tracking-widest text-primary font-bold block mb-0.5">
            TIMELINE STATUS
          </span>
          <h3 className="font-display text-base text-black font-bold">Setup Progress Tracker</h3>
        </div>
        <span className="text-[10px] text-black/50 font-mono">
          Phase {currentStatusIndex + 1} of {STATUS_STEPS.length}
        </span>
      </div>

      <div className="space-y-2">
        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentStatusIndex + 1) / STATUS_STEPS.length) * 100}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-black/35 uppercase tracking-wider font-semibold">
          <span>Inquiry</span>
          <span>Active Celebration</span>
          <span>Completed</span>
        </div>
      </div>

      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
          <span className="material-symbols-outlined text-[16px]">hourglass_empty</span>
        </div>
        <div className="space-y-1">
          <span className="bg-primary/15 text-primary px-2.5 py-0.5 rounded-full font-label text-[8px] uppercase tracking-wider font-bold">
            Current Phase: {STATUS_STEPS[currentStatusIndex]?.label}
          </span>
          <p className="font-body text-[11px] text-stone-700 leading-relaxed pt-1">
            {STATUS_STEPS[currentStatusIndex]?.desc}
          </p>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-colors font-label text-[10px] uppercase tracking-wider font-bold"
        >
          <span>
            {isTimelineExpanded ? 'Hide Full Timeline Roster' : 'View Full Timeline Roster'}
          </span>
          <span
            className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${isTimelineExpanded ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </button>

        <AnimatePresence>
          {isTimelineExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mt-4 pl-4 border-l border-outline-variant/30 space-y-4 ml-2"
            >
              {STATUS_STEPS.map((step, idx) => {
                const isPast = currentStatusIndex > idx;
                const isCurrent = currentStatusIndex === idx;
                return (
                  <div key={step.id} className="relative pl-6">
                    <div
                      className={`absolute -left-[23px] top-0 w-3.5 h-3.5 rounded-full border-2 transition-colors flex items-center justify-center ${
                        isCurrent
                          ? 'bg-primary border-primary scale-110 shadow-md'
                          : isPast
                            ? 'bg-primary/20 border-primary'
                            : 'bg-surface-bright border-outline-variant/30'
                      }`}
                    >
                      {isPast && (
                        <span className="material-symbols-outlined text-[8px] text-primary font-bold">
                          check
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <h4
                        className={`font-body text-[12px] font-bold ${isCurrent ? 'text-primary font-bold' : isPast ? 'text-black/60 font-semibold' : 'text-black/35 font-normal'}`}
                      >
                        {step.label}
                      </h4>
                      <p className="font-body text-[10px] text-black/40 leading-relaxed font-light">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
