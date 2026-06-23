import { m as motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import {
  PageHeader,
  AdminToggle,
  EmptyState,
  SkeletonTable,
  fadeUp,
  stagger,
} from '../components/AdminUIKit';

export function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit moved to standalone AdminAddCategory component

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data?.success) setCategories(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load categories'));
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
      toast.error(getErrorMessage(err, 'Failed to update status'));
    }
  };

  // Edit form functions moved to standalone component

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete category'));
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader
        title="Manage Categories"
        subtitle={`${categories.length} categories cataloged · Group products, blueprints, and highlights`}
      >
        <button
          onClick={() => navigate('/admin/categories/add')}
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
            <button
              onClick={() => navigate('/admin/categories/add')}
              className="admin-btn admin-btn-primary admin-btn-sm"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Category
            </button>
          }
        />
      ) : (
        <motion.div
          variants={fadeUp}
          className="admin-card divide-y divide-[var(--admin-border-subtle)] p-0"
        >
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
                  <tr
                    key={cat._id}
                    className="hover:bg-[var(--admin-surface-muted)] transition-colors"
                  >
                    <td className="pl-6">
                      <span className="font-bold text-[var(--admin-text-primary)] text-[13px]">
                        {cat.name}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[11px] text-[var(--admin-text-secondary)]">
                        {cat.slug}
                      </span>
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
                          onClick={() => navigate(`/admin/categories/edit/${cat._id}`)}
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

      {/* Add / Edit Category Drawer replaced by standalone route */}
    </motion.div>
  );
}

export default AdminCategories;
