import { m as motion, AnimatePresence } from 'framer-motion';
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
import { useConfirm } from '../../context/ConfirmProvider';

export function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [typeFilter, setTypeFilter] = useState('All');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);
  const confirm = useConfirm();

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
    if (
      !(await confirm({
        title: 'Delete Category',
        message: 'Are you sure you want to permanently delete this category?',
        type: 'danger',
      }))
    )
      return;

    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      setSelectedCategories((prev) => prev.filter((cId) => cId !== id));
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete category'));
    }
  };

  const toggleSelectAll = () => {
    setSelectedCategories((prev) =>
      prev.length === categories.length ? [] : categories.map((c) => c._id),
    );
  };

  const toggleSelect = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id],
    );
  };

  const handleBulkDelete = async () => {
    if (
      !(await confirm({
        title: 'Bulk Delete Categories',
        message: `Are you sure you want to permanently delete ${selectedCategories.length} categories?`,
        type: 'danger',
      }))
    )
      return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedCategories.map((id) => api.delete(`/categories/${id}`)));
      toast.success(`${selectedCategories.length} categories deleted`);
      setSelectedCategories([]);
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete some categories'));
      fetchCategories();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (
      !(await confirm({
        title: 'Bulk Deactivate Categories',
        message: `Are you sure you want to deactivate ${selectedCategories.length} categories?`,
        type: 'warning',
      }))
    )
      return;

    setIsBulkDeactivating(true);
    try {
      await Promise.all(
        selectedCategories.map((id) => api.put(`/categories/${id}`, { isActive: false })),
      );
      toast.success(`${selectedCategories.length} categories deactivated`);
      setSelectedCategories([]);
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to deactivate some categories'));
      fetchCategories();
    } finally {
      setIsBulkDeactivating(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) => typeFilter === 'All' || c.type === typeFilter,
  );

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-6">
      <PageHeader title="Manage Categories" subtitle={`${categories.length} categories cataloged`}>
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
          {/* Filters Header */}
          <div className="p-3 flex items-center justify-between gap-3 border-b border-[var(--admin-border-subtle)]">
            <div className="flex items-center gap-1 p-0.5 bg-[var(--admin-surface-muted)] rounded-md border border-[var(--admin-border)] overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] min-w-0">
              {['All', 'product', 'gallery', 'event'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-sm text-[11px] font-bold cursor-pointer transition-all capitalize whitespace-nowrap shrink-0 ${
                    typeFilter === t
                      ? 'bg-white text-[var(--admin-accent)] shadow-sm border border-[var(--admin-border-subtle)]'
                      : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-transparent'
                  }`}
                >
                  {t === 'All' ? 'All ' : t}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-[var(--admin-text-tertiary)] font-medium shrink-0 whitespace-nowrap">
              {filteredCategories.length} categories
            </span>
          </div>

          {/* Bulk Actions Header */}
          <AnimatePresence>
            {selectedCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-[var(--admin-surface-muted)] border-b border-[var(--admin-border-subtle)] rounded-t-[var(--admin-radius-lg)]"
              >
                <div className="p-3 flex items-center justify-between">
                  <span className="font-bold text-[13px] text-[var(--admin-text-primary)] pl-3">
                    {selectedCategories.length} Selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkDeactivate}
                      disabled={isBulkDeactivating}
                      className="admin-btn h-8 bg-amber-500 hover:bg-amber-600 text-white border-none px-3 text-[12px] font-bold shadow-sm flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      Deactivate
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="admin-btn h-8 bg-[var(--admin-error)] text-white hover:opacity-90 border-none px-3 text-[12px] font-bold shadow-sm flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="admin-btn-outline h-8 w-8 p-0 flex items-center justify-center shadow-sm ml-1"
                      title="Clear Selection"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="pl-6 w-[40px]">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredCategories.length > 0 &&
                          selectedCategories.length === filteredCategories.length
                        }
                        onChange={toggleSelectAll}
                        className="admin-checkbox"
                      />
                    </div>
                  </th>
                  <th>Category Name</th>
                  <th>Slug / URL Path</th>
                  <th>Type Scope</th>
                  <th>Status</th>
                  <th className="text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <tr
                    key={cat._id}
                    className={`hover:bg-[var(--admin-surface-muted)] transition-colors ${
                      selectedCategories.includes(cat._id) ? 'bg-[var(--admin-surface-muted)]' : ''
                    }`}
                  >
                    <td className="pl-6">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat._id)}
                          onChange={() => toggleSelect(cat._id)}
                          className="admin-checkbox"
                        />
                      </div>
                    </td>
                    <td>
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
