import { Hourglass, ListTodo, Check } from 'lucide-react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { STATUS_STEPS } from '../constants';

export function TimelineTracker({ currentStatusIndex, isTimelineExpanded, setIsTimelineExpanded }) {
  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs text-left font-body space-y-5">
      <div className="pb-4 mb-2 border-b border-outline-variant/20 flex justify-between items-center">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">route</span>
          Journey Tracker
        </h2>
        <span className="text-[8px] bg-surface-container-lowest text-secondary px-2 py-0.5 rounded uppercase tracking-widest border border-outline-variant/40 font-bold">
          Phase {currentStatusIndex + 1} of {STATUS_STEPS.length}
        </span>
      </div>

      <div className="space-y-3">
        <div className="w-full h-1.5 bg-surface-container border border-outline-variant/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentStatusIndex + 1) / STATUS_STEPS.length) * 100}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-secondary uppercase tracking-widest font-bold">
          <span>Inquiry</span>
          <span>Active Celebration</span>
          <span>Completed</span>
        </div>
      </div>

      <div className="p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/20 flex items-start gap-4">
        <div className="w-8 h-8 rounded-full border border-outline-variant/40 text-secondary flex items-center justify-center shrink-0 animate-pulse bg-surface-bright">
          <Hourglass className="text-[14px]" strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <span className="text-secondary text-[9px] uppercase tracking-widest font-bold">
            Current Phase: {STATUS_STEPS[currentStatusIndex]?.label}
          </span>
          <p className="text-[11px] text-on-surface font-medium leading-relaxed">
            {STATUS_STEPS[currentStatusIndex]?.desc}
          </p>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-surface-container-low transition-colors font-bold text-[9px] uppercase tracking-widest text-on-surface border border-outline-variant/20 rounded-lg text-left cursor-pointer bg-transparent"
        >
          <span className="flex items-center gap-1.5">
            <ListTodo className="text-[14px]" strokeWidth={1.5} />
            {isTimelineExpanded ? 'Hide Full Timeline Roster' : 'View Full Timeline Roster'}
          </span>
          <span
            className={`material-symbols-outlined text-[16px] text-secondary transition-transform duration-200 ${isTimelineExpanded ? 'rotate-180' : ''}`}
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
              className="overflow-hidden mt-6 pl-4 border-l border-outline-variant/30 space-y-6 ml-3"
            >
              {STATUS_STEPS.map((step, idx) => {
                const isPast = currentStatusIndex > idx;
                const isCurrent = currentStatusIndex === idx;
                return (
                  <div key={step.id} className="relative pl-6">
                    <div
                      className={`absolute -left-[24px] top-0.5 w-3 h-3 rounded-full border-2 transition-colors flex items-center justify-center ${
                        isCurrent
                          ? 'bg-black border-black scale-125 shadow-sm'
                          : isPast
                            ? 'bg-secondary/20 border-secondary/50'
                            : 'bg-surface-bright border-outline-variant/30'
                      }`}
                    >
                      {isPast && (
                        <Check className="text-[8px] text-black font-bold" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h4
                        className={`text-[11px] uppercase tracking-widest ${isCurrent ? 'text-on-surface font-bold' : isPast ? 'text-secondary font-bold' : 'text-secondary/50 font-semibold'}`}
                      >
                        {step.label}
                      </h4>
                      <p className="text-[10px] text-secondary font-medium leading-relaxed">
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
