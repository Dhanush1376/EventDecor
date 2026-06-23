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
      <div className="flex justify-between items-center bg-[var(--admin-bg-subtle)] px-4 py-3 rounded-xl border border-[var(--admin-border)]">
        <span className="font-bold text-[13px] text-[var(--admin-text-primary)]">
          Wizard Steps (Drag to reorder)
        </span>
        <button
          onClick={() => addStep(activeType.id)}
          className="text-[11px] font-bold uppercase text-[var(--admin-accent)] hover:underline flex items-center gap-1"
        >
          + Add New Step
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
              className="bg-white border border-[var(--admin-border-subtle)] rounded-2xl shadow-sm overflow-hidden list-none"
            >
              {/* Step Header */}
              <div className="bg-[var(--admin-surface)] p-4 border-b border-[var(--admin-border-subtle)] flex items-center justify-between cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-3 w-full">
                  <span className="material-symbols-outlined text-black/20 text-[20px]">
                    drag_indicator
                  </span>
                  <span className="bg-black text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                    {stepIndex + 1}
                  </span>
                  <input
                    value={step.title}
                    onChange={(e) => updateStep(activeType.id, step.id, { title: e.target.value })}
                    className="bg-transparent border-b border-dashed border-black/30 pb-0.5 outline-none font-bold text-[14px] text-black w-1/3 focus:border-[var(--admin-accent)] transition-all"
                  />
                  <input
                    value={step.description || ''}
                    onChange={(e) =>
                      updateStep(activeType.id, step.id, { description: e.target.value })
                    }
                    placeholder="Optional step description"
                    className="bg-transparent text-[11px] outline-none text-[#685C57] w-1/2 ml-2"
                  />
                </div>
                <button
                  onClick={() => deleteStep(activeType.id, step.id)}
                  className="text-[var(--admin-error)] hover:bg-red-50 p-1.5 rounded-lg"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>

              {/* Step Fields */}
              <div className="p-4 bg-[#fdfdfc]">
                {step.fields && step.fields.length > 0 ? (
                  <Reorder.Group
                    axis="y"
                    values={step.fields}
                    onReorder={(newFields) => setFields(activeType.id, step.id, newFields)}
                    className="space-y-3"
                  >
                    {step.fields.map((field) => (
                      <Reorder.Item
                        key={field.id}
                        value={field}
                        className="flex flex-col gap-3 p-3 border border-[var(--admin-border-subtle)] bg-white rounded-xl hover:border-black/20 transition-all list-none relative"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-black/20 text-[18px] cursor-grab active:cursor-grabbing">
                            drag_indicator
                          </span>

                          <input
                            value={field.label}
                            onChange={(e) =>
                              updateField(activeType.id, step.id, field.id, {
                                label: e.target.value,
                              })
                            }
                            className="bg-[var(--admin-surface)] border border-[var(--admin-border)] px-3 py-1.5 rounded-lg text-[12px] font-medium outline-none w-1/3 focus:border-[var(--admin-accent)]"
                          />

                          <select
                            value={field.type}
                            onChange={(e) =>
                              updateField(activeType.id, step.id, field.id, {
                                type: e.target.value,
                              })
                            }
                            className="bg-[var(--admin-surface)] border border-[var(--admin-border)] px-3 py-1.5 rounded-lg text-[12px] outline-none cursor-pointer w-1/4"
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Long Text (Textarea)</option>
                            <option value="dropdown">Dropdown Select</option>
                            <option value="radio">Radio Buttons</option>
                            <option value="checkbox">Checkbox (Single)</option>
                            <option value="multiselect">Multi-Select Tags</option>
                            <option value="file">File/Image Upload</option>
                            <option value="date">Date Picker</option>
                            <option value="number">Number</option>
                            <option value="whatsapp_chat">WhatsApp Chat</option>
                          </select>

                          <label className="flex items-center gap-1.5 ml-auto text-[11px] font-bold uppercase tracking-wider cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                updateField(activeType.id, step.id, field.id, {
                                  required: e.target.checked,
                                })
                              }
                              className="accent-[var(--admin-accent)]"
                            />
                            Required
                          </label>

                          <button
                            onClick={() => deleteField(activeType.id, step.id, field.id)}
                            className="text-[var(--admin-error)] opacity-60 hover:opacity-100 p-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>

                        {/* Options builder for dropdown/multiselect/radio */}
                        {['dropdown', 'multiselect', 'radio'].includes(field.type) && (
                          <div className="ml-8 p-3 bg-[var(--admin-bg-subtle)] rounded-lg border border-[var(--admin-border-subtle)]">
                            <p className="text-[10px] uppercase font-bold text-black/50 mb-2">
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
                              className="w-full bg-white border border-[var(--admin-border)] px-3 py-2 rounded-lg text-[12px] outline-none"
                            />
                          </div>
                        )}

                        {/* Options builder for whatsapp_chat */}
                        {field.type === 'whatsapp_chat' && (
                          <div className="ml-8 p-3 bg-[var(--admin-bg-subtle)] rounded-lg border border-[var(--admin-border-subtle)]">
                            <p className="text-[10px] uppercase font-bold text-black/50 mb-2">
                              WhatsApp Number (with country code)
                            </p>
                            <input
                              type="text"
                              value={field.whatsappNumber || ''}
                              onChange={(e) =>
                                updateField(activeType.id, step.id, field.id, {
                                  whatsappNumber: e.target.value,
                                })
                              }
                              placeholder="e.g. 919866006648"
                              className="w-full bg-white border border-[var(--admin-border)] px-3 py-2 rounded-lg text-[12px] outline-none mb-3"
                            />
                            <p className="text-[10px] uppercase font-bold text-black/50 mb-2">
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
                              placeholder="e.g. Hi, I need help with this customization!"
                              className="w-full bg-white border border-[var(--admin-border)] px-3 py-2 rounded-lg text-[12px] outline-none"
                            />
                          </div>
                        )}
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                ) : (
                  <p className="text-[12px] text-black/40 italic">No fields in this step.</p>
                )}

                <button
                  onClick={() => addField(activeType.id, step.id)}
                  className="w-full py-2.5 border-2 border-dashed border-[var(--admin-border)] rounded-xl text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] hover:border-black/30 hover:bg-[var(--admin-bg-subtle)] transition-all mt-3 cursor-pointer"
                >
                  + Add Form Field
                </button>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        <div className="text-center p-10 bg-white rounded-xl border border-dashed border-black/20 text-black/50">
          No steps added yet. Start building your form!
        </div>
      )}
    </>
  );
}
