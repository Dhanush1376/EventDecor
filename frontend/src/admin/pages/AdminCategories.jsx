import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { SectionHeader, AdminInput, AdminToggle } from '../components/AdminUIKit';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionHeader
          icon="category"
          title="Dynamic Taxonomy"
          description="Manage global categories used across the storefront, products, and navigation."
        />
        <button
          onClick={handleCreate}
          className="btn-primary py-2 px-4 text-xs shadow-sm hover:shadow-md"
        >
          + Add Category
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-surface-container rounded-xl w-full" />
          <div className="h-16 bg-surface-container rounded-xl w-full" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/10 divide-y divide-outline-variant/10">
          {categories.map((cat) => (
            <div key={cat._id} className="p-4 flex items-center justify-between gap-4">
              <div className="grid grid-cols-3 gap-4 flex-1">
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Name</span>
                  <AdminInput
                    value={cat.name}
                    onChange={(e) => handleUpdate(cat._id, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Slug</span>
                  <AdminInput
                    value={cat.slug}
                    onChange={(e) => handleUpdate(cat._id, 'slug', e.target.value)}
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 block">Type</span>
                  <select
                    className="w-full h-10 border border-outline-variant/30 rounded-lg px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
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
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase mb-2 block">Active</span>
                  <AdminToggle
                    checked={cat.isActive}
                    onChange={() => handleUpdate(cat._id, 'isActive', !cat.isActive)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminCategories;
