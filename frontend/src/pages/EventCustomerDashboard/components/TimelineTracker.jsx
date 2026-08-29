import { Check } from 'lucide-react';
import { STATUS_STEPS } from '../constants';

export function TimelineTracker({ currentStatusIndex, selectedBooking }) {
  const getColorClasses = (color, status, isCurrent) => {
    if (status === 'pending')
      return 'bg-surface-container-high border-outline-variant text-secondary';
    if (status === 'error')
      return 'bg-red-500 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]';

    const colors = {
      slate: 'bg-slate-500 border-slate-500 text-white',
      amber: 'bg-amber-500 border-amber-500 text-white',
      sky: 'bg-sky-500 border-sky-500 text-white',
      indigo: 'bg-indigo-500 border-indigo-500 text-white',
      emerald: 'bg-emerald-500 border-emerald-500 text-white',
    };

    let classes = colors[color] || colors.slate;
    if (isCurrent) {
      classes += ` shadow-[0_0_15px_var(--color-${color}-500,rgba(59,130,246,0.4))] ring-4 ring-${color}-500/20`;
    }
    return classes;
  };

  // Add colors and icons to our constant steps
  const journeySteps = STATUS_STEPS.map((step, idx) => {
    let icon, color;
    switch (step.id) {
      case 'inquiry':
        icon = 'assignment';
        color = 'slate';
        break;
      case 'booking':
        icon = 'credit_card';
        color = 'amber';
        break;
      case 'confirmed':
        icon = 'check_circle';
        color = 'sky';
        break;
      case 'setup':
        icon = 'construction';
        color = 'indigo';
        break;
      case 'completed':
        icon = 'done_all';
        color = 'emerald';
        break;
      default:
        icon = 'radio_button_checked';
        color = 'slate';
    }

    const isCurrent = currentStatusIndex === idx;
    const isCompleted = currentStatusIndex > idx || currentStatusIndex === STATUS_STEPS.length - 1;

    let status = 'pending';
    if (isCompleted || isCurrent) status = 'completed';

    return {
      title: step.label,
      description: step.desc,
      status: status,
      isCurrent: isCurrent,
      icon: icon,
      color: color,
    };
  });

  return (
    <div className="bg-surface-bright border border-outline-variant/40 rounded-lg p-5 shadow-xs relative overflow-hidden font-body text-left">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

      <div className="pb-4 mb-2 border-b border-outline-variant/15">
        <h2 className="text-[9px] font-bold uppercase tracking-widest text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-primary">route</span>
          Event Journey Tracker
        </h2>
      </div>

      <div className="relative pt-3">
        <div className="space-y-0">
          {journeySteps.map((step, idx) => {
            const isLast = idx === journeySteps.length - 1;
            const isCompleted = step.status === 'completed';
            const isError = step.status === 'error';

            return (
              <div key={idx} className="relative pl-8 pb-6 group">
                {/* Connecting Line Segment */}
                {!isLast && (
                  <div
                    className={`absolute left-[11px] top-6 bottom-[-4px] w-[2px] transition-colors duration-500 ${
                      isCompleted && journeySteps[idx + 1]?.status !== 'pending'
                        ? 'bg-emerald-500'
                        : 'border-l-2 border-dashed border-outline-variant/40'
                    }`}
                  />
                )}

                {/* Step Icon / Dot */}
                <div
                  className={`absolute left-0 top-1 w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 z-10 shrink-0 overflow-hidden ${getColorClasses(step.color, step.status, step.isCurrent)}`}
                >
                  {step.status === 'completed' && !step.isCurrent ? (
                    <Check
                      className="font-bold flex items-center justify-center w-full h-full leading-none"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <span
                      className="material-symbols-outlined flex items-center justify-center w-full h-full leading-none"
                      style={{ fontSize: '14px' }}
                    >
                      {step.icon}
                    </span>
                  )}
                </div>

                {/* Step Content */}
                <div
                  className={`transition-all duration-300 ${step.status === 'pending' ? 'opacity-60' : 'opacity-100'} pl-2`}
                >
                  <strong
                    className={`text-[11px] block font-bold tracking-wide ${isError ? 'text-red-600' : 'text-on-surface'}`}
                  >
                    {step.title}
                  </strong>
                  <span className="text-[9px] text-secondary block mt-0.5 tracking-wider leading-relaxed">
                    {step.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
