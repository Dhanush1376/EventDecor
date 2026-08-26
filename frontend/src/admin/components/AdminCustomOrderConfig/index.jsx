import React, { useState, useEffect } from 'react';
import { customOrderService } from '../../../services/domainServices';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../context/ConfirmProvider';
import { getErrorMessage } from '../../../utils/core/errorHelpers';

import { CustomOrderConfigHeader } from './CustomOrderConfigHeader';
import { CustomOrderTypeTabs } from './CustomOrderTypeTabs';
import { CustomOrderFormBuilder } from './CustomOrderFormBuilder';
import { CustomOrderWorkflowBuilder } from './CustomOrderWorkflowBuilder';
import { CustomOrderTypeSettings } from './CustomOrderTypeSettings';
import { CustomOrderPreviewModal } from './CustomOrderPreviewModal';

export function AdminCustomOrderConfig() {
  const [config, setConfig] = useState({ types: [] });
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const confirm = useConfirm();

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
    if (
      !(await confirm({
        title: 'Publish Configuration',
        message: 'Are you sure you want to publish these changes live to the storefront?',
        type: 'warning',
      }))
    )
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

  const deleteStep = async (typeId, stepId) => {
    if (
      !(await confirm({
        title: 'Delete Step',
        message: 'Delete this entire step?',
        type: 'danger',
      }))
    )
      return;
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
      <CustomOrderConfigHeader
        config={config}
        savingDraft={savingDraft}
        publishing={publishing}
        handleSaveDraft={handleSaveDraft}
        handlePublish={handlePublish}
        setShowPreviewModal={setShowPreviewModal}
      />

      <CustomOrderTypeTabs
        config={config}
        activeTypeTab={activeTypeTab}
        setActiveTypeTab={setActiveTypeTab}
      />

      {/* BUILDER WORKSPACE */}
      {activeType && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-4">
            {/* SUB-TABS (Forms vs Workflows) */}
            <div className="flex border-b border-[var(--admin-border)] gap-4 sm:gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <button
                onClick={() => setActiveSectionTab('forms')}
                className={`shrink-0 whitespace-nowrap pb-3 text-[12px] sm:text-[13px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeSectionTab === 'forms' ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]' : 'border-transparent text-black/50 hover:text-black'}`}
              >
                Form Builder
              </button>
              <button
                onClick={() => setActiveSectionTab('workflows')}
                className={`shrink-0 whitespace-nowrap pb-3 text-[12px] sm:text-[13px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeSectionTab === 'workflows' ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]' : 'border-transparent text-black/50 hover:text-black'}`}
              >
                Lifecycle Workflows
              </button>
            </div>

            {activeSectionTab === 'forms' && (
              <CustomOrderFormBuilder
                activeType={activeType}
                addStep={addStep}
                setSteps={setSteps}
                updateStep={updateStep}
                deleteStep={deleteStep}
                setFields={setFields}
                addField={addField}
                updateField={updateField}
                deleteField={deleteField}
              />
            )}

            {activeSectionTab === 'workflows' && (
              <CustomOrderWorkflowBuilder
                activeType={activeType}
                addWorkflowStatus={addWorkflowStatus}
                updateWorkflowStatus={updateWorkflowStatus}
                deleteWorkflowStatus={deleteWorkflowStatus}
              />
            )}
          </div>

          <div className="xl:col-span-4 space-y-4">
            <CustomOrderTypeSettings activeType={activeType} updateType={updateType} />
          </div>
        </div>
      )}

      <CustomOrderPreviewModal
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        previewDevice={previewDevice}
        setPreviewDevice={setPreviewDevice}
        config={config}
        activeTypeTab={activeTypeTab}
      />
    </div>
  );
}

export default AdminCustomOrderConfig;
