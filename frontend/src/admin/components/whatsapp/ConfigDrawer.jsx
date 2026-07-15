import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TemplateEditor from './TemplateEditor';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import toast from 'react-hot-toast';

const ConfigDrawer = ({ isOpen, onClose, automation }) => {
  const [template, setTemplate] = useState(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  useEffect(() => {
    if (isOpen && automation) {
      setLoadingTemplate(true);
      whatsappAutomationService
        .getTemplates({ automationKey: automation.automationKey })
        .then((res) => {
          if (res.data?.data?.length > 0) {
            setTemplate(res.data.data[0]);
          } else {
            setTemplate(null);
          }
        })
        .catch(() => toast.error('Failed to load template for this automation'))
        .finally(() => setLoadingTemplate(false));
    } else {
      setTemplate(null);
    }
  }, [isOpen, automation]);

  const handleSaveTemplate = async (newText) => {
    if (!template) {
      try {
        const res = await whatsappAutomationService.createTemplate({
          name: `${automation.displayName} Default Template`,
          automationKey: automation.automationKey,
          bodyTemplate: newText,
          isActive: true,
        });
        if (res.data?.success) {
          setTemplate(res.data.data);
          toast.success('New template saved successfully!');
        }
      } catch (err) {
        toast.error('Failed to create new template');
      }
    } else {
      try {
        await whatsappAutomationService.updateTemplate(template._id, {
          bodyTemplate: newText,
        });
        toast.success('Template updated successfully!');
      } catch (err) {
        toast.error('Failed to update template');
      }
    }
  };
  if (!automation) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[90%] max-w-[800px] bg-[var(--admin-bg)] shadow-2xl z-50 flex flex-col border-l border-[var(--admin-border)] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--admin-border-subtle)] bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)]">
                  {automation.displayName} Configuration
                </h2>
                <p className="text-[13px] text-[var(--admin-text-secondary)]">
                  Configure layout, templates, and dynamic rules for this automation.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-[var(--admin-bg-subtle)]">
              {/* Template Editor Card */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--admin-border-subtle)] p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                  <span className="material-symbols-outlined text-[var(--admin-accent)]">
                    edit_document
                  </span>
                  <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">
                    Message Template
                  </h3>
                </div>
                {loadingTemplate ? (
                  <div className="text-[13px] text-gray-500 py-10 text-center">
                    Loading template...
                  </div>
                ) : (
                  <TemplateEditor
                    initialText={template?.bodyTemplate || ''}
                    onSave={handleSaveTemplate}
                  />
                )}
              </div>

              {/* Provider Template Mapping */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--admin-border-subtle)] p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                  <span className="material-symbols-outlined text-[var(--admin-accent)]">hub</span>
                  <h3 className="text-[16px] font-bold text-[var(--admin-text-primary)]">
                    Provider Template Mapping
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                        Provider
                      </label>
                      <select className="admin-input w-full" defaultValue="meta">
                        <option value="meta">Meta Cloud API</option>
                        <option value="twilio" disabled>
                          Twilio (Coming Soon)
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                        Template Category
                      </label>
                      <select className="admin-input w-full" defaultValue="utility">
                        <option value="utility">Utility (Approved Template)</option>
                        <option value="session">Session (Free Form text)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                      Meta Template Name
                    </label>
                    <input
                      type="text"
                      className="admin-input w-full"
                      placeholder="e.g., siri_new_order_v2"
                      defaultValue="siri_order_confirmed"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Must exactly match the approved template name in Meta Business Manager.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--admin-border-subtle)] bg-white flex justify-end gap-3 shrink-0">
              <button onClick={onClose} className="admin-btn admin-btn-primary px-6">
                Cancel
              </button>
              <button onClick={onClose} className="admin-btn px-6">
                Save Changes
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfigDrawer;
