import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

  const handleUpdate = async (id, field, value) => {
    try {
      await api.put(`/categories/${id}`, { [field]: value });
      toast.success('Category updated');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to update category');
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/categories', {
        name: 'New Category',
        slug: `new-category-${Date.now()}`,
        type: 'product',
      });
      toast.success('Category created');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to create category');
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
        title="Dynamic Taxonomy"
        subtitle="Manage global categories used across the storefront, products, and navigation."
      >
        <button
          onClick={handleCreate}
          className="admin-btn admin-btn-primary"
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
            <button onClick={handleCreate} className="admin-btn admin-btn-primary admin-btn-sm">
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Category
            </button>
          }
        />
      ) : (
        <motion.div variants={fadeUp} className="admin-card divide-y divide-[var(--admin-border-subtle)]">
          {categories.map((cat) => (
            <div key={cat._id} className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 w-full">
                <div className="space-y-1.5">
                  <label className="admin-label">Name</label>
                  <AdminInput
                    value={cat.name}
                    onChange={(e) => handleUpdate(cat._id, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="admin-label">Slug</label>
                  <AdminInput
                    value={cat.slug}
                    onChange={(e) => handleUpdate(cat._id, 'slug', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="admin-label">Type</label>
                  <select
                    className="admin-select"
                    value={cat.type}
                    onChange={(e) => handleUpdate(cat._id, 'type', e.target.value)}
                  >
                    <option value="product">Product</option>
                    <option value="event">Event</option>
                    <option value="gallery">Gallery</option>
                    <option value="global">Global</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <AdminToggle
                  label="Active"
                  checked={cat.isActive}
                  onChange={() => handleUpdate(cat._id, 'isActive', !cat.isActive)}
                />
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

export default AdminCategories;
