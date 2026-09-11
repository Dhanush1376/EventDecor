import React from 'react';
import { Reorder } from 'framer-motion';

export function CustomOrderFormBuilder({
  activeType,
  addStep,
  setSteps,
  updateStep,
  deleteStep,
  setFields,
  addField,
  updateField,
  deleteField,
}) {
  return (
    <>
      {/* Steps Header Bar */}
      <div className="flex justify-between items-center bg-[var(--admin-surface)] px-3.5 py-2.5 rounded-[4px] border border-[var(--admin-border)] shadow-xs gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)] shrink-0">
            format_list_bulleted
          </span>
          <span className="font-bold text-[12.5px] text-[var(--admin-text-primary)] truncate">
            Form Steps
          </span>
          <span className="text-[11px] text-[var(--admin-text-tertiary)] hidden sm:inline">
            (drag to reorder)
          </span>
        </div>
        <button
          type="button"
          onClick={() => addStep(activeType.id)}
          className="h-7.5 px-2.5 rounded-[4px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-border-subtle)] text-[var(--admin-accent)] border border-[var(--admin-border)] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          <span>Add Step</span>
        </button>
      </div>

      {activeType.steps && activeType.steps.length > 0 ? (
        <Reorder.Group
          axis="y"
          values={activeType.steps}
          onReorder={(newOrder) => setSteps(activeType.id, newOrder)}
          className="space-y-4"
        >
          {activeType.steps.map((step, stepIndex) => (
            <Reorder.Item
              key={step.id}
              value={step}
              className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-[4px] shadow-xs overflow-hidden list-none"
            >
              {/* Step Header */}
              <div className="bg-[var(--admin-surface-muted)] p-3 border-b border-[var(--admin-border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between cursor-grab active:cursor-grabbing gap-2 sm:gap-2.5">
                {/* Step Title & Drag Handle (and Mobile Delete) */}
                <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] shrink-0">
                    drag_indicator
                  </span>
                  <span className="w-5.5 h-5.5 rounded-[4px] bg-[var(--admin-accent)] text-white text-[10.5px] font-bold flex items-center justify-center shrink-0">
                    {stepIndex + 1}
                  </span>
                  <input
                    value={step.title}
                    onChange={(e) => updateStep(activeType.id, step.id, { title: e.target.value })}
                    className="bg-[var(--admin-surface)] border border-[var(--admin-border)] px-2.5 h-8 rounded-[4px] font-bold text-[13px] text-[var(--admin-text-primary)] flex-1 sm:w-56 md:w-64 sm:flex-none focus:border-[var(--admin-accent)] outline-none transition-colors"
                    placeholder="Step title"
                  />
                  {/* Mobile Delete Step Button */}
                  <button
                    type="button"
                    onClick={() => deleteStep(activeType.id, step.id)}
                    className="sm:!hidden flex w-8 h-8 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] shrink-0 items-center justify-center transition-colors cursor-pointer ml-auto"
                    title="Delete Step"
                  >
                    <span className="material-symbols-outlined text-[17px]">delete</span>
                  </button>
                </div>

                {/* Step Description & Desktop Delete */}
                <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto pl-7.5 sm:pl-0">
                  <input
                    value={step.description || ''}
                    onChange={(e) =>
                      updateStep(activeType.id, step.id, { description: e.target.value })
                    }
                    placeholder="Optional step description or helper guidance"
                    className="bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] px-2.5 h-8 rounded-[4px] text-[11px] outline-none text-[var(--admin-text-secondary)] flex-1 min-w-0 focus:border-[var(--admin-accent)] transition-colors"
                  />
                  {/* Desktop Delete Step Button */}
                  <button
                    type="button"
                    onClick={() => deleteStep(activeType.id, step.id)}
                    className="!hidden sm:!flex w-8 h-8 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] shrink-0 items-center justify-center transition-colors cursor-pointer"
                    title="Delete Step"
                  >
                    <span className="material-symbols-outlined text-[17px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Step Fields Container */}
              <div className="p-3.5 bg-[var(--admin-bg-subtle)]">
                {step.fields && step.fields.length > 0 ? (
                  <Reorder.Group
                    axis="y"
                    values={step.fields}
                    onReorder={(newFields) => setFields(activeType.id, step.id, newFields)}
                    className="space-y-2.5"
                  >
                    {step.fields.map((field) => (
                      <Reorder.Item
                        key={field.id}
                        value={field}
                        className="flex flex-col gap-2.5 p-3 border border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] rounded-[4px] hover:border-[var(--admin-border-strong)] transition-all list-none relative"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full">
                          {/* Left / Top: Drag Handle + Label Input + Mobile Delete */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-tertiary)] cursor-grab active:cursor-grabbing shrink-0">
                              drag_indicator
                            </span>
                            <input
                              value={field.label}
                              onChange={(e) =>
                                updateField(activeType.id, step.id, field.id, {
                                  label: e.target.value,
                                })
                              }
                              placeholder="Field Label (e.g. Date Required)"
                              className="bg-[var(--admin-surface)] border border-[var(--admin-border)] px-2.5 h-8 rounded-[4px] text-[12px] font-medium outline-none flex-1 min-w-0 text-[var(--admin-text-primary)] focus:border-[var(--admin-accent)] transition-colors"
                            />
                            {/* Mobile Delete Button */}
                            <button
                              type="button"
                              onClick={() => deleteField(activeType.id, step.id, field.id)}
                              className="sm:!hidden flex w-7 h-7 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] shrink-0 items-center justify-center transition-colors cursor-pointer"
                              title="Remove Field"
                            >
                              <span className="material-symbols-outlined text-[15px]">close</span>
                            </button>
                          </div>

                          {/* Right / Controls: Type Select + Required Checkbox + Desktop Delete */}
                          <div className="flex items-center justify-between sm:justify-start gap-2.5 pl-6.5 sm:pl-0 shrink-0">
                            <div className="flex items-center gap-2.5 flex-1 sm:flex-initial">
                              <select
                                value={field.type}
                                onChange={(e) =>
                                  updateField(activeType.id, step.id, field.id, {
                                    type: e.target.value,
                                  })
                                }
                                className="bg-[var(--admin-surface)] border border-[var(--admin-border)] px-2 h-8 rounded-[4px] text-[11.5px] font-medium text-[var(--admin-text-primary)] outline-none cursor-pointer w-38 shrink-0 focus:border-[var(--admin-accent)] transition-colors"
                              >
                                <option value="text">Short Text</option>
                                <option value="textarea">Long Text</option>
                                <option value="dropdown">Dropdown Select</option>
                                <option value="radio">Radio Buttons</option>
                                <option value="checkbox">Single Checkbox</option>
                                <option value="multiselect">Multi-Select Tags</option>
                                <option value="file">File / Image Upload</option>
                                <option value="date">Date Picker</option>
                                <option value="number">Number</option>
                                <option value="whatsapp_chat">WhatsApp Chat</option>
                              </select>

                              <label className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--admin-text-secondary)] cursor-pointer shrink-0 select-none">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) =>
                                    updateField(activeType.id, step.id, field.id, {
                                      required: e.target.checked,
                                    })
                                  }
                                  className="accent-[var(--admin-accent)] rounded-[2px] w-3.5 h-3.5"
                                />
                                <span>Required</span>
                              </label>
                            </div>

                            {/* Desktop Delete Button */}
                            <button
                              type="button"
                              onClick={() => deleteField(activeType.id, step.id, field.id)}
                              className="!hidden sm:!flex w-7 h-7 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)] shrink-0 items-center justify-center transition-colors cursor-pointer"
                              title="Remove Field"
                            >
                              <span className="material-symbols-outlined text-[15px]">close</span>
                            </button>
                          </div>
                        </div>

                        {/* Options builder for dropdown/multiselect/radio */}
                        {['dropdown', 'multiselect', 'radio'].includes(field.type) && (
                          <div className="ml-6.5 sm:ml-7 p-3 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border-subtle)] space-y-1.5">
                            <p className="text-[9.5px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider">
                              Options (Comma separated)
                            </p>
                            <input
                              type="text"
                              value={field.options?.map((o) => o.label).join(', ') || ''}
                              onChange={(e) => {
                                const arr = e.target.value
                                  .split(',')
                                  .map((s) => ({ label: s.trim(), value: s.trim() }))
                                  .filter((o) => o.label);
                                updateField(activeType.id, step.id, field.id, {
                                  options: arr,
                                });
                              }}
                              placeholder="e.g. Traditional, Modern, Rustic"
                              className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] px-2.5 h-8 rounded-[4px] text-[12px] text-[var(--admin-text-primary)] outline-none focus:border-[var(--admin-accent)]"
                            />
                          </div>
                        )}

                        {/* Options builder for whatsapp_chat */}
                        {field.type === 'whatsapp_chat' && (
                          <div className="ml-6.5 sm:ml-7 p-3 bg-[var(--admin-surface-muted)] rounded-[4px] border border-[var(--admin-border-subtle)] space-y-2">
                            <div>
                              <p className="text-[9.5px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider mb-1">
                                WhatsApp Number (with country code, e.g. 919866006648)
                              </p>
                              <input
                                type="text"
                                value={field.whatsappNumber || ''}
                                onChange={(e) =>
                                  updateField(activeType.id, step.id, field.id, {
                                    whatsappNumber: e.target.value,
                                  })
                                }
                                placeholder="919866006648"
                                className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] px-2.5 h-8 rounded-[4px] text-[12px] text-[var(--admin-text-primary)] outline-none"
                              />
                            </div>
                            <div>
                              <p className="text-[9.5px] uppercase font-bold text-[var(--admin-text-tertiary)] tracking-wider mb-1">
                                Pre-filled Message
                              </p>
                              <input
                                type="text"
                                value={field.whatsappMessage || ''}
                                onChange={(e) =>
                                  updateField(activeType.id, step.id, field.id, {
                                    whatsappMessage: e.target.value,
                                  })
                                }
                                placeholder="Hi, I need assistance with this custom order!"
                                className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] px-2.5 h-8 rounded-[4px] text-[12px] text-[var(--admin-text-primary)] outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                ) : (
                  <p className="text-[11.5px] text-[var(--admin-text-tertiary)] italic py-2">
                    No fields added to this step yet.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => addField(activeType.id, step.id)}
                  className="w-full h-8.5 border border-dashed border-[var(--admin-border)] hover:border-[var(--admin-accent)] text-[var(--admin-accent)] bg-[var(--admin-surface)] rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-all mt-2.5 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Add Form Field</span>
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className="text-center py-12 bg-[var(--admin-surface)] rounded-[4px] border border-dashed border-[var(--admin-border)] text-[var(--admin-text-tertiary)]">
          <span className="material-symbols-outlined text-[36px] mb-2 block text-[var(--admin-text-tertiary)]">
            post_add
          </span>
          <p className="text-[13px] font-bold text-[var(--admin-text-primary)]">
            No Steps Configured
          </p>
          <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
            Click "+ Add Step" above to start building your custom order form.
          </p>
        </div>
      )}
    </>
  );
}
