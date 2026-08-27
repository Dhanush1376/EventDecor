import { m as motion, AnimatePresence } from 'framer-motion';
import { SkeletonForm, fadeUp } from '../components/AdminUIKit';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { policyService } from '../../services/domainServices';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '../../utils/core/errorHelpers';
import { useDraft } from '../hooks/useDraft';

export function AdminPolicyEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new' || !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiError, setAiError] = useState(null);

  const [initialPolicyData, setInitialPolicyData] = useState({
    title: '',
    slug: '',
    content: '',
    status: 'draft',
    seoMetadata: { title: '', description: '' },
  });

  const {
    formData,
    setFormData,
    pageState,
    setPageState,
    draftStatus,
    hasDraft,
    showRestoreModal,
    setShowRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: isNew ? 'admin:policy:add' : `admin:policy:edit:${id}`,
    module: 'Policies',
    pageTitle: isNew ? 'New Policy' : `Edit Policy ${id}`,
    initialData: initialPolicyData,
    enabled: true,
  });

  const fetchPolicy = useCallback(async () => {
    try {
      const data = await policyService.getById(id);
      if (data.data) {
        setInitialPolicyData(data.data);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load policy'));
      navigate('/admin/policies');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const payload = {
        ...formData,
        content:
          typeof formData.content === 'string'
            ? formData.content
            : JSON.stringify(formData.content),
      };

      if (isNew) {
        await policyService.create(payload);
        toast.success('Policy created');
      } else {
        await policyService.update(id, payload);
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

  const handleAiAutoFillClick = () => {
    setAiTopic('');
    setShowAiModal(true);
  };

  const executeAiGeneration = async () => {
    if (!aiTopic.trim()) {
      toast.error('Please enter a policy topic.');
      return;
    }

    setShowAiModal(false);
    setIsGenerating(true);
    setAiError(null);
    const toastId = toast.loading(
      isNew
        ? 'Analyzing store settings and generating policy...'
        : 'Analyzing changes and updating policy...',
    );
    try {
      const payload = { topic: aiTopic };
      if (!isNew) {
        payload.existingPolicy = formData;
      }
      const res = await api.post('/policies/generate', payload);
      if (res.data?.success && res.data?.data) {
        const generated = res.data.data;
        setFormData({
          ...formData,
          title: generated.title || formData.title,
          slug: isNew ? generated.slug || formData.slug : formData.slug,
          seoMetadata: {
            title: generated.seoMetadata?.title || formData.seoMetadata?.title || '',
            description:
              generated.seoMetadata?.description || formData.seoMetadata?.description || '',
          },
          content: JSON.stringify(generated.content || []),
        });
        toast.success('Policy auto-filled successfully!', { id: toastId });
      }
    } catch (error) {
      const errMsg = getErrorMessage(error, 'Failed to generate policy');
      toast.error(errMsg, { id: toastId });
      setAiError(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuccessAction = () => {
    navigate('/admin/policies');
  };

  if (loading)
    return (
      <div className="space-y-6">
        <SkeletonForm fields={6} />
      </div>
    );

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

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancelAction}
            className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-none mb-1.5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-[var(--admin-accent)]">
                {isNew ? 'policy' : 'edit_note'}
              </span>
              {isNew ? 'Create Policy' : 'Edit Policy'}
              <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
            </h2>
            <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium">
              {isNew ? 'Configure a new store policy' : `Modifying v${formData.version || 1}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAiAutoFillClick}
            disabled={isGenerating}
            className="admin-btn h-9 px-4 flex items-center gap-1.5 rounded-[var(--admin-radius-md)] bg-[#826237] text-white hover:bg-[#b3976b] transition-colors font-bold text-[13px] shadow-sm"
          >
            {isGenerating && (
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
            )}
            <span>{isGenerating ? 'Generating...' : 'AI FILL'}</span>
          </button>
        </div>
      </div>

      {aiError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-red-500 shrink-0 mt-0.5">error</span>
          <div className="flex-1">
            <h3 className="text-red-800 dark:text-red-400 font-bold text-[13px] mb-1">
              AI Generation Failed
            </h3>
            <p className="text-red-600 dark:text-red-300 text-[12px] leading-relaxed">{aiError}</p>
          </div>
        </div>
      )}

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
      >
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* General Info */}
          <div className="admin-card p-4 sm:p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="admin-label">
                  Policy Title <span className="text-[var(--admin-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Privacy Policy"
                  className="admin-input font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="admin-label">
                  URL Slug <span className="text-[var(--admin-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  placeholder="e.g. privacy-policy"
                  className="admin-input font-mono"
                />
              </div>
            </div>

            <div className="border-t border-[var(--admin-border-subtle)] pt-6">
              <h3 className="text-[12px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">search</span>
                Search Engine Optimization
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="admin-label text-[11px]">Meta Title</label>
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
                  <label className="admin-label text-[11px]">Meta Description</label>
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
          </div>

          {/* Dynamic Content Builder */}
          <div className="admin-card p-4 sm:p-6 md:p-8 space-y-4">
            <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)] tracking-tight mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">article</span>
              Policy Content
            </h3>

            <AnimatePresence>
              {getSets().map((set, index) => (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  key={index}
                  className="p-3 sm:p-5 border border-[var(--admin-border-subtle)] rounded-[var(--admin-radius-lg)] bg-[var(--admin-surface)] relative group shadow-sm transition-all hover:border-[var(--admin-border)]"
                >
                  <button
                    onClick={() => removeSet(index)}
                    className="absolute -top-3 -right-3 w-7 h-7 flex items-center justify-center bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] text-[var(--admin-error)] transition-all hover:bg-[var(--admin-error)] hover:text-white hover:border-transparent rounded-full shadow-sm z-10"
                    title="Remove Set"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="admin-label text-[10px]">Heading</label>
                      <input
                        type="text"
                        value={set.heading || ''}
                        onChange={(e) => handleSetChange(index, 'heading', e.target.value)}
                        className="admin-input font-bold"
                        placeholder="e.g. 1. Order Cancellations"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="admin-label text-[10px]">Paragraph</label>
                      <textarea
                        value={set.paragraph || ''}
                        onChange={(e) => handleSetChange(index, 'paragraph', e.target.value)}
                        className="admin-textarea min-h-[120px]"
                        placeholder="Standard orders can be canceled..."
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button
              onClick={addSet}
              className="admin-btn-outline w-full py-4 mt-4 border-dashed border-2 rounded-[var(--admin-radius-lg)] hover:bg-[var(--admin-surface-muted)] hover:border-[var(--admin-border)] transition-all flex items-center justify-center gap-2 text-[var(--admin-text-secondary)] text-[12px] font-semibold tracking-wide uppercase"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Add Content Section
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6 sticky top-24">
          <div className="admin-card p-5">
            <h3 className="text-[13px] font-bold text-[var(--admin-text-primary)] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">publish</span>
              Publishing Settings
            </h3>

            <div className="space-y-2 mb-6">
              <label className="admin-label text-[11px]">Visibility Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="admin-select"
              >
                <option value="draft">Draft (Hidden)</option>
                <option value="published">Published (Visible)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 border-t border-[var(--admin-border-subtle)] pt-5 mt-5">
              <button
                onClick={handleCancelAction}
                className="admin-btn admin-btn-outline flex-1 h-10 font-bold rounded-[var(--admin-radius-md)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="admin-btn admin-btn-primary flex-1 h-10 font-bold rounded-[var(--admin-radius-md)]"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {saving ? 'sync' : 'save'}
                </span>
                {saving ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Policies"
        lastSavedAt={lastSavedAt}
      />

      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] shadow-xl overflow-hidden border border-[var(--admin-border)]"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4 text-[var(--admin-accent)]">
                  <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
                  <h3 className="text-[18px] font-bold text-[var(--admin-text-primary)]">
                    AI Auto-Fill
                  </h3>
                </div>
                <p className="text-[13px] text-[var(--admin-text-secondary)] mb-5">
                  {isNew
                    ? "What policy do you want to generate? The AI will automatically use your store's shipping, refund, and payment settings to write a precise policy."
                    : 'What changes would you like to make? The AI will update your existing policy based on your instructions and current store settings.'}
                </p>
                <div className="space-y-2">
                  <label className="admin-label">
                    {isNew ? 'Policy Topic' : 'Instructions for AI'}
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') executeAiGeneration();
                    }}
                    placeholder={
                      isNew
                        ? 'e.g. Shipping Policy, Refund Policy...'
                        : 'e.g. Add a clause about 2-day delivery...'
                    }
                    className="admin-input"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 px-6 py-4 bg-[var(--admin-surface-muted)] border-t border-[var(--admin-border-subtle)]">
                <button
                  onClick={() => setShowAiModal(false)}
                  className="admin-btn-outline flex-1 h-10 font-bold rounded-[var(--admin-radius-md)]"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAiGeneration}
                  className="admin-btn admin-btn-primary flex-1 h-10 font-bold rounded-[var(--admin-radius-md)] flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">magic_button</span>
                  Generate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <UnsavedChangesGuard blocker={blocker} />
    </div>
  );
}
