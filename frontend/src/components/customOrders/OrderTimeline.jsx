import React from 'react';

export function OrderTimeline({ selectedOrder }) {
  return (
    <div className="bg-[var(--color-surface-ivory)] p-4 rounded-2xl border border-black/5 space-y-2">
      <span className="text-[9px] font-bold uppercase tracking-wider text-[#685C57] block">
        Order Progress
      </span>
      <div className="relative pl-4 border-l border-black/10 space-y-3.5 pt-1 text-[11px]">
        {[
          { st: 'Pending', d: 'Request Submitted' },
          { st: 'Reviewing', d: 'We are checking your request' },
          { st: 'Quote Sent', d: 'Quotation sent to you' },
          { st: 'Approved', d: 'Custom order approved' },
          { st: 'Ready', d: 'Custom decor ready' },
        ].map((stage, idx) => {
          const isPast =
            [
              'Pending',
              'Reviewing',
              'Quote Sent',
              'Approved',
              'In Progress',
              'Ready',
              'Delivered',
            ].indexOf(selectedOrder.status) >=
            [
              'Pending',
              'Reviewing',
              'Quote Sent',
              'Approved',
              'In Progress',
              'Ready',
              'Delivered',
            ].indexOf(stage.st);
          return (
            <div key={idx} className="relative">
              <div
                className={`absolute -left-[20.5px] top-0.5 w-3 h-3 rounded-full border-2 bg-white transition-all ${isPast ? 'border-[var(--color-gold)] bg-[var(--color-gold)]' : 'border-black/15'}`}
              />
              <span
                className={`font-bold ${isPast ? 'text-[var(--color-on-surface)]' : 'text-black/35'}`}
              >
                {stage.st}
              </span>
              <p className="text-[10px] text-[#685C57]/70 font-light mt-0.5 leading-tight">
                {stage.d}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
