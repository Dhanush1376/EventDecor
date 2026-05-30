import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { policyService } from '../../services/domainServices';
import { createSafeHtml } from '../../utils/sanitize';
import { toast } from 'react-hot-toast';
import { SkeletonDashboard, fadeUp, stagger } from '../components/AdminUIKit';

export function AdminPolicyEditor({ isOpen, onClose, editId }) {
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  const id = editId || routeId;
  const isDrawerMode = isOpen !== undefined;
  const isNew = id === 'new' || !id;

  const [loading, setLoading] = useState(isDrawerMode ? false : !isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('write'); // 'write' or 'preview'
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    status: 'draft',
    seoMetadata: { title: '', description: '' }
  });

  useEffect(() => {
    if (isNew) {
      setFormData({
        title: '',
        slug: '',
        content: '',
        status: 'draft',
        seoMetadata: { title: '', description: '' }
      });
    }
  }, [id, isNew]);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      fetchPolicy();
    }
  }, [id, isNew]);

  const fetchPolicy = async () => {
    try {
      const data = await policyService.getById(id);
      if (data.data) {
        setFormData(data.data);
      }
    } catch (error) {
      toast.error('Failed to load policy');
      handleCancelAction();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await policyService.create(formData);
        toast.success("Policy created");
      } else {
        await policyService.update(id, formData);
        toast.success("Policy updated");
      }
      handleSuccessAction();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAction = () => {
    if (isDrawerMode) {
      onClose();
    } else {
      navigate('/admin/policies');
    }
  };

  const handleSuccessAction = () => {
    if (isDrawerMode) {
      onClose();
    } else {
      navigate('/admin/policies');
    }
  };

  if (loading && !isDrawerMode) return <SkeletonDashboard />;

  const editorContent = (
    <div className="space-y-6 flex-1 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="admin-label">Policy Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Privacy Policy"
            className="admin-input text-base font-semibold"
          />
        </div>
        <div className="space-y-1.5">
          <label className="admin-label">URL Slug</label>
          <input
            type="text"
            value={formData.slug}
            onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            placeholder="e.g. privacy-policy"
            className="admin-input text-base font-mono"
          />
        </div>
      </div>

      <div className="space-y-2 pt-4">
        <div className="flex items-center border-b border-[var(--admin-border-subtle)]">
          <button
            onClick={() => setActiveTab('write')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer bg-transparent border-none ${activeTab === 'write' ? 'border-[var(--admin-accent)] text-[var(--admin-text-primary)]' : 'border-transparent text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'}`}
          >
            Write (HTML)
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer bg-transparent border-none ${activeTab === 'preview' ? 'border-[var(--admin-accent)] text-[var(--admin-text-primary)]' : 'border-transparent text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'}`}
          >
            Preview
          </button>
        </div>

        <div className="mt-4 min-h-[300px]">
          {activeTab === 'write' ? (
            <textarea
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              placeholder="<p>Enter your policy content here using HTML tags...</p>"
              className="admin-textarea w-full h-[300px] p-4 font-mono text-sm bg-[var(--admin-bg-subtle)]"
            />
          ) : (
            <div 
              className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-[var(--admin-text-primary)] prose-p:text-[var(--admin-text-secondary)] prose-p:leading-relaxed p-6 border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-surface)]"
              dangerouslySetInnerHTML={createSafeHtml(formData.content || '<p class="text-gray-400">No content provided yet.</p>')}
            />
          )}
        </div>
      </div>

      <div className="border-t border-[var(--admin-border-subtle)] pt-6 space-y-4">
        <h3 className="text-xs font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">Search Engine Optimization</h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="admin-label">Meta Title</label>
            <input
              type="text"
              value={formData.seoMetadata?.title || ''}
              onChange={e => setFormData({ ...formData, seoMetadata: { ...formData.seoMetadata, title: e.target.value } })}
              className="admin-input"
              placeholder="Enter meta title"
            />
          </div>
          <div className="space-y-1.5">
            <label className="admin-label">Meta Description</label>
            <textarea
              value={formData.seoMetadata?.description || ''}
              onChange={e => setFormData({ ...formData, seoMetadata: { ...formData.seoMetadata, description: e.target.value } })}
              className="admin-textarea h-24"
              placeholder="Enter meta description"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-[var(--admin-border-subtle)] flex items-center justify-end gap-3">
        <select
          value={formData.status}
          onChange={e => setFormData({ ...formData, status: e.target.value })}
          className="admin-select min-h-[40px] py-2 w-32"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <button
          type="button"
          onClick={handleCancelAction}
          className="admin-btn admin-btn-outline min-h-[40px] px-6"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="admin-btn admin-btn-primary min-h-[40px] px-6"
        >
          <span className="material-symbols-outlined text-[16px]">{saving ? "sync" : "save"}</span>
          {saving ? 'Saving...' : 'Save Policy'}
        </button>
      </div>
    </div>
  );

  if (isDrawerMode) {
    return typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[990] flex items-end justify-center admin-section-root"
          >
            {/* Backdrop Blur overlay */}
            <div
              onClick={handleCancelAction}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            
            {/* Slide-Up Bottom Drawer Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-full max-w-4xl bg-[var(--admin-surface)] rounded-t-[24px] shadow-[0_-8px_30px_rgb(0,0,0,0.18)] z-10 max-h-[92vh] overflow-y-auto custom-scrollbar p-5 sm:p-6 lg:p-8 border-t border-[var(--admin-border-strong)] flex flex-col pb-[calc(24px+env(safe-area-inset-bottom))]"
            >
              {/* Grab Handle */}
              <div className="w-12 h-1 bg-[var(--admin-border)] rounded-full mx-auto mb-4 shrink-0" />

              {/* Form Title & Subtitle */}
              <div className="mb-5 pb-3 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[var(--admin-accent)]">
                      {isNew ? "note_add" : "edit_note"}
                    </span>
                    {isNew ? "Create Policy" : "Edit Policy"}
                  </h3>
                  <p className="text-[10.5px] text-[var(--admin-text-tertiary)] mt-0.5">
                    {isNew ? "Draft legal or storefront policy clauses" : "Update policy details and SEO settings"}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={handleCancelAction}
                  className="w-7 h-7 rounded-full bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-error-light)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)] flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 flex justify-center items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--admin-accent)] border-t-transparent animate-spin" />
                </div>
              ) : editorContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center sticky top-0 bg-[var(--admin-surface)] z-10 py-4 border-b border-[var(--admin-border-subtle)]">
        <div className="flex items-center gap-4">
          <button onClick={handleCancelAction} className="admin-btn admin-btn-icon">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--admin-text-primary)] tracking-tight">
              {isNew ? 'New Policy' : 'Edit Policy'}
            </h1>
          </div>
        </div>
      </div>

      <div className="admin-card p-6 lg:p-8">
        {editorContent}
      </div>
    </motion.div>
  );
}

