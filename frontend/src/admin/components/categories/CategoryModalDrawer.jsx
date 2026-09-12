import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../../utils/core/errorHelpers';
import { AdminToggle } from '../AdminUIKit';
import { useMobileDrawerEngine, DrawerDragHandle } from '../../../components/ui/drawer';

const SCOPES = [
  { id: 'product', label: 'Product Catalog', icon: 'inventory_2' },
  { id: 'event', label: 'Real Events', icon: 'celebration' },
  { id: 'gallery', label: 'Inspiration Gallery', icon: 'photo_library' },
  { id: 'global', label: 'Global Scope', icon: 'public' },
];

export function CategoryModalDrawer({ isOpen, onClose, category = null, onSuccess }) {
  const isEditMode = Boolean(category && (category._id || category.id));

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('product');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose: !submitting ? onClose : undefined,
  });

  // Sync state when category or modal open state changes
  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name || '');
        setSlug(category.slug || '');
        setType(category.type || 'product');
        setIsActive(category.isActive !== undefined ? category.isActive : true);
      } else {
        setName('');
        setSlug('');
        setType('product');
        setIsActive(true);
      }
    }
  }, [category, isOpen]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  const generateSlug = (val) => {
    return (val || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlug(val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalSlug = slug.trim() || generateSlug(name.trim());
    if (!name.trim()) return toast.error('Category Name is required');
    if (!finalSlug) return toast.error('Slug identifier could not be generated');

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        slug: finalSlug,
        type,
        isActive,
      };

      const categoryId = category?._id || category?.id;

      if (isEditMode && categoryId) {
        await api.put(`/categories/${categoryId}`, payload);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', payload);
        toast.success('Category created successfully');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save category'));
    } finally {
      setSubmitting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
          {/* Blurred Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={!submitting ? onClose : undefined}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 pointer-events-auto cursor-pointer"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Modal / Mobile App Drawer Card */}
          <motion.div
            initial={{
              opacity: 0,
              y: isMobile ? '100%' : 8,
              scale: isMobile ? 1 : 0.98,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: isMobile ? '100%' : 8,
              scale: isMobile ? 1 : 0.98,
            }}
            transition={sheetTransition}
            {...dragProps}
            className="pointer-events-auto relative w-full sm:max-w-md md:max-w-lg bg-[var(--admin-surface)] rounded-t-2xl sm:rounded-[4px] shadow-2xl border-t sm:border border-[var(--admin-border)] flex flex-col max-h-[90dvh] sm:max-h-[85vh] overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && <DrawerDragHandle onClick={!submitting ? onClose : undefined} />}

            {/* Header */}
            <div className="px-5 py-3 sm:py-3.5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0 bg-[var(--admin-surface)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-[4px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[17px]">
                    {isEditMode ? 'edit_note' : 'category'}
                  </span>
                </div>
                <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] leading-none">
                  {isEditMode ? 'Edit Category' : 'Create Category'}
                </h3>
              </div>
              <button
                type="button"
                onClick={!submitting ? onClose : undefined}
                disabled={submitting}
                className="w-7 h-7 rounded-[4px] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                title="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto overscroll-contain touch-pan-y space-y-4 flex-1">
                {/* 1. Category Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Traditional Mandaps"
                    value={name}
                    onChange={handleNameChange}
                    className="w-full h-9 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] px-3 text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-muted)] font-medium outline-none transition-colors"
                  />
                </div>

                {/* 2. Slug / URL Path (Disabled / Auto-generated from title) */}
                <div className="space-y-1.5">
                  <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                    Slug / Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    placeholder="Auto-generated from title"
                    value={slug}
                    className="w-full h-9 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] px-3 text-[12px] font-mono text-[var(--admin-text-secondary)] opacity-75 cursor-not-allowed select-none outline-none"
                  />
                </div>

                {/* 3. Category Scope */}
                <div className="space-y-1.5">
                  <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                    Category Scope <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SCOPES.map((sc) => {
                      const isSelected = type === sc.id;
                      return (
                        <div
                          key={sc.id}
                          onClick={() => setType(sc.id)}
                          className={`h-9 px-3 rounded-[4px] border cursor-pointer transition-all flex items-center justify-between gap-2 select-none ${
                            isSelected
                              ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/5 text-[var(--admin-accent)] shadow-xs'
                              : 'border-[var(--admin-border)] hover:border-[var(--admin-border-strong)] bg-[var(--admin-surface)] text-[var(--admin-text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`material-symbols-outlined text-[16px] shrink-0 ${
                                isSelected
                                  ? 'text-[var(--admin-accent)]'
                                  : 'text-[var(--admin-text-secondary)]'
                              }`}
                            >
                              {sc.icon}
                            </span>
                            <span className="text-[12px] font-bold truncate">{sc.label}</span>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-[15px] text-[var(--admin-accent)] shrink-0">
                              check_circle
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Publishing Status Toggle */}
                <div className="pt-2">
                  <div className="h-11 px-3.5 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-between">
                    <span className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                      Publishing Status
                    </span>
                    <AdminToggle
                      checked={isActive}
                      onChange={() => setIsActive(!isActive)}
                      className="!py-0 !border-b-0"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Footer Action Bar */}
              <div className="px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5 border-t border-[var(--admin-border-subtle)] bg-[var(--admin-surface)] flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={!submitting ? onClose : undefined}
                  disabled={submitting}
                  className="h-9 px-4 rounded-[4px] border border-[var(--admin-border-strong)] text-[var(--admin-text-primary)] font-bold text-[12px] hover:bg-[var(--admin-surface-muted)] transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-5 rounded-[4px] bg-[var(--admin-accent)] hover:opacity-95 text-white font-bold text-[12px] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : isEditMode ? (
                    'Save Changes'
                  ) : (
                    'Create Category'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
export default CategoryModalDrawer;
