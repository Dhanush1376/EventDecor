import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  PageHeader,
  AdminInput,
  AdminToggle,
  SkeletonTable,
  EmptyState,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';

export function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drawer states
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'product',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data?.success) setCategories(res.data.data);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await api.put(`/categories/${id}`, { isActive: !currentStatus });
      toast.success('Category status updated');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      slug: '',
      type: 'product',
      isActive: true,
    });
    setShowDrawer(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingId(cat._id);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      type: cat.type || 'product',
      isActive: cat.isActive !== undefined ? cat.isActive : true,
    });
    setShowDrawer(true);
  };

  const handleCancel = () => {
    setShowDrawer(false);
    setEditingId(null);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: prev.slug === prev.name.toLowerCase().replace(/\s+/g, '-') 
        ? val.toLowerCase().replace(/\s+/g, '-') 
        : prev.slug,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      return toast.error('Name and Slug are required');
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, formData);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', formData);
        toast.success('Category created successfully');
      }
      fetchCategories();
      handleCancel();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="space-y-6"
    >
      <PageHeader
        title="Manage Categories"
        subtitle={`${categories.length} categories cataloged · Group products, blueprints, and highlights`}
      >
        <button
          onClick={handleOpenAdd}
          className="admin-btn admin-btn-primary h-9"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add Category
        </button>
      </PageHeader>

      {loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon="category"
          title="No Categories"
          description="Create your first category to organize products and content across the storefront."
          action={
            <button onClick={handleOpenAdd} className="admin-btn admin-btn-primary admin-btn-sm">
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Category
            </button>
          }
        />
      ) : (
        <motion.div variants={fadeUp} className="admin-card divide-y divide-[var(--admin-border-subtle)] p-0">
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="pl-6">Category Name</th>
                  <th>Slug / URL Path</th>
                  <th>Type Scope</th>
                  <th>Status</th>
                  <th className="text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-[var(--admin-surface-muted)] transition-colors">
                    <td className="pl-6">
                      <span className="font-bold text-[var(--admin-text-primary)] text-[13px]">{cat.name}</span>
                    </td>
                    <td>
                      <span className="font-mono text-[11px] text-[var(--admin-text-secondary)]">{cat.slug}</span>
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-neutral text-[9px] font-bold tracking-wider uppercase">
                        {cat.type}
                      </span>
                    </td>
                    <td>
                      <div onClick={(e) => e.stopPropagation()}>
                        <AdminToggle
                          checked={cat.isActive}
                          onChange={() => handleToggleActive(cat._id, cat.isActive)}
                        />
                      </div>
                    </td>
                    <td className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]"
                          title="Edit Category"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(cat._id)}
                          className="admin-btn-icon w-8 h-8 p-0 min-h-0 text-[var(--admin-text-tertiary)] hover:text-[var(--admin-error)] hover:bg-[var(--admin-error-light)]"
                          title="Delete Category"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ─── Add / Edit Category Bottom-Sheet Portal ─── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showDrawer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[990] flex items-end justify-center admin-section-root"
            >
              {/* Backdrop Overlay */}
              <div
                onClick={handleCancel}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              />

              {/* Drawer Content */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="relative w-full max-w-xl bg-[var(--admin-surface)] rounded-t-[24px] shadow-[0_-8px_30px_rgb(0,0,0,0.18)] z-10 max-h-[92vh] overflow-y-auto custom-scrollbar p-5 sm:p-6 lg:p-8 border-t border-[var(--admin-border-strong)] flex flex-col pb-[calc(24px+env(safe-area-inset-bottom))]"
              >
                {/* Grab Handle */}
                <div className="w-12 h-1 bg-[var(--admin-border)] rounded-full mx-auto mb-4 shrink-0" />

                <div className="flex items-start justify-between border-b border-[var(--admin-border-subtle)] pb-4 mb-5 shrink-0">
                  <div>
                    <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                        {editingId ? 'edit_note' : 'category'}
                      </span>
                      {editingId ? 'Edit Category' : 'Create Category'}
                    </h3>
                    <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5 leading-normal">
                      {editingId ? 'Update category properties and display scope' : 'Specify name, scope type, and publishing rules'}
                    </p>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="w-7 h-7 rounded-full bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-error-light)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)] flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 flex-1">
                  <div className="space-y-1.5">
                    <label className="admin-label">Category Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Traditional Mandaps"
                      value={formData.name}
                      onChange={handleNameChange}
                      className="admin-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="admin-label">Slug / URL Path *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. traditional-mandaps"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      className="admin-input font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="admin-label">Category Scope Type Scope *</label>
                    <select
                      className="admin-select"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="product">Product Catalog</option>
                      <option value="event">Real Event Showcase</option>
                      <option value="gallery">Inspiration Gallery</option>
                      <option value="global">Global Shared Scope</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <AdminToggle
                      label="Publishing Status"
                      description="Enable to display items of this category on the storefront"
                      checked={formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-[var(--admin-border-subtle)] mt-6">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="admin-btn admin-btn-outline flex-1 py-3 text-[11px] font-bold uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={submitting}
                      type="submit"
                      className="admin-btn admin-btn-primary flex-[2] py-3 text-[11px] font-bold uppercase tracking-wider"
                    >
                      {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Category'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}

export default AdminCategories;

