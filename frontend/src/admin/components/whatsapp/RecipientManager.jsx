import React, { useState, useEffect } from 'react';
import whatsappAutomationService from '../../services/whatsappAutomationService';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const RecipientManager = () => {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'owner',
    isActive: true,
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchRecipients = async () => {
    try {
      const res = await whatsappAutomationService.getRecipients();
      if (res.data?.data) {
        setRecipients(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load recipients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      phone: '',
      role: 'owner',
      isActive: true,
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
    });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec) => {
    setFormData({
      name: rec.name,
      phone: rec.phone,
      role: rec.role,
      isActive: rec.isActive,
      quietHours: rec.quietHours || { enabled: false, start: '22:00', end: '08:00' },
    });
    setEditingId(rec._id);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingId) {
        await whatsappAutomationService.updateRecipient(editingId, formData);
        toast.success('Recipient updated');
      } else {
        await whatsappAutomationService.createRecipient(formData);
        toast.success('Recipient created');
      }
      setIsModalOpen(false);
      fetchRecipients();
    } catch (err) {
      toast.error('Failed to save recipient');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this recipient?')) {
      try {
        await whatsappAutomationService.deleteRecipient(id);
        toast.success('Recipient deleted');
        fetchRecipients();
      } catch (err) {
        toast.error('Failed to delete recipient');
      }
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-[var(--admin-text-secondary)]">
        Loading recipients...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-[18px] font-semibold text-[var(--admin-text-primary)]">
          Recipient Management
        </h2>
        <button className="admin-btn admin-btn-primary" onClick={handleOpenAdd}>
          <span className="material-symbols-outlined text-[18px] mr-1">person_add</span> Add
          Recipient
        </button>
      </div>

      <div className="admin-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)] text-[12px] uppercase text-[var(--admin-text-secondary)] tracking-wider">
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Phone Number</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Quiet Hours</th>
              <th className="p-4 font-semibold text-center">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[14px]">
            {recipients.map((rec) => (
              <tr
                key={rec._id}
                className="border-b border-[var(--admin-border-subtle)] hover:bg-gray-50/50"
              >
                <td className="p-4 font-medium text-[var(--admin-text-primary)]">{rec.name}</td>
                <td className="p-4 text-[var(--admin-text-secondary)]">{rec.phone}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-[12px] font-medium capitalize">
                    {rec.role}
                  </span>
                </td>
                <td className="p-4">
                  {rec.quietHours?.enabled ? (
                    <span className="text-[12px] text-[var(--admin-text-secondary)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">bedtime</span>
                      {rec.quietHours.start} - {rec.quietHours.end}
                    </span>
                  ) : (
                    <span className="text-[12px] text-gray-400">Disabled</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  {rec.isActive ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[12px] font-medium">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-[12px] font-medium">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button
                    className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Edit"
                    onClick={() => handleOpenEdit(rec)}
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors ml-1"
                    title="Delete"
                    onClick={() => handleDelete(rec._id)}
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {recipients.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-[var(--admin-text-tertiary)]">
                  No recipients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-[16px] text-[var(--admin-text-primary)]">
                  {editingId ? 'Edit Recipient' : 'Add Recipient'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    className="admin-input w-full"
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    required
                    className="admin-input w-full"
                    placeholder="e.g. +919876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                      Role
                    </label>
                    <select
                      className="admin-input w-full"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="owner">Owner</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="packing">Packing</option>
                      <option value="accounts">Accounts</option>
                      <option value="driver">Driver</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-gray-500 uppercase mb-1">
                      Status
                    </label>
                    <select
                      className="admin-input w-full"
                      value={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.value === 'true' })
                      }
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Quiet Hours */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-[13px] font-bold text-[var(--admin-text-primary)]">
                      Quiet Hours
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.quietHours.enabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quietHours: { ...formData.quietHours, enabled: e.target.checked },
                          })
                        }
                      />
                      <div className="w-8 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>
                  {formData.quietHours.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          className="admin-input w-full text-[13px]"
                          value={formData.quietHours.start}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              quietHours: { ...formData.quietHours, start: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          className="admin-input w-full text-[13px]"
                          value={formData.quietHours.end}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              quietHours: { ...formData.quietHours, end: e.target.value },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-2 leading-snug">
                    When enabled, non-critical notifications will not be sent to this recipient
                    between these hours.
                  </p>
                </div>

                <div className="pt-4 mt-6 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="admin-btn admin-btn-secondary px-5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="admin-btn admin-btn-primary px-5"
                  >
                    {isSaving ? 'Saving...' : 'Save Recipient'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecipientManager;
