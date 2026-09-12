import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../../utils/core/errorHelpers';
import { AdminToggle } from '../AdminUIKit';
import { useMobileDrawerEngine, DrawerDragHandle } from '../../../components/ui/drawer';

export function PolicyModalDrawer({ isOpen, onClose, policy = null, onSuccess }) {
  const isEditMode = Boolean(policy && (policy._id || policy.id));

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState('published');
  const [sections, setSections] = useState([{ heading: '', paragraph: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiTopic, setAiTopic] = useState('');

  const { isMobile, dragProps, sheetTransition } = useMobileDrawerEngine({
    isOpen,
    onClose: !submitting ? onClose : undefined,
  });

  const parseContentToSections = (content) => {
    if (!content) return [{ heading: '', paragraph: '' }];
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      if (typeof window !== 'undefined' && typeof content === 'string') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const parsedSections = [];
        let currentHeading = '';
        let currentParagraphs = [];

        Array.from(doc.body.children).forEach((el) => {
          if (el.tagName.match(/^H[1-6]$/i)) {
            if (currentHeading || currentParagraphs.length > 0) {
              parsedSections.push({
                heading: currentHeading,
                paragraph: currentParagraphs.join('\n\n'),
              });
            }
            currentHeading = el.textContent.trim();
            currentParagraphs = [];
          } else {
            const text = el.textContent.trim();
            if (text) currentParagraphs.push(text);
          }
        });

        if (currentHeading || currentParagraphs.length > 0) {
          parsedSections.push({
            heading: currentHeading,
            paragraph: currentParagraphs.join('\n\n'),
          });
        }

        if (parsedSections.length > 0) return parsedSections;
      }
    }
    return [{ heading: '', paragraph: '' }];
  };

  const generateSlug = (val) => {
    return (val || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Sync state when policy or modal open state changes
  useEffect(() => {
    if (isOpen) {
      if (policy) {
        setTitle(policy.title || '');
        setSlug(policy.slug || '');
        setStatus(policy.status || (policy.isActive ? 'published' : 'draft'));
        setSections(parseContentToSections(policy.content));
      } else {
        setTitle('');
        setSlug('');
        setStatus('published');
        setSections([{ heading: '', paragraph: '' }]);
      }
      setShowAiPrompt(false);
      setAiTopic('');
    }
  }, [policy, isOpen]);

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

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    setSlug(generateSlug(val));
  };

  const handleSectionChange = (index, field, value) => {
    setSections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddSection = () => {
    setSections((prev) => [...prev, { heading: '', paragraph: '' }]);
  };

  const handleRemoveSection = (index) => {
    if (sections.length <= 1) {
      setSections([{ heading: '', paragraph: '' }]);
      return;
    }
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAiAutoFill = async () => {
    const topic = aiTopic.trim() || title.trim();
    if (!topic) {
      toast.error('Please enter a policy topic or title first');
      return;
    }

    setIsGeneratingAi(true);
    const toastId = toast.loading('Generating policy with AI...');
    try {
      const payload = { topic };
      if (isEditMode && policy) {
        payload.existingPolicy = { ...policy, title, slug };
      }
      const res = await api.post('/policies/generate', payload);
      if (res.data?.success && res.data?.data) {
        const generated = res.data.data;
        if (generated.title && !title) {
          setTitle(generated.title);
          setSlug(generateSlug(generated.title));
        }
        if (generated.content) {
          const parsed = parseContentToSections(generated.content);
          setSections(parsed);
        }
        toast.success('Policy generated successfully', { id: toastId });
        setShowAiPrompt(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to generate policy content'), { id: toastId });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalSlug = slug.trim() || generateSlug(title.trim());
    if (!title.trim()) return toast.error('Policy Title is required');
    if (!finalSlug) return toast.error('Slug identifier could not be generated');

    // Filter out empty sections if multiple exist
    const validSections = sections.filter((s) => s.heading.trim() || s.paragraph.trim());
    if (validSections.length === 0) {
      return toast.error('Please add at least one policy section');
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        slug: finalSlug,
        content: JSON.stringify(validSections),
        status,
      };

      const policyId = policy?._id || policy?.id;

      if (isEditMode && policyId) {
        await api.put(`/policies/${policyId}`, payload);
        toast.success('Policy updated successfully');
      } else {
        await api.post('/policies', payload);
        toast.success('Policy created successfully');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save policy'));
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
            className="pointer-events-auto relative w-full sm:max-w-xl md:max-w-2xl bg-[var(--admin-surface)] rounded-t-2xl sm:rounded-[4px] shadow-2xl border-t sm:border border-[var(--admin-border)] flex flex-col max-h-[90dvh] sm:max-h-[88vh] overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && <DrawerDragHandle onClick={!submitting ? onClose : undefined} />}

            {/* Header */}
            <div className="px-5 py-3 sm:py-3.5 border-b border-[var(--admin-border-subtle)] flex items-center justify-between shrink-0 bg-[var(--admin-surface)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-[4px] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[17px]">
                    {isEditMode ? 'edit_note' : 'policy'}
                  </span>
                </div>
                <h3 className="text-[14px] sm:text-[15px] font-bold text-[var(--admin-text-primary)] leading-none">
                  {isEditMode ? 'Edit Policy' : 'Create Policy'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAiPrompt((prev) => !prev)}
                  className="h-7 px-2.5 rounded-[4px] bg-[var(--admin-accent)]/10 hover:bg-[var(--admin-accent)]/20 text-[var(--admin-accent)] text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Generate with AI"
                >
                  <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                  <span>AI Fill</span>
                </button>
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
            </div>

            {/* AI Auto-Fill Expandable Bar */}
            <AnimatePresence>
              {showAiPrompt && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-[var(--admin-surface-muted)] border-b border-[var(--admin-border)] overflow-hidden shrink-0"
                >
                  <div className="p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Shipping Policy, Refund Policy..."
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAiAutoFill();
                        }
                      }}
                      className="flex-1 h-8 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] px-2.5 text-[12.5px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-muted)] font-medium outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAiAutoFill}
                        disabled={isGeneratingAi}
                        className="h-8 px-3 rounded-[4px] bg-[var(--admin-accent)] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isGeneratingAi ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[15px]">
                              magic_button
                            </span>
                            <span>Generate</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAiPrompt(false)}
                        className="h-8 px-2.5 rounded-[4px] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] text-[12px] font-medium hover:bg-[var(--admin-surface)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto overscroll-contain touch-pan-y space-y-4 flex-1">
                {/* 1. Policy Title */}
                <div className="space-y-1.5">
                  <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                    Policy Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Terms & Conditions"
                    value={title}
                    onChange={handleTitleChange}
                    className="w-full h-9 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] px-3 text-[13px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-muted)] font-medium outline-none transition-colors"
                  />
                </div>

                {/* 2. Slug / URL Path (Disabled / Auto-generated) */}
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

                {/* 3. Content Sections */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11.5px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                      Policy Sections <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="text-[11.5px] font-bold text-[var(--admin-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">add_circle</span>
                      <span>Add Section</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {sections.map((sec, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-[4px] border border-[var(--admin-border)] bg-[var(--admin-surface)] space-y-2.5 relative group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            placeholder={`Section ${idx + 1} Heading (e.g. 1. Cancellations)`}
                            value={sec.heading}
                            onChange={(e) => handleSectionChange(idx, 'heading', e.target.value)}
                            className="flex-1 h-8 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] focus:border-[var(--admin-accent)] px-2.5 text-[12.5px] font-bold text-[var(--admin-text-primary)] placeholder-[var(--admin-text-muted)] outline-none"
                          />
                          {sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(idx)}
                              className="w-7 h-7 rounded-[4px] text-[var(--admin-text-tertiary)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              title="Delete Section"
                            >
                              <span className="material-symbols-outlined text-[17px]">delete</span>
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={3}
                          placeholder="Enter section content and policy clauses..."
                          value={sec.paragraph}
                          onChange={(e) => handleSectionChange(idx, 'paragraph', e.target.value)}
                          className="w-full p-2.5 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border-subtle)] focus:border-[var(--admin-accent)] text-[12.5px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-muted)] outline-none resize-y leading-relaxed font-normal"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Publishing Status Toggle */}
                <div className="pt-2">
                  <div className="h-11 px-3.5 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-between">
                    <span className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                      Publishing Status
                    </span>
                    <AdminToggle
                      checked={status === 'published'}
                      onChange={() => setStatus(status === 'published' ? 'draft' : 'published')}
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
                    'Create Policy'
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

export default PolicyModalDrawer;
