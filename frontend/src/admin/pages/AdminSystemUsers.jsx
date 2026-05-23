import React, { useState, useEffect } from 'react';
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
    if (user?.role === 'super_admin') {
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
        toast.success('Admin added successfully');
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
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-display text-stone-800">Access Denied</h2>
        <p className="text-stone-500 mt-2">Only Super Admins can manage system users.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-display text-stone-900 tracking-tight">System Access</h2>
          <p className="text-stone-500 mt-1">Manage administrators, staff, and access control</p>
        </div>
        <button
          onClick={() => handleOpenModal('add')}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus size={18} />
          <span>Add Admin</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-stone-500">Loading system users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100 text-xs uppercase tracking-wider text-stone-500">
                  <th className="px-6 py-4 font-medium">User Details</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Security Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {admins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-stone-900">{admin.name}</div>
                          <div className="text-sm text-stone-500">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {admin.isLocked ? (
                        <div className="flex items-center gap-1.5 text-red-600 text-sm">
                          <ShieldAlert size={16} />
                          <span>Locked Out</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
                          <ShieldCheck size={16} />
                          <span>Active</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {admin.role !== 'super_admin' && admin.email !== user?.email && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal('edit', admin)}
                            className="p-2 text-stone-400 hover:text-primary transition-colors"
                            title="Edit Role"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(admin._id)}
                            className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                            title="Revoke Access"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-stone-100">
            <h2 className="text-xl font-display mb-4">
              {modalMode === 'add' ? 'Add New System User' : 'Edit User Role'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalMode === 'add' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Temporary Password</label>
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    />
                    <p className="text-xs text-stone-500 mt-1">User must use this password to login initially.</p>
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Role & Permissions</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  <option value="manager">Manager (General Store Ops)</option>
                  <option value="main_admin">Main Admin (Store Setup & Settings)</option>
                  <option value="order_manager">Order Manager (Fulfillment)</option>
                  <option value="content_manager">Content Manager (CMS & Blogs)</option>
                  <option value="support_admin">Support Admin (Inquiries & Chat)</option>
                  <option value="moderator">Moderator (Reviews)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-stone-500 hover:text-stone-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {modalMode === 'add' ? 'Create Admin' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
