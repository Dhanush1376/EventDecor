import React from 'react';

export function CustomOrderWorkflowBuilder({
  activeType,
  addWorkflowStatus,
  updateWorkflowStatus,
  deleteWorkflowStatus,
}) {
  return (
    <div className="admin-card !rounded-[4px] p-5 space-y-4 text-left">
      <div className="flex justify-between items-center pb-3 border-b border-[var(--admin-border-subtle)]">
        <div>
          <h3 className="font-bold text-[14px] text-[var(--admin-text-primary)]">
            Custom Order Statuses
          </h3>
          <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
            Define the lifecycle stages and milestones an inquiry of this type moves through.
          </p>
        </div>
        <button
          type="button"
          onClick={() => addWorkflowStatus(activeType.id)}
          className="h-8 px-3 rounded-[4px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-text-primary)] border border-[var(--admin-border)] text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          <span>Add Status</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {activeType.workflows?.map((workflow) => (
          <div
            key={workflow.id}
            className="flex items-center gap-3 p-2.5 border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-subtle)] rounded-[4px]"
          >
            <input
              type="color"
              value={workflow.color || '#000000'}
              onChange={(e) =>
                updateWorkflowStatus(activeType.id, workflow.id, {
                  color: e.target.value,
                })
              }
              className="w-7 h-7 rounded-[4px] cursor-pointer border border-[var(--admin-border)] p-0 bg-transparent shrink-0"
              title="Pick Status Color"
            />
            <input
              type="text"
              value={workflow.label}
              onChange={(e) =>
                updateWorkflowStatus(activeType.id, workflow.id, {
                  label: e.target.value,
                })
              }
              className="h-8 bg-[var(--admin-surface)] border border-[var(--admin-border)] px-2.5 rounded-[4px] text-[12px] font-medium text-[var(--admin-text-primary)] outline-none flex-1 focus:border-[var(--admin-accent)]"
            />
            <button
              type="button"
              onClick={() => deleteWorkflowStatus(activeType.id, workflow.id)}
              className="admin-btn-icon !rounded-[4px] w-8 h-8 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] shrink-0"
              title="Delete Status"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        ))}
        {(!activeType.workflows || activeType.workflows.length === 0) && (
          <p className="text-[12px] text-[var(--admin-text-tertiary)] italic py-4 text-center">
            No custom statuses defined. Standard lifecycle defaults (Pending, Approved, Delivered)
            will be used.
          </p>
        )}
      </div>
    </div>
  );
}
