import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import toast from 'react-hot-toast';

const VisualBuilderSidebar = ({ activeNode, automation, onUpdateNode, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [recipients, setRecipients] = useState([]);

  useEffect(() => {
    if (activeNode?.type === 'templateNode') {
      whatsappAutomationService
        .getTemplates()
        .then((res) => {
          setTemplates(res.data?.data || []);
        })
        .catch(() => toast.error('Failed to load templates'));
    }
    if (activeNode?.type === 'recipientNode') {
      whatsappAutomationService
        .getRecipients()
        .then((res) => {
          setRecipients(res.data?.data || []);
        })
        .catch(() => toast.error('Failed to load recipients'));
    }
  }, [activeNode?.type]);

  if (!activeNode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-10 border-l border-gray-200 flex flex-col"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-500 text-[18px]">tune</span>
            Configure Node
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 text-gray-500">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {activeNode.type === 'triggerNode' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-[14px]">Trigger Event</h4>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                  Category
                </label>
                <input
                  type="text"
                  className="admin-input w-full bg-gray-50"
                  readOnly
                  value={activeNode.data?.category || ''}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  The event that triggers this automation.
                </p>
              </div>
            </div>
          )}

          {activeNode.type === 'conditionNode' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-[14px]">Routing Conditions</h4>
              <p className="text-[12px] text-gray-500">
                Rules that must pass for this automation to trigger.
              </p>

              {activeNode.data.conditions?.map((cond, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-gray-50 rounded border border-gray-200 text-[13px]"
                >
                  <span className="font-semibold">{cond.field}</span> {cond.operator}{' '}
                  <span className="text-blue-600">"{cond.value}"</span>
                </div>
              ))}

              <button className="w-full py-2 border border-dashed border-gray-300 rounded text-[13px] font-medium text-gray-600 hover:bg-gray-50">
                + Add Condition
              </button>
            </div>
          )}

          {activeNode.type === 'templateNode' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-[14px]">Select Template</h4>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                  Active Template
                </label>
                <select
                  className="admin-input w-full"
                  value={activeNode.data.activeTemplateId || ''}
                  onChange={(e) => {
                    const sel = templates.find((t) => t._id === e.target.value);
                    onUpdateNode({
                      activeTemplateId: e.target.value,
                      templateName: sel?.name || 'Unknown',
                    });
                  }}
                >
                  <option value="">-- Select Template --</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.status || 'draft'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeNode.type === 'recipientNode' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-[14px]">Recipients</h4>
              <p className="text-[12px] text-gray-500">Select which roles receive this message.</p>

              <div className="space-y-2">
                {recipients.map((r) => {
                  const isChecked = activeNode.data.recipientRoles?.some(
                    (role) => role.recipientId === r._id && role.enabled !== false,
                  );
                  return (
                    <label
                      key={r._id}
                      className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          let current = [...(activeNode.data.recipientRoles || [])];
                          if (e.target.checked) {
                            if (!current.find((cr) => cr.recipientId === r._id)) {
                              current.push({ recipientId: r._id, enabled: true });
                            } else {
                              current = current.map((cr) =>
                                cr.recipientId === r._id ? { ...cr, enabled: true } : cr,
                              );
                            }
                          } else {
                            current = current.filter((cr) => cr.recipientId !== r._id);
                          }
                          onUpdateNode({ recipientRoles: current });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-[14px] text-gray-700">
                        {r.name} <span className="text-[12px] text-gray-400">({r.role})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {activeNode.type === 'configNode' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-[14px]">Queue & Retry Policy</h4>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                  Priority
                </label>
                <select
                  className="admin-input w-full"
                  value={activeNode.data.priority || 'normal'}
                  onChange={(e) => onUpdateNode({ priority: e.target.value })}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                  Max Retries
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  className="admin-input w-full"
                  value={activeNode.data.retryPolicy?.maxRetries ?? 4}
                  onChange={(e) =>
                    onUpdateNode({
                      retryPolicy: {
                        ...activeNode.data.retryPolicy,
                        maxRetries: parseInt(e.target.value),
                      },
                    })
                  }
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-semibold text-[14px] mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-600">science</span>
                  Sandbox Mode
                </h4>
                <p className="text-[11px] text-gray-500 mb-4">
                  When enabled, real events will trigger this automation but messages will be
                  intercepted and sent to the test number below.
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      checked={activeNode.data.sandbox?.enabled || false}
                      onChange={(e) =>
                        onUpdateNode({
                          sandbox: { ...activeNode.data.sandbox, enabled: e.target.checked },
                        })
                      }
                    />
                    <span className="text-[13px] font-semibold text-gray-700">Enable Sandbox</span>
                  </label>
                  {activeNode.data.sandbox?.enabled && (
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                        Test Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +1234567890"
                        className="admin-input w-full"
                        value={activeNode.data.sandbox?.overridePhoneNumber || ''}
                        onChange={(e) =>
                          onUpdateNode({
                            sandbox: {
                              ...activeNode.data.sandbox,
                              overridePhoneNumber: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VisualBuilderSidebar;
