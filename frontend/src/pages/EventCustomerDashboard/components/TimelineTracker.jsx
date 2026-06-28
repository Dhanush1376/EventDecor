import { m as motion, AnimatePresence } from 'framer-motion';
import { STATUS_STEPS } from '../constants';

export function TimelineTracker({ currentStatusIndex, isTimelineExpanded, setIsTimelineExpanded }) {
  return (
    <div className="bg-surface-bright rounded-lg border border-outline-variant/40 p-6 space-y-6 shadow-xs text-[11px] text-left">
      <div className="flex justify-between items-center border-b border-black/5 pb-4">
        <div className="space-y-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-secondary block">
            Timeline Status
          </span>
          <h3 className="font-bold text-[18px] text-on-surface tracking-tight">
            Setup Progress Tracker
          </h3>
        </div>
        <span className="text-[10px] text-secondary font-mono tracking-widest uppercase font-bold bg-surface-container-lowest border border-outline-variant/40 px-3 py-1.5 rounded-[32px]">
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

      <div className="p-5 bg-surface-container-lowest rounded-lg border border-outline-variant/30 flex items-start gap-4">
        <div className="w-8 h-8 rounded-full border border-outline-variant/40 text-secondary flex items-center justify-center shrink-0 mt-0.5 animate-pulse bg-surface-bright">
          <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
        </div>
        <div className="space-y-2">
          <span className="bg-[#2A2927] text-white px-3 py-1 rounded-[32px] text-[8px] uppercase tracking-widest font-bold">
            Current Phase: {STATUS_STEPS[currentStatusIndex]?.label}
          </span>
          <p className="text-[11px] text-secondary font-medium leading-relaxed">
            {STATUS_STEPS[currentStatusIndex]?.desc}
          </p>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}
          className="flex items-center justify-between w-full px-5 py-3 rounded-lg border border-outline-variant/40 text-on-surface hover:bg-surface-container-lowest transition-colors text-[10px] uppercase tracking-widest font-bold cursor-pointer"
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
                        <span className="material-symbols-outlined text-[8px] text-black font-bold">
                          check
                        </span>
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
