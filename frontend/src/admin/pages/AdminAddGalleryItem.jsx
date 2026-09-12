import React, { useState, useEffect, useMemo } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { GalleryMediaUploader } from '../components/gallery/GalleryMediaUploader';
import { GalleryItemLivePreview } from '../components/gallery/GalleryItemLivePreview';
import { useNavigate, useParams } from 'react-router-dom';
import { galleryService, productService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { useAdmin } from '../context/AdminContext';
import { useDraft } from '../hooks/useDraft';
import { AdminSkeleton } from '../components/ui/Skeletons';
import { CmsProductPicker } from '../components/cms/CmsProductPicker';

const WIZARD_STEPS = [
  { id: 'media', label: 'Media', icon: 'photo_library' },
  { id: 'details', label: 'Details', icon: 'info' },
  { id: 'products', label: 'Products', icon: 'shopping_bag' },
  { id: 'review', label: 'Review & Publish', icon: 'publish' },
];

const POPULAR_TAG_SUGGESTIONS = [
  'wedding',
  'mandap',
  'reception',
  'haldi',
  'jasmine',
  'marigold',
  'traditional',
  'temple',
  'gold',
  'minimalist',
  'floral-arch',
  'brass',
  'stage-decor',
];

const stepAnimation = {
  initial: { opacity: 0, x: 14 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -14 },
  transition: { duration: 0.18 },
};

export function AdminAddGalleryItem() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { customCategories } = useAdmin();

  const [currentStep, setCurrentStep] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPromptTitle, setAiPromptTitle] = useState('');
  const [tagInput, setTagInput] = useState('');

  const {
    formData: newItem,
    setFormData: setNewItem,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: isEditing ? `admin:gallery:edit:${id}` : 'admin:gallery:add',
    module: 'Gallery',
    pageTitle: isEditing ? `Edit Gallery Item ${id}` : 'New Gallery Item',
    initialData: {
      title: '',
      teluguTitle: '',
      customerNote: '',
      complimentaryGift: {
        enabled: false,
        name: '',
        quantity: 1,
        description: '',
        displayBadge: '',
      },
      category: '',
      event: '',
      style: '',
      image: '',
      video: '',
      tags: '',
      description: '',
      story: '',
      type: 'inspiration',
      linkedProducts: [],
    },
    enabled: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodRes = await productService.getAll({ limit: 150 });
        if (prodRes.success)
          setProducts(prodRes.data.data || prodRes.data.items || prodRes.data || []);

        if (isEditing) {
          const res = await galleryService.getById(id);
          if (res.success) {
            const item = res.data;
            setNewItem({
              title: item.title || '',
              teluguTitle: item.teluguTitle || '',
              customerNote: item.customerNote || '',
              complimentaryGift: item.complimentaryGift || {
                enabled: false,
                name: '',
                quantity: 1,
                description: '',
                displayBadge: '',
              },
              category: item.category || item.primaryCategory?.name || '',
              event: item.event || '',
              style: item.style || '',
              image: item.image || '',
              video: item.video || '',
              type: item.type || 'inspiration',
              tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
              description: item.description || '',
              story: item.story || '',
              linkedProducts: Array.isArray(item.linkedProducts)
                ? item.linkedProducts.map((p) => p._id || p.id || p)
                : [],
            });
          } else {
            toast.error('Failed to load showcase details');
            navigate('/admin/gallery');
          }
        }
      } catch (_err) {
        toast.error('Error loading gallery data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditing, navigate, setNewItem]);

  // Parse tags into array for pill management
  const currentTags = useMemo(() => {
    if (!newItem.tags) return [];
    if (Array.isArray(newItem.tags)) return newItem.tags;
    return newItem.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }, [newItem.tags]);

  const handleAddTag = (tagToAdd) => {
    const trimmed = tagToAdd.trim().toLowerCase().replace(/^#/, '');
    if (!trimmed) return;
    if (currentTags.includes(trimmed)) return;
    const updated = [...currentTags, trimmed];
    setNewItem((prev) => ({ ...prev, tags: updated.join(', ') }));
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    const updated = currentTags.filter((t) => t !== tagToRemove);
    setNewItem((prev) => ({ ...prev, tags: updated.join(', ') }));
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const isStepValid = (stepIndex = currentStep) => {
    if (stepIndex === 0) {
      if (!newItem.image) {
        toast.error('Please upload a cover photo');
        return false;
      }
    }
    if (stepIndex === 1) {
      if (!newItem.title?.trim()) {
        toast.error('Please enter a showcase title');
        return false;
      }
      if (!newItem.category) {
        toast.error('Please select a category');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleAiAutofill = () => {
    const prompt = (aiPromptTitle || newItem.title || '').trim();
    if (!prompt) {
      toast.error('Please enter keywords for AI!');
      return;
    }
    const loadId = toast.loading('AI generating details...');
    setShowAiModal(false);

    setTimeout(() => {
      toast.dismiss(loadId);
      setNewItem((prev) => ({
        ...prev,
        title: prev.title || prompt,
        teluguTitle: prev.teluguTitle || 'రాయల్ వివాహ మంటపం అలంకరణ',
        category: prev.category || 'Traditional',
        event: prev.event || 'Wedding',
        style: prev.style || 'Grand Heritage Mandap',
        tags:
          prev.tags || 'wedding, mandap, jasmine, marigold, traditional, gold, brass, south-indian',
        description:
          prev.description ||
          'Majestic wedding setup adorned with Mogra jasmine trails, fresh marigold clusters, and temple brass accents.',
      }));
      toast.success('Details populated!');
    }, 900);
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!newItem.image) {
      setCurrentStep(0);
      return toast.error('Please upload a cover photo!');
    }
    if (!newItem.title?.trim()) {
      setCurrentStep(1);
      return toast.error('Please enter a showcase title!');
    }
    if (!newItem.category) {
      setCurrentStep(1);
      return toast.error('Please select a category!');
    }

    setSubmitting(true);
    const payload = {
      ...newItem,
      title: newItem.title.trim(),
      category: newItem.category.trim(),
      tags: currentTags,
    };

    try {
      if (isEditing) {
        const res = await galleryService.update(id, payload);
        if (res.success) {
          await deleteDraft();
          toast.success('Showcase updated successfully!');
          navigate('/admin/gallery');
        }
      } else {
        const res = await galleryService.create(payload);
        if (res.success) {
          await deleteDraft();
          toast.success('Showcase published!');
          navigate('/admin/gallery');
        }
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          (isEditing ? 'Failed to update showcase' : 'Failed to create showcase'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <AdminSkeleton className="w-48 h-8 rounded-md" />
            <AdminSkeleton className="w-64 h-4 rounded-md" />
          </div>
          <AdminSkeleton className="w-32 h-9 rounded-md hidden sm:block" />
        </div>
        <div className="space-y-4">
          <AdminSkeleton className="w-full h-12 rounded-lg" />
          <AdminSkeleton className="w-full h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col -mt-4 sm:-mt-5 md:-mt-6 lg:-mt-8 -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8">
      {/* ─── STICKY TOP WIZARD TOOLBAR (FLUSH BENEATH TOPBAR) ─── */}
      <header className="sticky top-[var(--admin-topbar-height,56px)] z-30 w-full bg-[var(--admin-surface)]/95 backdrop-blur-md border-b border-[var(--admin-border)] shadow-xs">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-3">
          {/* Left: Back + Title + Draft Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/admin/gallery')}
              className="w-8 h-8 rounded-[6px] bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] cursor-pointer transition-all active:scale-95 shadow-2xs shrink-0"
              title="Back to Gallery"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[14.5px] sm:text-[16px] font-bold text-[var(--admin-text-primary)] tracking-tight truncate leading-tight">
                  {isEditing ? 'Edit Showcase' : 'New Showcase'}
                </h1>
                <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} compact />
              </div>
              <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium truncate mt-0.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent)]">
                  {WIZARD_STEPS[currentStep].icon}
                </span>
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  Step {currentStep + 1}: {WIZARD_STEPS[currentStep].label}
                </span>
              </p>
            </div>
          </div>

          {/* Stepper: Desktop Segmented Pills */}
          <div className="hidden md:flex items-center gap-1.5 bg-[var(--admin-surface-muted)] p-1 rounded-[8px] border border-[var(--admin-border)]">
            {WIZARD_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isActive = idx === currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (idx <= currentStep || isStepValid()) {
                      setCurrentStep(idx);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-[11px] font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-xs border border-[var(--admin-border)]'
                      : isCompleted
                        ? 'text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface)]/60'
                        : 'text-[var(--admin-text-tertiary)] opacity-60'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-[14px] text-emerald-600 font-bold">
                        check
                      </span>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Step Indicator Badge & Cancel */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="md:hidden text-[10px] font-bold text-[var(--admin-accent)] bg-[var(--admin-surface-muted)] px-2 py-0.5 rounded-[4px] border border-[var(--admin-border)] uppercase tracking-wider">
              {currentStep + 1} / {WIZARD_STEPS.length}
            </span>
            <button
              type="button"
              onClick={() => navigate('/admin/gallery')}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[5px] text-[11.5px] font-bold text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-muted)] border border-transparent hover:border-[var(--admin-border)] transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Mobile 4-Segment Progress Bar */}
        <div className="grid grid-cols-4 gap-1.5 px-3.5 pb-2 sm:hidden border-t border-[var(--admin-border-subtle)] pt-1.5 bg-[var(--admin-surface-muted)]/40">
          {WIZARD_STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCur = idx === currentStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (idx <= currentStep || isStepValid()) {
                    setCurrentStep(idx);
                  }
                }}
                className="group flex flex-col gap-1 cursor-pointer outline-none"
              >
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isCur
                      ? 'bg-[var(--admin-accent)] shadow-xs'
                      : isDone
                        ? 'bg-emerald-500'
                        : 'bg-[var(--admin-surface-muted)] border border-[var(--admin-border-subtle)]'
                  }`}
                />
                <span
                  className={`text-[9.5px] font-bold truncate text-center transition-colors ${
                    isCur
                      ? 'text-[var(--admin-accent)]'
                      : isDone
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-[var(--admin-text-tertiary)]'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ─── MAIN WIZARD CONTENT CONTAINER ─── */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-4 pb-28 lg:pb-12 space-y-4">
        {/* ─── STEP WORKSPACE ─── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={stepAnimation.initial}
            animate={stepAnimation.animate}
            exit={stepAnimation.exit}
            transition={stepAnimation.transition}
          >
            {/* STEP 0: MEDIA */}
            {currentStep === 0 && (
              <div className="admin-card p-4 sm:p-5 space-y-3.5 rounded-[8px]">
                <div className="border-b border-[var(--admin-border)] pb-2.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px] text-[var(--admin-accent)]">
                    photo_library
                  </span>
                  <h3 className="font-bold text-[13.5px] text-[var(--admin-text-primary)]">
                    Upload Media
                  </h3>
                </div>

                <GalleryMediaUploader
                  image={newItem.image}
                  video={newItem.video}
                  onImageChange={(val) => setNewItem({ ...newItem, image: val })}
                  onVideoChange={(val) => setNewItem({ ...newItem, video: val })}
                  folder="gallery"
                />
              </div>
            )}

            {/* STEP 1: DETAILS */}
            {currentStep === 1 && (
              <div className="admin-card p-4 sm:p-5 space-y-4 rounded-[8px]">
                <div className="border-b border-[var(--admin-border)] pb-2.5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[17px] text-[var(--admin-accent)]">
                    info
                  </span>
                  <h3 className="font-bold text-[13.5px] text-[var(--admin-text-primary)]">
                    Showcase Details
                  </h3>
                </div>

                {/* Classification Type */}
                <div>
                  <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block mb-1.5">
                    Type
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'inspiration', icon: 'palette', label: 'Design Inspiration' },
                      { id: 'real-event', icon: 'celebration', label: 'Real Event Setup' },
                    ].map((t) => {
                      const isSelected = newItem.type === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setNewItem({ ...newItem, type: t.id })}
                          className={`p-2.5 rounded-[6px] border text-left transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/5 text-[var(--admin-accent)] shadow-2xs font-bold'
                              : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-accent)]/50 text-[var(--admin-text-secondary)]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                          <span className="text-[12px]">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title & Telugu Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="admin-label mb-0 text-[11px]">Title *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAiPromptTitle(newItem.title || '');
                          setShowAiModal(true);
                        }}
                        className="text-[10px] font-bold text-[var(--admin-accent)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                        <span>AI Autofill</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={newItem.title}
                      onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                      className="admin-input text-[12.5px]"
                      placeholder="e.g. Swarna Malli Traditional Mandap"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="admin-label mb-0 text-[11px]">
                      Telugu Title{' '}
                      <span className="text-[9.5px] font-normal text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-800 ml-1">
                        తెలుగు
                      </span>
                    </label>
                    <input
                      type="text"
                      value={newItem.teluguTitle}
                      onChange={(e) => setNewItem({ ...newItem, teluguTitle: e.target.value })}
                      className="admin-input text-[12.5px]"
                      placeholder="ఉదా: స్వర్ణ మల్లె సాంప్రదాయ పందిరి"
                    />
                  </div>
                </div>

                {/* Category, Event, Style */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="admin-label mb-0 text-[11px]">Category *</label>
                    <select
                      required
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      className="admin-select text-[12.5px]"
                    >
                      <option value="">Select Category</option>
                      <option value="Traditional">Traditional</option>
                      <option value="Floral">Floral</option>
                      <option value="Modern">Modern</option>
                      <option value="Royal">Royal</option>
                      <option value="Minimalist">Minimalist</option>
                      <option value="Rustic">Rustic</option>
                      {customCategories?.events?.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="admin-label mb-0 text-[11px]">Event Type</label>
                    <input
                      type="text"
                      value={newItem.event}
                      onChange={(e) => setNewItem({ ...newItem, event: e.target.value })}
                      className="admin-input text-[12.5px]"
                      placeholder="e.g. Wedding, Haldi"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="admin-label mb-0 text-[11px]">Design Style</label>
                    <input
                      type="text"
                      value={newItem.style}
                      onChange={(e) => setNewItem({ ...newItem, style: e.target.value })}
                      className="admin-input text-[12.5px]"
                      placeholder="e.g. Temple Heritage"
                    />
                  </div>
                </div>

                {/* Single Clean Description */}
                <div className="space-y-1 pt-1">
                  <label className="admin-label mb-0 text-[11px]">Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    className="admin-textarea text-[12px]"
                    rows={3}
                    placeholder="Enter showcase description or decor details..."
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5 pt-1.5 border-t border-[var(--admin-border-subtle)]">
                  <label className="admin-label mb-0 text-[11px]">Tags</label>

                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-[6px] border border-[var(--admin-border)] bg-[var(--admin-surface)] focus-within:border-[var(--admin-accent)] min-h-[36px]">
                    {currentTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] px-2 py-0.5 rounded-[4px] border border-[var(--admin-border)]"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-[var(--admin-text-tertiary)] hover:text-rose-600 cursor-pointer text-[12px] font-bold leading-none ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      onBlur={() => tagInput.trim() && handleAddTag(tagInput)}
                      placeholder={
                        currentTags.length === 0 ? 'Type tag & press Enter...' : 'Add tag...'
                      }
                      className="flex-1 min-w-[100px] bg-transparent border-0 outline-none text-[12px] p-0.5 text-[var(--admin-text-primary)]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {POPULAR_TAG_SUGGESTIONS.filter((t) => !currentTags.includes(t))
                      .slice(0, 6)
                      .map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleAddTag(sug)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--admin-surface-muted)] hover:bg-[var(--admin-accent)]/10 text-[var(--admin-text-secondary)] hover:text-[var(--admin-accent)] transition-colors cursor-pointer border border-dashed border-[var(--admin-border)]"
                        >
                          +{sug}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PRODUCTS */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <CmsProductPicker
                  products={products || []}
                  selectedIds={newItem.linkedProducts || []}
                  onChange={(newIds) => setNewItem((prev) => ({ ...prev, linkedProducts: newIds }))}
                  title="Link Products"
                />
              </div>
            )}

            {/* STEP 3: REVIEW & PUBLISH */}
            {currentStep === 3 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Summary Checklist */}
                <div className="lg:col-span-6 space-y-3.5">
                  <div className="admin-card p-4 sm:p-5 space-y-3 rounded-[8px]">
                    <h3 className="font-bold text-[13.5px] text-[var(--admin-text-primary)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[17px] text-[var(--admin-accent)]">
                        checklist
                      </span>
                      Showcase Summary
                    </h3>

                    <div className="space-y-2 text-[12px]">
                      <div className="flex items-center justify-between p-2 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]">
                        <span className="text-[var(--admin-text-secondary)] font-medium">
                          Cover Photo
                        </span>
                        {newItem.image ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              check_circle
                            </span>
                            Ready
                          </span>
                        ) : (
                          <span className="text-rose-500 font-bold">Missing</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]">
                        <span className="text-[var(--admin-text-secondary)] font-medium">
                          Video Reel
                        </span>
                        {newItem.video ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              check_circle
                            </span>
                            Attached
                          </span>
                        ) : (
                          <span className="text-[var(--admin-text-tertiary)]">None</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]">
                        <span className="text-[var(--admin-text-secondary)] font-medium">
                          Title
                        </span>
                        <span className="font-bold text-[var(--admin-text-primary)] truncate max-w-[200px]">
                          {newItem.title || 'Untitled'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]">
                        <span className="text-[var(--admin-text-secondary)] font-medium">
                          Category
                        </span>
                        <span className="font-bold text-[var(--admin-text-primary)]">
                          {newItem.category || 'None'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)]">
                        <span className="text-[var(--admin-text-secondary)] font-medium">
                          Tagged Products
                        </span>
                        <span className="font-bold text-[var(--admin-text-primary)]">
                          {newItem.linkedProducts?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="lg:col-span-6">
                  <GalleryItemLivePreview item={newItem} products={products} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── STICKY FOOTER CONTROLS ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--admin-surface)]/95 backdrop-blur-md border-t border-[var(--admin-border)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-2.5 pb-[max(12px,env(safe-area-inset-bottom))] lg:static lg:bg-transparent lg:border-t lg:border-[var(--admin-border-subtle)] lg:shadow-none lg:p-0 lg:mt-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div>
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="h-9 px-4 sm:px-5 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-[6px] text-[12px] font-bold cursor-pointer transition-all active:scale-95 shadow-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/admin/gallery')}
                className="h-9 px-4 sm:px-5 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] rounded-[6px] text-[12px] font-bold cursor-pointer transition-all active:scale-95 shadow-xs"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                className="h-9 sm:h-10 px-5 sm:px-7 bg-[var(--admin-accent)] hover:brightness-105 text-white rounded-[6px] text-[12.5px] font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
              >
                <span>Continue</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="h-9 sm:h-10 px-6 sm:px-8 bg-[var(--admin-accent)] hover:brightness-105 text-white rounded-[6px] text-[12.5px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
                      {isEditing ? 'check_circle' : 'publish'}
                    </span>
                    <span>{isEditing ? 'Save Changes' : 'Publish Showcase'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── AI MODAL ─── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--admin-surface)] rounded-[8px] max-w-md w-full p-4 border border-[var(--admin-border)] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-[var(--admin-accent)]/15 text-[var(--admin-accent)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                </span>
                <h3 className="font-bold text-[13.5px] text-[var(--admin-text-primary)]">
                  AI Decor Assistant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)] text-[18px] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <textarea
              value={aiPromptTitle}
              onChange={(e) => setAiPromptTitle(e.target.value)}
              placeholder="e.g. Royal Telugu Wedding Mandap with Fresh Jasmine..."
              rows={3}
              className="w-full bg-[var(--admin-surface)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] rounded-[6px] p-2.5 text-[12px] text-[var(--admin-text-primary)] outline-none resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-3 py-1.5 rounded-[4px] text-[11px] font-bold text-[var(--admin-text-secondary)] hover:bg-[var(--admin-surface-muted)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAiAutofill}
                disabled={!aiPromptTitle.trim()}
                className="px-4 py-1.5 rounded-[4px] bg-[var(--admin-accent)] hover:brightness-105 text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-xs"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DRAFT RESTORE & UNSAVED CHANGES ─── */}
      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Gallery"
        lastSavedAt={lastSavedAt}
      />

      <UnsavedChangesGuard blocker={blocker} />
    </div>
  );
}
