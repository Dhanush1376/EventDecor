import { m as motion, AnimatePresence } from 'framer-motion';
import { SkeletonDashboard, stagger, AdminSkeleton } from '../components/AdminUIKit';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { policyService } from '../../services/domainServices';
import api from '../../services/api';
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

  const getSets = () => {
    if (!formData.content) return [{ heading: '', paragraph: '' }];

    try {
      const parsed = JSON.parse(formData.content);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      if (typeof window !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(formData.content, 'text/html');
        const newSets = [];
        let currentHeading = '';
        let currentParagraphs = [];

        Array.from(doc.body.children).forEach((el) => {
          if (el.tagName.match(/^H[1-6]$/i)) {
            if (currentHeading || currentParagraphs.length > 0) {
              newSets.push({ heading: currentHeading, paragraph: currentParagraphs.join('\n\n') });
            }
            currentHeading = el.textContent.trim();
            currentParagraphs = [];
          } else {
            const text = el.textContent.trim();
            if (text) currentParagraphs.push(text);
          }
        });

        if (currentHeading || currentParagraphs.length > 0) {
          newSets.push({ heading: currentHeading, paragraph: currentParagraphs.join('\n\n') });
        }

        if (newSets.length > 0) return newSets;
      }
    }
    return [{ heading: '', paragraph: '' }];
  };

  const handleSetChange = (index, field, value) => {
    const sets = getSets();
    sets[index][field] = value;
    setFormData({ ...formData, content: JSON.stringify(sets) });
  };

  const addSet = () => {
    const sets = getSets();
    sets.push({ heading: '', paragraph: '' });
    setFormData({ ...formData, content: JSON.stringify(sets) });
  };

  const removeSet = (index) => {
    const sets = getSets();
    sets.splice(index, 1);
    setFormData({ ...formData, content: JSON.stringify(sets) });
  };

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

      <div className="space-y-4 pt-4 mt-4 min-h-[300px]">
        <h3 className="text-xs font-bold text-[var(--admin-text-primary)] uppercase tracking-wider mb-2">
          Policy Content
        </h3>
        <AnimatePresence>
          {getSets().map((set, index) => (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              key={index}
              className="p-4 border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-md)] bg-[var(--admin-surface)] relative group"
            >
              <button
                onClick={() => removeSet(index)}
                className="absolute top-3 right-3 text-[var(--admin-error)] opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--admin-error-light)] rounded"
                title="Remove Set"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="admin-label text-[10px]">Heading</label>
                  <input
                    type="text"
                    value={set.heading || ''}
                    onChange={(e) => handleSetChange(index, 'heading', e.target.value)}
                    className="admin-input font-bold"
                    placeholder="e.g. 1. Order Cancellations"
                  />
                </div>
                <div className="space-y-1">
                  <label className="admin-label text-[10px]">Paragraph</label>
                  <textarea
                    value={set.paragraph || ''}
                    onChange={(e) => handleSetChange(index, 'paragraph', e.target.value)}
                    className="admin-textarea min-h-[100px]"
                    placeholder="Standard orders can be canceled..."
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <button
          onClick={addSet}
          className="admin-btn admin-btn-outline w-full py-3 mt-2 border-dashed border-2 hover:bg-[var(--admin-surface-muted)]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span> Add Set
        </button>
      </div>

      <div className="border-t border-[var(--admin-border-subtle)] pt-6 space-y-4 mt-16">
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center sticky top-0 bg-[var(--admin-surface)] z-10 py-4 border-b border-[var(--admin-border-subtle)]">
        <div className="flex items-center gap-4">
          <button onClick={handleCancelAction} className="admin-btn admin-btn-icon">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--admin-text-primary)] tracking-tight">
              {isNew ? 'New Policy' : `Edit Policy (v${formData.version || 1})`}
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
