import React from 'react';

export function CustomOrderWorkflowBuilder({
  activeType,
  addWorkflowStatus,
  updateWorkflowStatus,
  deleteWorkflowStatus,
}) {
  return (
    <div className="bg-white border border-[var(--admin-border-subtle)] rounded-2xl shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-black/5 pb-4">
        <div>
          <h3 className="font-bold text-[16px]">Custom Order Statuses</h3>
          <p className="text-[12px] text-black/50">
            Define the lifecycle stages an order of this type will go through.
          </p>
        </div>
        <button
          onClick={() => addWorkflowStatus(activeType.id)}
          className="bg-[var(--admin-bg-subtle)] border border-black/10 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-all"
        >
          + Add Status
        </button>
      </div>

      <div className="space-y-3">
        {activeType.workflows?.map((workflow) => (
          <div
            key={workflow.id}
            className="flex items-center gap-4 p-3 border border-[var(--admin-border-subtle)] rounded-xl"
          >
            <input
              type="color"
              value={workflow.color || '#000000'}
              onChange={(e) =>
                updateWorkflowStatus(activeType.id, workflow.id, {
                  color: e.target.value,
                })
              }
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
            />
            <input
              type="text"
              value={workflow.label}
              onChange={(e) =>
                updateWorkflowStatus(activeType.id, workflow.id, {
                  label: e.target.value,
                })
              }
              className="bg-[var(--admin-surface)] border border-[var(--admin-border)] px-3 py-2 rounded-lg text-[13px] font-bold outline-none flex-1 focus:border-[var(--admin-accent)]"
            />
            <button
              onClick={() => deleteWorkflowStatus(activeType.id, workflow.id)}
              className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        ))}
        {(!activeType.workflows || activeType.workflows.length === 0) && (
          <p className="text-[12px] text-black/40 italic">
            No custom statuses defined. System defaults (Pending, Approved, Completed) will be used.
          </p>
        )}
      </div>
    </div>
  );
}
