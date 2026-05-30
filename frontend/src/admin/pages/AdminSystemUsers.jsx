import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck,
  UserPlus,
  Trash2,
  Edit2
} from 'lucide-react';
import api from '../../services/api';
import { SkeletonTable, PageHeader } from '../components/AdminUIKit';

export const AdminSystemUsers = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'manager',
    password: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (user?.role === 'super_admin' || user?.role === 'owner') {
      setIsSuperAdmin(true);
      fetchAdmins();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/system/users');
      if (res.data.success) {
        setAdmins(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load system users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode, admin = null) => {
    setModalMode(mode);
    if (mode === 'edit' && admin) {
      setFormData({
        name: admin.name,
        email: admin.email,
        role: admin.role,
        password: '' // Don't pre-fill password for edit
      });
      setEditingId(admin._id);
    } else {
      setFormData({ name: '', email: '', role: 'manager', password: '' });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        await api.post('/admin/system/users', formData);
        toast.success("Admin added");
      } else {
        await api.put(`/admin/system/users/${editingId}/role`, { role: formData.role });
        toast.success('Admin role updated');
      }
      setShowModal(false);
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save admin');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to revoke admin access for this user? They will be downgraded to a regular customer.')) {
      try {
        await api.delete(`/admin/system/users/${id}`);
        toast.success('Admin access revoked');
        fetchAdmins();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to revoke access');
      }
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-4 sm:p-8 flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto">
        <div className="admin-card w-full p-6 text-center space-y-4 border border-[var(--admin-border-subtle)] flex flex-col items-center shadow-sm rounded-[var(--admin-radius-lg)]">
          <div className="w-12 h-12 rounded-full bg-[var(--admin-error-light)] border border-[var(--admin-error-border)] flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-[var(--admin-error)]" />
          </div>
          <div>
            <h2 className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight font-display">Access Denied</h2>
            <p className="text-[12px] sm:text-[13px] text-[var(--admin-text-tertiary)] mt-1.5 leading-normal max-w-[260px] mx-auto font-medium">
              Only Super Admins can manage system users and adjust security access controls.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1300px] mx-auto space-y-6 pb-20 text-[var(--admin-text-primary)]">
      {/* Page Header */}
      <PageHeader
        title="System Access"
        subtitle="Manage administrators, staff, and access control"
      >
        <button
          onClick={() => handleOpenModal('add')}
          className="admin-btn admin-btn-primary"
        >
          <UserPlus size={15} />
          <span>Add Admin</span>
        </button>
      </PageHeader>

      {loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block admin-card shadow-sm border border-[var(--admin-border-subtle)] overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-[var(--admin-bg-subtle)] border-b border-[var(--admin-border-subtle)] text-[11px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold">
                    <th className="px-6 py-4 font-semibold">User Details</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Security Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {admins.map((admin) => (
                    <tr key={admin._id} className="hover:bg-[var(--admin-bg-subtle)]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--admin-text-primary)] text-sm">{admin.name}</div>
                            <div className="text-[11px] text-[var(--admin-text-secondary)] font-mono">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] uppercase tracking-wider">
                          {admin.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {admin.isLocked ? (
                          <div className="flex items-center gap-1.5 text-[var(--admin-error)] text-[11px] font-bold">
                            <ShieldAlert size={14} />
                            <span>Locked Out</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[var(--admin-success)] text-[11px] font-bold">
                            <ShieldCheck size={14} />
                            <span>Active</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {admin.role !== 'super_admin' && admin.email !== user?.email && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal('edit', admin)}
                              className="p-2 text-[var(--admin-text-secondary)] hover:text-black transition-colors cursor-pointer"
                              title="Edit Role"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(admin._id)}
                              className="p-2 text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)] transition-colors cursor-pointer"
                              title="Revoke Access"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards deck list */}
          <div className="block md:hidden space-y-3">
            {admins.map((admin) => (
              <div key={admin._id} className="admin-card p-4 hover:border-[var(--admin-border-strong)] transition-all duration-300 space-y-3">
                {/* Row 1: Initials & details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center font-bold text-[13px] shrink-0 shadow-sm">
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--admin-text-primary)] text-[13px] truncate">{admin.name}</div>
                    <div className="text-[10px] text-[var(--admin-text-tertiary)] truncate mt-0.5">{admin.email}</div>
                  </div>
                </div>

                {/* Row 2: Role & status */}
                <div className="flex items-center justify-between border-t border-b border-[var(--admin-border-subtle)] py-2">
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block mb-0.5">Permissions</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] uppercase tracking-wider">
                      {admin.role.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-[8px] uppercase tracking-wider text-[var(--admin-text-tertiary)] font-bold block mb-0.5 text-right">Access Status</span>
                    {admin.isLocked ? (
                      <div className="flex items-center gap-1 text-[var(--admin-error)] text-[10px] font-bold">
                        <ShieldAlert size={12} />
                        <span>LOCKED OUT</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[var(--admin-success)] text-[10px] font-bold">
                        <ShieldCheck size={12} />
                        <span>ACTIVE</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Action Buttons */}
                {admin.role !== 'super_admin' && admin.email !== user?.email && (
                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      onClick={() => handleOpenModal('edit', admin)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--admin-border)] hover:border-black text-[9px] font-label uppercase tracking-wider font-bold transition-all text-black hover:bg-black hover:text-white cursor-pointer active:scale-95"
                      title="Edit Role"
                    >
                      <Edit2 size={12} />
                      <span>Edit Role</span>
                    </button>
                    <button
                      onClick={() => handleDelete(admin._id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--admin-error-border)] bg-[var(--admin-error-light)] text-[var(--admin-error)] hover:bg-[var(--admin-error)] hover:text-white transition-all text-[9px] font-label uppercase tracking-wider font-bold cursor-pointer active:scale-95"
                      title="Revoke Access"
                    >
                      <Trash2 size={12} />
                      <span>Revoke</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Dynamic Slide-Up Bottom-Sheet Curation Drawer */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[990] flex items-end justify-center admin-section-root"
            >
              <div
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              />

              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                className="relative w-full max-w-xl bg-[var(--admin-surface)] rounded-t-[24px] shadow-[0_-8px_30px_rgb(0,0,0,0.18)] z-10 max-h-[92vh] overflow-y-auto custom-scrollbar p-5 sm:p-6 lg:p-8 border-t border-[var(--admin-border-strong)] flex flex-col pb-[calc(24px+env(safe-area-inset-bottom))]"
              >
                {/* Grab Handle */}
                <div className="w-12 h-1 bg-[var(--admin-border)] rounded-full mx-auto mb-4 shrink-0" />

                <div className="flex items-start justify-between border-b border-[var(--admin-border-subtle)] pb-4 mb-5 shrink-0">
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">shield</span>
                      {modalMode === 'add' ? 'Add New System User' : 'Edit User Role'}
                    </h3>
                    <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5 leading-normal">
                      Adjust system privileges and admin permissions
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-7 h-7 rounded-full bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-error-light)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)] flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 flex-1">
                  {modalMode === 'add' && (
                    <>
                      <div className="space-y-1">
                        <label className="admin-label">Full Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="admin-input"
                          placeholder="e.g. John Doe"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="admin-label">Email Address</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="admin-input"
                          placeholder="e.g. admin@siriarts.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="admin-label">Temporary Password</label>
                        <input
                          type="text"
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="admin-input font-mono"
                          placeholder="Generate secure temp password"
                        />
                        <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-1.5 leading-normal font-light">User must use this password to login initially.</p>
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-1">
                    <label className="admin-label">Role & Permissions</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="admin-select text-[12px] font-semibold"
                    >
                      <option value="manager">Manager (General Store Ops)</option>
                      <option value="main_admin">Main Admin (Store Setup & Settings)</option>
                      <option value="order_manager">Order Manager (Fulfillment)</option>
                      <option value="content_manager">Content Manager (CMS & Blogs)</option>
                      <option value="support_admin">Support Admin (Inquiries & Chat)</option>
                      <option value="moderator">Moderator (Reviews)</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-[var(--admin-border-subtle)] mt-6">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="admin-btn admin-btn-outline w-full sm:flex-1 py-3 text-[11px] font-bold uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-btn admin-btn-primary w-full sm:flex-[2] py-3 text-[11px] font-bold uppercase tracking-wider"
                    >
                      {modalMode === 'add' ? 'Create Admin' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
