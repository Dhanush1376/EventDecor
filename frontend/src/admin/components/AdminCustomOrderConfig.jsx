import { m as motion, AnimatePresence, Reorder } from 'framer-motion';
import { DynamicCustomOrderWizard } from '../../components/ui/DynamicCustomOrderWizard';
import { useState, useEffect } from 'react';
import { customOrderService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorHelpers';

export function AdminCustomOrderConfig() {
  const [config, setConfig] = useState({ types: [] });
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [activeTypeTab, setActiveTypeTab] = useState(null);
  const [activeSectionTab, setActiveSectionTab] = useState('forms'); // 'forms' | 'workflows'

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // desktop | tablet | mobile

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await customOrderService.getAdminConfig(); // Fetches latest draft or published
      if (res.success && res.data?.types) {
        setConfig(res.data);
        if (res.data.types.length > 0) setActiveTypeTab(res.data.types[0].id);
      } else {
        // Fallback structure
        const defaultTypes = [
          { id: 'product', name: 'Product Customization', enabled: true, steps: [], workflows: [] },
          { id: 'event', name: 'Event Display Setup', enabled: true, steps: [], workflows: [] },
          { id: 'general', name: 'General Custom Order', enabled: true, steps: [], workflows: [] },
        ];
        setConfig({ types: defaultTypes, status: 'draft' });
        setActiveTypeTab('product');
      }
    } catch (_err) {
      toast.error('Failed to load dynamic configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      const res = await customOrderService.saveConfigDraft(config);
      if (res.success) {
        toast.success('Draft saved successfully!');
        setConfig(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save draft'));
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish these changes live to the storefront?'))
      return;
    try {
      setPublishing(true);
      const res = await customOrderService.updateConfig(config);
      if (res.success) {
        toast.success('Version published successfully!');
        setConfig(res.data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to publish config'));
    } finally {
      setPublishing(false);
    }
  };

  // --- Step & Field Management ---
  const updateType = (typeId, updates) => {
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => (t.id === typeId ? { ...t, ...updates } : t)),
    }));
  };

  const setSteps = (typeId, newSteps) => {
    updateType(typeId, { steps: newSteps });
  };

  const addStep = (typeId) => {
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => {
        if (t.id === typeId) {
          return {
            ...t,
            steps: [
              ...(t.steps || []),
              { id: `step_${Date.now()}`, title: 'New Step', fields: [] },
            ],
          };
        }
        return t;
      }),
    }));
  };

  const updateStep = (typeId, stepId, updates) => {
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => {
        if (t.id === typeId) {
          return {
            ...t,
            steps: t.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
          };
        }
        return t;
      }),
    }));
  };

  const deleteStep = (typeId, stepId) => {
    if (!window.confirm('Delete this entire step?')) return;
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => {
        if (t.id === typeId) {
          return { ...t, steps: t.steps.filter((s) => s.id !== stepId) };
        }
        return t;
      }),
    }));
  };

  const setFields = (typeId, stepId, newFields) => {
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => {
        if (t.id === typeId) {
          return {
            ...t,
            steps: t.steps.map((s) => (s.id === stepId ? { ...s, fields: newFields } : s)),
          };
        }
        return t;
      }),
    }));
  };

  const addField = (typeId, stepId) => {
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => {
        if (t.id === typeId) {
          return {
            ...t,
            steps: t.steps.map((s) => {
              if (s.id === stepId) {
                return {
                  ...s,
                  fields: [
                    ...(s.fields || []),
                    {
                      id: `field_${Date.now()}`,
                      type: 'text',
                      label: 'New Field',
                      required: false,
                    },
                  ],
                };
              }
              return s;
            }),
          };
        }
        return t;
      }),
    }));
  };

  const updateField = (typeId, stepId, fieldId, updates) => {
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => {
        if (t.id === typeId) {
          return {
            ...t,
            steps: t.steps.map((s) => {
              if (s.id === stepId) {
                return {
                  ...s,
                  fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
                };
              }
              return s;
            }),
          };
        }
        return t;
      }),
    }));
  };

  const deleteField = (typeId, stepId, fieldId) => {
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => {
        if (t.id === typeId) {
          return {
            ...t,
            steps: t.steps.map((s) => {
              if (s.id === stepId) {
                return { ...s, fields: s.fields.filter((f) => f.id !== fieldId) };
              }
              return s;
            }),
          };
        }
        return t;
      }),
    }));
  };

  // --- Workflow Management ---
  const addWorkflowStatus = (typeId) => {
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => {
        if (t.id === typeId) {
          return {
            ...t,
            workflows: [
              ...(t.workflows || []),
              { id: `status_${Date.now()}`, label: 'New Status', color: '#000000' },
            ],
          };
        }
        return t;
      }),
    }));
  };

  const updateWorkflowStatus = (typeId, statusId, updates) => {
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => {
        if (t.id === typeId) {
          return {
            ...t,
            workflows: t.workflows.map((w) => (w.id === statusId ? { ...w, ...updates } : w)),
          };
        }
        return t;
      }),
    }));
  };

  const deleteWorkflowStatus = (typeId, statusId) => {
    setConfig((prev) => ({
      ...prev,
      types: prev.types.map((t) => {
        if (t.id === typeId) {
          return { ...t, workflows: t.workflows.filter((w) => w.id !== statusId) };
        }
        return t;
      }),
    }));
  };

  if (loading)
    return <div className="p-10 text-center animate-pulse">Loading Enterprise Form Builder...</div>;

  const activeType = config.types?.find((t) => t.id === activeTypeTab);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-[var(--admin-surface)] p-5 rounded-2xl border border-[var(--admin-border)] shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)]">
              Enterprise Custom Orders Engine
            </h2>
            {config.status === 'draft' ? (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase rounded border border-yellow-200">
                Unpublished Draft
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-bold uppercase rounded border border-green-200">
                Live (v{config.version})
              </span>
            )}
          </div>
          <p className="text-[12px] text-[var(--admin-text-secondary)] mt-1">
            Build multi-step wizards, manage fields via drag-and-drop, and define custom workflows.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] border border-black/10 shadow-sm hover:bg-black/5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Preview Mode
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="bg-[var(--admin-bg-subtle)] text-black px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] border border-[var(--admin-border)] shadow-sm hover:bg-white transition-all disabled:opacity-50"
          >
            {savingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="bg-[var(--admin-accent)] text-white px-6 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-md hover:bg-[var(--admin-accent-hover)] transition-all disabled:opacity-50"
          >
            {publishing ? 'Publishing...' : 'Publish Live'}
          </button>
        </div>
      </div>

      {/* TYPE TABS */}
      <div className="flex gap-2 bg-[#f2efe9] p-1 rounded-full w-max border border-black/5 shadow-inner">
        {config.types?.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTypeTab(t.id)}
            className={`px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTypeTab === t.id
                ? 'bg-[var(--admin-text-primary)] text-white shadow-md'
                : 'text-[#685C57] hover:text-black'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* BUILDER WORKSPACE */}
      {activeType && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-4">
            {/* SUB-TABS (Forms vs Workflows) */}
            <div className="flex border-b border-[var(--admin-border)] gap-6">
              <button
                onClick={() => setActiveSectionTab('forms')}
                className={`pb-3 text-[13px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeSectionTab === 'forms' ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]' : 'border-transparent text-black/50 hover:text-black'}`}
              >
                Form Builder
              </button>
              <button
                onClick={() => setActiveSectionTab('workflows')}
                className={`pb-3 text-[13px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeSectionTab === 'workflows' ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]' : 'border-transparent text-black/50 hover:text-black'}`}
              >
                Lifecycle Workflows
              </button>
            </div>

            {activeSectionTab === 'forms' && (
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
                              onChange={(e) =>
                                updateStep(activeType.id, step.id, { title: e.target.value })
                              }
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
                              onReorder={(newFields) =>
                                setFields(activeType.id, step.id, newFields)
                              }
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
                                      <span className="material-symbols-outlined text-[16px]">
                                        close
                                      </span>
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
                            <p className="text-[12px] text-black/40 italic">
                              No fields in this step.
                            </p>
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
            )}

            {activeSectionTab === 'workflows' && (
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
                      No custom statuses defined. System defaults (Pending, Approved, Completed)
                      will be used.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: SETTINGS INFO */}
          <div className="xl:col-span-4 space-y-4">
            <div className="bg-black rounded-2xl p-5 shadow-xl text-white sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[var(--color-gold)]">tune</span>
                <h3 className="font-bold text-[14px] uppercase tracking-wider">Type Settings</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                    Type ID (Read-only)
                  </label>
                  <input
                    type="text"
                    value={activeType.id}
                    disabled
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-[12px] text-white/70"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={activeType.name}
                    onChange={(e) => updateType(activeType.id, { name: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[var(--color-gold)] transition-colors text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/50 block mb-1">
                    Description
                  </label>
                  <textarea
                    value={activeType.description || ''}
                    onChange={(e) => updateType(activeType.id, { description: e.target.value })}
                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[var(--color-gold)] transition-colors text-white resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/10 bg-white/5 -mx-5 px-5 -mb-5 pb-5 rounded-b-2xl">
                <div className="flex justify-between items-center py-2 border-b border-white/10 text-[12px]">
                  <span className="text-white/70">Total Steps</span>
                  <span className="font-bold">{activeType.steps?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-[12px]">
                  <span className="text-white/70">Total Fields</span>
                  <span className="font-bold">
                    {activeType.steps?.reduce((acc, s) => acc + (s.fields?.length || 0), 0) || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      <AnimatePresence>
        {showPreviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-surface-ivory)] w-full h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden max-w-[1400px]"
            >
              {/* Modal Header */}
              <div className="bg-black text-white p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <h3 className="font-display text-[20px]">Live Storefront Preview</h3>
                  {/* Device Toggles */}
                  <div className="flex gap-1 bg-white/10 p-1 rounded-lg">
                    <button
                      onClick={() => setPreviewDevice('desktop')}
                      className={`p-1.5 rounded flex items-center justify-center ${previewDevice === 'desktop' ? 'bg-[var(--color-gold)]' : 'hover:bg-white/10'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">desktop_mac</span>
                    </button>
                    <button
                      onClick={() => setPreviewDevice('tablet')}
                      className={`p-1.5 rounded flex items-center justify-center ${previewDevice === 'tablet' ? 'bg-[var(--color-gold)]' : 'hover:bg-white/10'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">tablet_mac</span>
                    </button>
                    <button
                      onClick={() => setPreviewDevice('mobile')}
                      className={`p-1.5 rounded flex items-center justify-center ${previewDevice === 'mobile' ? 'bg-[var(--color-gold)]' : 'hover:bg-white/10'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">smartphone</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Modal Body / Device Container */}
              <div className="flex-1 overflow-y-auto bg-[#e5e5e5] flex items-center justify-center p-6">
                <div
                  className={`bg-[var(--color-surface-ivory)] shadow-2xl rounded-3xl overflow-y-auto transition-all duration-500 ${
                    previewDevice === 'desktop'
                      ? 'w-[1200px] h-[800px] max-w-full'
                      : previewDevice === 'tablet'
                        ? 'w-[768px] h-[1024px]'
                        : 'w-[375px] h-[812px]' // mobile
                  }`}
                  style={{ maxHeight: '100%' }}
                >
                  <div className="p-8">
                    {/* Pass the current builder config directly to the wizard! */}
                    <DynamicCustomOrderWizard
                      previewConfig={config}
                      initialProductPayload={activeTypeTab === 'product' ? { preview: true } : null}
                      initialEventType={activeTypeTab === 'event' ? { preview: true } : null}
                      onComplete={() => toast.success('Preview submission successful!')}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminCustomOrderConfig;
