import { m as motion } from 'framer-motion';
import { SkeletonDashboard, stagger } from '../components/AdminUIKit';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { policyService } from '../../services/domainServices';
import { createSafeHtml } from '../../utils/security/sanitize';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import { useDraft } from '../hooks/useDraft';

export function AdminPolicyEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new' || !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('write'); // 'write' or 'preview'

  const {
    formData,
    setFormData,
    _draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: isNew ? 'admin:policy:add' : `admin:policy:edit:${id}`,
    module: 'Policies',
    pageTitle: isNew ? 'New Policy' : `Edit Policy ${id}`,
    initialData: {
      title: '',
      slug: '',
      content: '',
      status: 'draft',
      seoMetadata: { title: '', description: '' },
    },
    enabled: true,
  });

  const fetchPolicy = useCallback(async () => {
    try {
      const data = await policyService.getById(id);
      if (data.data) {
        setFormData(data.data);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load policy'));
      navigate('/admin/policies');
    } finally {
      setLoading(false);
    }
  }, [id, setFormData, navigate]);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      fetchPolicy();
    }
  }, [isNew, fetchPolicy]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await policyService.create(formData);
        toast.success('Policy created');
      } else {
        await policyService.update(id, formData);
        toast.success('Policy updated');
      }
      await deleteDraft();
      handleSuccessAction();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save policy'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAction = () => {
    navigate('/admin/policies');
  };

  const handleSuccessAction = () => {
    navigate('/admin/policies');
  };

  if (loading) return <SkeletonDashboard />;

  const editorContent = (
    <div className="space-y-6 flex-1 pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="admin-label">Policy Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Privacy Policy"
            className="admin-input text-base font-semibold"
          />
        </div>
        <div className="space-y-1.5">
          <label className="admin-label">URL Slug</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) =>
              setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })
            }
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
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="<p>Enter your policy content here using HTML tags...</p>"
              className="admin-textarea w-full h-[300px] p-4 font-mono text-sm bg-[var(--admin-bg-subtle)]"
            />
          ) : (
            <div
              className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-[var(--admin-text-primary)] prose-p:text-[var(--admin-text-secondary)] prose-p:leading-relaxed p-6 border border-[var(--admin-border)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-surface)]"
              dangerouslySetInnerHTML={createSafeHtml(
                formData.content || '<p class="text-gray-400">No content provided yet.</p>',
              )}
            />
          )}
        </div>
      </div>

      <div className="border-t border-[var(--admin-border-subtle)] pt-6 space-y-4">
        <h3 className="text-xs font-bold text-[var(--admin-text-primary)] uppercase tracking-wider">
          Search Engine Optimization
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="admin-label">Meta Title</label>
            <input
              type="text"
              value={formData.seoMetadata?.title || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  seoMetadata: { ...formData.seoMetadata, title: e.target.value },
                })
              }
              className="admin-input"
              placeholder="Enter meta title"
            />
          </div>
          <div className="space-y-1.5">
            <label className="admin-label">Meta Description</label>
            <textarea
              value={formData.seoMetadata?.description || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  seoMetadata: { ...formData.seoMetadata, description: e.target.value },
                })
              }
              className="admin-textarea h-24"
              placeholder="Enter meta description"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-[var(--admin-border-subtle)] flex items-center justify-end gap-3">
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
          <span className="material-symbols-outlined text-[16px]">{saving ? 'sync' : 'save'}</span>
          {saving ? 'Saving...' : 'Save Policy'}
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="max-w-4xl mx-auto space-y-6 pb-24"
    >
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

      <div className="admin-card p-6 lg:p-8">{editorContent}</div>

      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Policies"
        lastSavedAt={lastSavedAt}
      />

      <UnsavedChangesGuard blocker={blocker} />
    </motion.div>
  );
}
