import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SkeletonForm } from '../components/AdminUIKit';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useNavigate, useParams } from 'react-router-dom';
import { showcaseService, uploadService, cmsService } from '../../services/domainServices';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { compressImage, formatBytes } from '../../utils/imageCompressor';
import { useDraft } from '../hooks/useDraft';
import logger from '../../utils/logger';

const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
const slideIn = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const WIZARD_STEPS = [
  { id: 'media', label: 'Media & Imagery', icon: 'photo_library' },
  { id: 'details', label: 'Basic Info', icon: 'info' },
  { id: 'aesthetics', label: 'Aesthetics & Props', icon: 'tune' },
  { id: 'description', label: 'Narrative', icon: 'edit_note' },
  { id: 'seo', label: 'SEO Configuration', icon: 'search' },
  { id: 'review', label: 'Review & Publish', icon: 'verified' },
];

export function AdminAddShowcase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [currentStep, setCurrentStep] = useState(0);
  const [mobileTab, setMobileTab] = useState('form');
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [categories, setCategories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastDraftSaved, setLastDraftSaved] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionStats, setCompressionStats] = useState([]);

  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [showAIHUD, setShowAIHUD] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAILearning, setIsAILearning] = useState(false);
  const [isApplyingFields, setIsApplyingFields] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const {
    formData,
    setFormData,
    pageState,
    setPageState,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: isEditMode ? `admin:showcases:edit:${id}` : 'admin:showcases:add',
    module: 'Showcases',
    pageTitle: isEditMode ? `Edit Showcase ${id}` : 'New Showcase',
    initialData: {
      title: '',
      subtitle: '',
      category: 'engagement_gift',
      rentalPrice: 15000,
      description: '',
      image: '',
      galleryImages: ['', ''],
      inclusionsText:
        'Traditional carved wooden ring tray, Beaded shagun boxes, Mogra garland drops',
      colorPalette: '#8B0000, #FFD700, #FFF8DC',
      suggestedProps: 'Traditional carved wooden ring tray, Beaded shagun boxes',
      setupTimeHours: 2,
      seoTitle: '',
      seoDescription: '',
      isActive: true,
    },
    initialPageState: { activeStep: 0, mobileTab: 'form' },
    enabled: true,
  });

  // Sync state
  useEffect(() => {
    if (pageState.activeStep !== undefined) setCurrentStep(pageState.activeStep);
    if (pageState.mobileTab !== undefined) setMobileTab(pageState.mobileTab);
  }, [pageState]);

  useEffect(() => {
    if (isEditMode) {
      const fetchShowcase = async () => {
        try {
          const res = await showcaseService.getById(id);
          if (res.success && res.data) {
            const sc = res.data;
            setFormData({
              title: sc.title || '',
              subtitle: sc.subtitle || '',
              category: sc.category || 'engagement_gift',
              rentalPrice: sc.rentalPrice || 15000,
              description: sc.description || '',
              image: sc.image || '',
              galleryImages:
                sc.gallery && sc.gallery.length > 0
                  ? [...sc.gallery, '', ''].slice(0, 2)
                  : ['', ''],
              inclusionsText: sc.inclusions ? sc.inclusions.map((i) => i.name).join(', ') : '',
              colorPalette: sc.colorPalette ? sc.colorPalette.join(', ') : '',
              suggestedProps: sc.suggestedProps ? sc.suggestedProps.join(', ') : '',
              setupTimeHours: sc.setupTimeHours || 2,
              seoTitle: sc.seoTitle || '',
              seoDescription: sc.seoDescription || '',
              isActive: sc.isActive !== undefined ? sc.isActive : true,
            });
          } else {
            toast.error('Showcase design not found');
            navigate('/admin/events');
          }
        } catch (err) {
          toast.error('Failed to load design details');
          navigate('/admin/events');
        } finally {
          setIsLoading(false);
        }
      };
      fetchShowcase();
    }
  }, [id, isEditMode, navigate]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories/active?type=event');
        if (res.data && res.data.success) {
          setCategories(res.data.data);
        }
      } catch (err) {
        logger.error('Failed to fetch categories', err);
      }
    };
    fetchCategories();
  }, []);

  const handleAiAutofill = async () => {
    if (!formData.image) {
      toast.error('Please upload or paste an image URL first for AI Vision analysis!');
      return;
    }
    const loadId = toast.loading(
      '✨ AI Vision models analyzing floral accents & prop structures...',
    );
    try {
      const res = await cmsService.analyzeShowcaseImage(formData.image);
      if (res.success) {
        if (res.data.category && res.data.category.isNew) {
          const newCat = {
            ...res.data.category,
            _id: res.data.category.id || res.data.category._id,
          };
          setCategories((prev) => [...prev, newCat]);
        }
        setAiAnalysisResult({
          ...res.data.payload,
          categoryId: res.data.category ? res.data.category.id || res.data.category._id : null,
        });
        setShowAIHUD(true);
        toast.success('✨ AI Vision extracted details successfully');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to analyze image with AI');
    } finally {
      toast.dismiss(loadId);
    }
  };

  const handleAiChatSubmit = async (e) => {
    e.preventDefault();
    if (!aiChatInput.trim() || !aiAnalysisResult) return;
    setIsAILearning(true);
    try {
      const result = await cmsService.refineAiShowcase(aiAnalysisResult, aiChatInput);
      if (result.success) {
        if (result.data.category && result.data.category.isNew) {
          const newCat = {
            ...result.data.category,
            _id: result.data.category.id || result.data.category._id,
          };
          setCategories((prev) => [...prev, newCat]);
        }
        setAiAnalysisResult({
          ...result.data.payload,
          categoryId: result.data.category
            ? result.data.category.id || result.data.category._id
            : null,
        });
        setAiChatInput('');
        toast.success('AI updated the curation successfully!');
      }
    } catch (err) {
      toast.error('AI refinement failed.');
      logger.error('AI refinement error: ', err);
    } finally {
      setIsAILearning(false);
    }
  };

  const handleApplyAISpecs = () => {
    if (!aiAnalysisResult) return;

    setIsApplyingFields(true);
    setShowAIHUD(false);

    const fieldsToFill = [
      { key: 'title', value: aiAnalysisResult.title },
      { key: 'subtitle', value: aiAnalysisResult.subtitle },
      { key: 'category', value: aiAnalysisResult.categoryId || aiAnalysisResult.category },
      { key: 'description', value: aiAnalysisResult.description },
      { key: 'inclusionsText', value: aiAnalysisResult.inclusionsText },
      { key: 'colorPalette', value: aiAnalysisResult.colorPalette },
      { key: 'suggestedProps', value: aiAnalysisResult.suggestedProps },
      {
        key: 'setupTimeHours',
        value: aiAnalysisResult.setupTimeHours ? String(aiAnalysisResult.setupTimeHours) : '',
      },
      { key: 'seoTitle', value: aiAnalysisResult.seoTitle },
      { key: 'seoDescription', value: aiAnalysisResult.seoDescription },
    ];

    let index = 0;
    setCurrentStep(1); // Jump to details

    const interval = setInterval(() => {
      if (index >= fieldsToFill.length) {
        clearInterval(interval);
        setIsApplyingFields(false);
        setFocusedField('');
        return;
      }

      const field = fieldsToFill[index];
      setFocusedField(field.key);

      setFormData((prev) => ({
        ...prev,
        [field.key]: field.value || prev[field.key],
      }));

      // If moving past details step
      if (index === 4 && currentStep < 2) setCurrentStep(2);
      if (index === 8 && currentStep < 4) setCurrentStep(4);

      index++;
    }, 400); // Staggered animation
  };

  const getStepErrors = () => {
    const errors = {};
    if (currentStep === 0) {
      if (!formData.image) errors.image = 'Cover image is required';
    }
    if (currentStep === 1) {
      if (!formData.title.trim()) errors.title = 'Showcase title is required';
    }
    if (currentStep === 2) {
      if (formData.rentalPrice === '' || Number(formData.rentalPrice) <= 0)
        errors.rentalPrice = 'A valid rental price is required';
    }
    if (currentStep === 3) {
      if (!formData.description.trim())
        errors.description = 'Atmospheric narrative description is required';
    }
    return errors;
  };

  const isStepValid = () => {
    return Object.keys(getStepErrors()).length === 0;
  };

  const handleNext = () => {
    const errors = getStepErrors();
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      setPageState((prev) => ({ ...prev, activeStep: currentStep + 1 }));
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setPageState((prev) => ({ ...prev, activeStep: currentStep - 1 }));
    }
  };

  const handleCancelAction = () => {
    navigate('/admin/events');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        toast.success('Draft saved (in-memory)!', { duration: 1500 });
      }
      if (e.key === 'Escape') {
        handleCancelAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, formData]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title || !formData.image) {
      return toast.error('Title and Cover Image are required before publishing!');
    }

    setIsSaving(true);
    try {
      const incList = formData.inclusionsText
        .split(',')
        .map((item) => ({ name: item.trim(), defaultQty: 1, condition: 'excellent' }))
        .filter((i) => i.name.length > 0);

      const payload = {
        title: formData.title,
        subtitle: formData.subtitle || undefined,
        category: formData.category,
        rentalPrice: Number(formData.rentalPrice) || 12000,
        description: formData.description,
        image: formData.image,
        gallery: formData.galleryImages.filter(Boolean),
        inclusions: incList,
        colorPalette: formData.colorPalette
          ? formData.colorPalette
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
        suggestedProps: formData.suggestedProps
          ? formData.suggestedProps
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
        setupTimeHours: Number(formData.setupTimeHours) || 2,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        isActive: Boolean(formData.isActive),
      };

      const res = isEditMode
        ? await showcaseService.update(id, payload)
        : await showcaseService.create(payload);

      if (res.success) {
        await deleteDraft(); // Clear draft on success
        toast.success(isEditMode ? 'Design updated!' : 'Design published!');
        navigate('/admin/events');
      }
    } catch (err) {
      const msg =
        err?.response?.status === 401
          ? 'Save failed: Please log in again or refresh the page'
          : 'Failed to save showcase design.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const colors = formData.colorPalette
    ? formData.colorPalette
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.startsWith('#') || c.startsWith('rgb') || c.length > 2)
    : [];

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-6 pb-20 p-6">
        <SkeletonForm fields={6} />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/events')}
            className="w-10 h-10 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] cursor-pointer transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)]">
              {isEditMode ? 'Edit Showcase Collection' : 'Create Traditional Design'}
            </h2>
            <p className="text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]">
              {isEditMode
                ? `Modifying Showcase #${id.substring(id.length - 8).toUpperCase()}`
                : 'Configure side-stage tambulams and occasion decor layouts'}
            </p>
          </div>
        </div>

        {/* Keyboard Shortcut Banner + Auto-save */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex">
            <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-[var(--admin-text-secondary)] font-semibold bg-[var(--admin-surface)] border border-[var(--admin-border)] px-3 py-1.5 rounded-full uppercase tracking-wider">
            <span className="px-1.5 py-0.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded text-[11px] sm:text-[11px]">
              Alt + →
            </span>
            <span>Next</span>
            <span className="text-[#E5E7EB]">|</span>
            <span className="px-1.5 py-0.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded text-[11px] sm:text-[11px]">
              Ctrl+S
            </span>
            <span>Save</span>
            <span className="text-[#E5E7EB]">|</span>
            <span className="px-1.5 py-0.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded text-[11px] sm:text-[11px]">
              Esc
            </span>
            <span>Back</span>
          </div>
        </div>
      </div>

      {/* Guided Progress Bar (Desktop & Mobile Responsive) */}
      <div className="admin-card p-4 border border-[var(--admin-border)]/80 shadow-[var(--admin-shadow-sm)] lg:block hidden overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] px-2">
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (index <= currentStep || isStepValid()) {
                      setCurrentStep(index);
                    } else {
                      toast.error('Please complete previous steps first');
                    }
                  }}
                  className="flex items-center gap-2 group cursor-pointer text-left outline-none"
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[var(--admin-accent)] text-white scale-105 shadow-sm'
                        : isCompleted
                          ? 'bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] border border-[var(--admin-border)]'
                          : 'bg-[var(--admin-bg-subtle)] text-[var(--admin-text-tertiary)] border border-[var(--admin-border-subtle)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {isCompleted ? 'check' : step.icon}
                    </span>
                  </div>
                  <div>
                    <p
                      className={`text-[11px] sm:text-[11px] font-bold uppercase tracking-wider ${
                        isActive
                          ? 'text-[var(--admin-text-primary)]'
                          : 'text-[var(--admin-text-tertiary)]'
                      }`}
                    >
                      Step {index + 1}
                    </p>
                    <p
                      className={`text-[11px] sm:text-[11px] font-bold ${
                        isActive
                          ? 'text-[var(--admin-text-primary)]'
                          : 'text-[var(--admin-text-secondary)]'
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </button>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-4 rounded-full ${
                      isCompleted ? 'bg-black' : 'bg-[var(--admin-surface-muted)]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Guided Progress Bar (Mobile) */}
      <div className="lg:hidden admin-card p-4 border border-[var(--admin-border)]/80 shadow-[var(--admin-shadow-sm)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--admin-accent)] text-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[18px]">
              {WIZARD_STEPS[currentStep].icon}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-[var(--admin-text-tertiary)] uppercase tracking-widest block">
              Step {currentStep + 1} of {WIZARD_STEPS.length}
            </span>
            <h4 className="text-[13px] font-bold text-[var(--admin-text-primary)]">
              {WIZARD_STEPS[currentStep].label}
            </h4>
          </div>
        </div>
        <div className="w-24 bg-[var(--admin-surface-muted)] h-1.5 rounded-full overflow-hidden border border-[var(--admin-border)]/40">
          <div
            className="bg-black h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Mobile Form/Preview Tab Switcher */}
      <div className="flex lg:hidden bg-[var(--admin-surface-muted)] p-1 rounded-xl border border-[var(--admin-border)]/60 w-full">
        <button
          type="button"
          onClick={() => {
            setMobileTab('form');
            setPageState((prev) => ({ ...prev, mobileTab: 'form' }));
          }}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
            mobileTab === 'form'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm border border-[var(--admin-border)]/40'
              : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          Edit Showcase
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileTab('preview');
            setPageState((prev) => ({ ...prev, mobileTab: 'preview' }));
          }}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
            mobileTab === 'preview'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm border border-[var(--admin-border)]/40'
              : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          Live Preview
        </button>
      </div>

      {/* Main Grid: Form wizard on left, real-time preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Form Wizard Frame */}
        <div
          className={`admin-card p-4 sm:p-6 shadow-sm min-h-[480px] flex-col justify-between relative overflow-hidden ${mobileTab === 'form' ? 'flex' : 'hidden lg:flex'}`}
        >
          {/* Compression / Upload Overlay */}
          <AnimatePresence>
            {isCompressing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/95 backdrop-blur-md z-30 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="skeleton-box inline-block w-16 h-16 rounded-md mb-4" />
                <h3 className="text-[14px] font-bold text-[var(--admin-text-primary)]">
                  {compressionProgress === 100 ? 'Finalizing...' : 'Optimizing & Uploading...'}
                </h3>
                <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1 max-w-[280px]">
                  Compressing imagery for lightning-fast showcase delivery.
                </p>

                {compressionStats.length > 0 && (
                  <div className="w-full max-w-sm mt-6 text-left space-y-2 bg-[var(--admin-surface)] p-3 rounded-xl border border-[var(--admin-border)] shadow-sm">
                    {compressionStats.map((stat, i) => (
                      <div
                        key={i}
                        className="flex flex-col gap-1 text-[10px] font-mono text-[var(--admin-text-secondary)]"
                      >
                        <div className="font-bold text-[var(--admin-text-primary)] truncate">
                          {stat.name}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>
                            {stat.originalSize} ➔ {stat.optimizedSize}
                          </span>
                          <span className="text-[var(--admin-success)] font-bold">
                            -{stat.reduction}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="w-full max-w-sm flex items-center justify-between text-[10px] font-bold mt-6 mb-1 text-[var(--admin-text-primary)]">
                  <span>Upload Progress</span>
                  <span>{compressionProgress}%</span>
                </div>
                <div className="w-full max-w-sm bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--admin-accent)] h-full transition-all duration-300"
                    style={{ width: `${compressionProgress}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Step Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial="hidden"
                animate="show"
                exit="exit"
                variants={slideIn}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* STEP 1: MEDIA */}
                {currentStep === 0 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                        Product Media
                      </h2>
                      <p className="text-[11px] text-[var(--admin-text-secondary)]">
                        Upload images or paste URLs. The first image acts as the primary cover.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* URL Paste Box */}
                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-widest">
                          Paste Image URLs
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            id="directUrlInput"
                            placeholder="Image URL"
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            className="flex-1 min-w-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[11px] outline-none focus:border-[var(--admin-accent)]/40"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.image) {
                                toast.success('URL added successfully!');
                              }
                            }}
                            className="shrink-0 bg-[var(--admin-accent)] text-white hover:brightness-110 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                          >
                            Add URL
                          </button>
                        </div>
                      </div>

                      {/* Multi Upload Box */}
                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-widest flex justify-between items-center">
                          <span>Upload Files</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const rawFiles = Array.from(e.target.files);
                            if (rawFiles.length === 0) return;
                            setIsCompressing(true);
                            setCompressionProgress(0);
                            setCompressionStats([]);
                            try {
                              const uploadData = new FormData();
                              const newStats = [];

                              for (let i = 0; i < rawFiles.length; i++) {
                                const file = rawFiles[i];
                                const optimizedFile = await compressImage(file);
                                uploadData.append('images', optimizedFile);

                                newStats.push({
                                  name: file.name,
                                  originalSize: formatBytes(file.size),
                                  optimizedSize: formatBytes(optimizedFile.size),
                                  reduction:
                                    file.size > 0
                                      ? ((1 - optimizedFile.size / file.size) * 100).toFixed(1)
                                      : 0,
                                });
                              }
                              setCompressionStats(newStats);

                              const onProgress = (filename, percent) => {
                                setCompressionProgress(percent);
                              };

                              const res = await uploadService.uploadImages(
                                uploadData,
                                'events',
                                onProgress,
                              );
                              if (res.success && res.images && res.images.length > 0) {
                                setFormData((prev) => ({ ...prev, image: res.images[0] }));
                                toast.success(`Showcase image uploaded successfully!`);
                              }
                            } catch (err) {
                              let msg =
                                err?.response?.status === 401
                                  ? 'Upload failed: Please log in again or refresh the page'
                                  : err?.response?.data?.message ||
                                    err?.message ||
                                    'Upload failed. Please try again.';

                              if (err?.message === 'Network Error') {
                                msg = `Network Error! URL: ${err?.config?.url || 'unknown'}. Check if CORS or AdBlocker is blocking it.`;
                              }
                              toast.error(msg);
                            } finally {
                              setTimeout(() => {
                                setIsCompressing(false);
                                setCompressionProgress(0);
                                setCompressionStats([]);
                              }, 1500);
                            }
                          }}
                          className="w-full text-[11px] text-[var(--admin-text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:bg-[var(--admin-accent)] file:text-white hover:file:bg-[var(--admin-accent-hover)] cursor-pointer shadow-sm border border-[var(--admin-border)] rounded-xl p-2 bg-[var(--admin-surface)] focus:border-[var(--admin-accent)] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: CORE DETAILS */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                          Showcase Specifications
                        </h2>
                        <p className="text-[11px] text-[var(--admin-text-secondary)]">
                          Give your arrangement a title, short subtitle, and catalog category.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAiAutofill}
                        className="bg-[var(--admin-accent)] text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110 transition-all active:scale-95 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        Auto-Fill with AI
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Showcase Title <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Lotus Gifting Crate"
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
                            focusedField === 'title'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                          }`}
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Subtitle / Occasion Context
                        </label>
                        <input
                          type="text"
                          value={formData.subtitle}
                          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                          placeholder="e.g. Carved coconuts with jasmine garlands"
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
                            focusedField === 'subtitle'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                          }`}
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Theme Category <span className="text-error">*</span>
                        </label>
                        <select
                          required
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
                            focusedField === 'category'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                          }`}
                        >
                          <option value="">Select a Category</option>
                          {categories.map((cat) => (
                            <option key={cat.slug || cat.id} value={cat.slug || cat.name}>
                              {cat.name}
                            </option>
                          ))}
                          {categories.length === 0 && (
                            <>
                              <option value="engagement_gift">Engagement Gifts</option>
                              <option value="telugu_heritage">Telugu Heritage</option>
                              <option value="wedding_rituals">Wedding Rituals</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: AESTHETICS & COMMERCIALS */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                        Commercials & Aesthetics
                      </h2>
                      <p className="text-[11px] text-[var(--admin-text-secondary)]">
                        Define rental rates, colors, setup time, and prop lists.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Rental Price (₹) <span className="text-error">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
                            ₹
                          </span>
                          <input
                            type="number"
                            required
                            min="1"
                            inputMode="decimal"
                            value={formData.rentalPrice}
                            onChange={(e) =>
                              setFormData({ ...formData, rentalPrice: Number(e.target.value) })
                            }
                            className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2.5 text-[12.5px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40"
                          />
                        </div>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Estimated Setup (Hours)
                        </label>
                        <input
                          type="number"
                          value={formData.setupTimeHours}
                          onChange={(e) =>
                            setFormData({ ...formData, setupTimeHours: Number(e.target.value) })
                          }
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
                            focusedField === 'setupTimeHours'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                          }`}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Color Palette (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={formData.colorPalette}
                          onChange={(e) =>
                            setFormData({ ...formData, colorPalette: e.target.value })
                          }
                          placeholder="#8B0000, #FFD700"
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] font-mono outline-none transition-all ${
                            focusedField === 'colorPalette'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                          }`}
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Inclusions (comma-separated)
                        </label>
                        <textarea
                          rows={3}
                          value={formData.inclusionsText}
                          onChange={(e) =>
                            setFormData({ ...formData, inclusionsText: e.target.value })
                          }
                          placeholder="Lotus brass urli, Jasmine rope runners..."
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all resize-none ${
                            focusedField === 'inclusionsText'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                          }`}
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Suggested Add-on Props
                        </label>
                        <textarea
                          rows={3}
                          value={formData.suggestedProps}
                          onChange={(e) =>
                            setFormData({ ...formData, suggestedProps: e.target.value })
                          }
                          placeholder="Beaded shagun boxes, Mogra garland drops..."
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all resize-none ${
                            focusedField === 'suggestedProps'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: DESCRIPTION */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                        Atmospheric Narrative
                      </h2>
                      <p className="text-[11px] text-[var(--admin-text-secondary)]">
                        Provide clients with rich heritage descriptions, aesthetics, and setup
                        context.
                      </p>
                    </div>

                    <div className="col-span-2">
                      <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                        Arrangement Description <span className="text-error">*</span>
                      </label>
                      <textarea
                        rows={6}
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe the aesthetics, craftsmanship, and occasion contexts..."
                        className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all resize-none ${
                          focusedField === 'description'
                            ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                            : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 5: SEO SETTINGS */}
                {currentStep === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                        SEO Meta Configuration
                      </h2>
                      <p className="text-[11px] text-[var(--admin-text-secondary)]">
                        Configure title and description for search engines.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          SEO Page Title
                        </label>
                        <input
                          type="text"
                          value={formData.seoTitle}
                          onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                          placeholder="e.g. Lotus Gifting Crate | Siri Arts"
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all ${
                            focusedField === 'seoTitle'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          SEO Meta Description
                        </label>
                        <textarea
                          rows={3}
                          value={formData.seoDescription}
                          onChange={(e) =>
                            setFormData({ ...formData, seoDescription: e.target.value })
                          }
                          placeholder="Describe the showcase item in 150-160 characters..."
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all resize-none ${
                            focusedField === 'seoDescription'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] focus:ring-2 focus:ring-[var(--admin-accent)]/20'
                          }`}
                        />
                      </div>

                      {/* Google Search Snippet Live Preview */}
                      <div className="p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl shadow-sm space-y-1.5 text-left font-sans">
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-[11px] text-[#202124]">
                          <span>siriartsandcrafts.com</span>
                          <span className="text-[#5f6368]">
                            {' '}
                            › events › {formData.category || 'showcase'}
                          </span>
                        </div>
                        <h4 className="text-[#1a0dab] text-[18px] hover:underline cursor-pointer leading-tight font-medium font-sans">
                          {formData.seoTitle ||
                            formData.title ||
                            'Buy Luxury Handcrafted Traditional Decor Items Online'}
                        </h4>
                        <p className="text-[#4d5156] text-[12.5px] leading-relaxed font-normal">
                          <span className="text-[#70757a]">17 May 2026 — </span>
                          {formData.seoDescription ||
                            formData.description ||
                            'Discover organic handcrafted Urli bowls, Rosewood Jharokha mirrors, traditional brass artifacts for wedding backdrops at Siri Arts.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 6: REVIEW & PUBLISH */}
                {currentStep === 5 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                        Validation & Curation
                      </h2>
                      <p className="text-[11px] text-[var(--admin-text-secondary)]">
                        Review details and set visibility preferences before publishing.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Visibility Status Toggle */}
                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                            Visibility Status
                          </p>
                          <p className="text-[11px] text-[var(--admin-text-secondary)]">
                            Controls visible storefront availability
                          </p>
                        </div>
                        <select
                          value={formData.isActive ? 'active' : 'draft'}
                          onChange={(e) =>
                            setFormData({ ...formData, isActive: e.target.value === 'active' })
                          }
                          className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl px-3 py-1.5 text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)] cursor-pointer outline-none"
                        >
                          <option value="active">Active (Visible)</option>
                          <option value="draft">Draft (Private)</option>
                        </select>
                      </div>

                      {/* Summary Data Review list */}
                      <div className="col-span-1 sm:col-span-2 p-5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4 text-[12px]">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] border-b border-[var(--admin-border)]/60 pb-1.5 mb-2">
                          Curation Credentials Summary
                        </p>
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              Showcase Title
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              {formData.title || 'Unassigned'}
                            </span>
                          </div>
                          {formData.subtitle && (
                            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                                Subtitle
                              </span>
                              <span className="font-semibold text-[var(--admin-text-primary)] sm:text-right">
                                {formData.subtitle}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              Category
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              {formData.category || 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              Rental Price
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              ₹{Number(formData.rentalPrice || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              Colors
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              {colors.length} mapped
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between pb-1 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              Setup Time
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              {formData.setupTimeHours} Hours
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Controls: Back & Next / Save */}
          <div className="border-t border-[var(--admin-border)]/60 pt-4 mt-6 flex items-center justify-between bg-[var(--admin-surface)]">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-5 py-2.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] text-[var(--admin-text-secondary)] rounded-full text-[12px] font-bold hover:bg-[#E5E7EB]/45 cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
            >
              Back
            </button>

            {currentStep < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-[var(--admin-accent)] text-white rounded-full text-[12px] font-bold hover:brightness-110 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md"
              >
                Continue
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-7 py-3 bg-[var(--admin-accent)] text-white rounded-full text-[12px] font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
                    Saving Design...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-white">
                      done_all
                    </span>
                    {isEditMode ? 'Update Design' : 'Publish to Gallery'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Live Catalog Preview Card */}
        <div
          className={`lg:sticky lg:top-24 space-y-6 w-full ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="text-center lg:text-left">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--admin-text-secondary)]">
              Storefront Preview
            </span>
            <p className="text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]/75 mt-0.5">
              Real-time catalog rendition of your showcase design
            </p>
          </div>

          {/* Luxury Card Rendering */}
          <div className="bg-[var(--admin-surface)] rounded-3xl overflow-hidden border border-[var(--admin-border)]/60 shadow-[var(--admin-shadow-sm)] group relative">
            {/* Badges Overlay */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-[11px] font-bold uppercase tracking-widest bg-[var(--admin-accent)] text-white shadow-sm flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[11px] fill-current">star</span>
                Showcase
              </span>
            </div>

            {/* Card Thumbnail */}
            <div className="aspect-[4/3] bg-[var(--admin-bg-subtle)] relative overflow-hidden">
              {formData.image ? (
                <img
                  src={formData.image}
                  alt={formData.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--admin-text-secondary)]/40">
                  <span className="material-symbols-outlined text-[36px] mb-2">add_a_photo</span>
                  <span className="text-[11px] sm:text-[11px] font-bold uppercase tracking-widest">
                    Image Preview Canvas
                  </span>
                </div>
              )}
            </div>

            {/* Product Body */}
            <div className="p-4 space-y-2">
              <span className="text-[11px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--admin-accent)]">
                {formData.category?.replace('_', ' ') || 'Category Unassigned'}
              </span>

              <div>
                <h3 className="text-[14.5px] font-bold text-[var(--admin-text-primary)] truncate">
                  {formData.title || 'Traditional Sanskriti Masterpiece'}
                </h3>
                {formData.subtitle && (
                  <p className="text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]/90 italic mt-0.5 truncate">
                    {formData.subtitle}
                  </p>
                )}
              </div>

              {colors.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {colors.slice(0, 4).map((c, idx) => (
                    <span
                      key={idx}
                      className="w-4 h-4 rounded-full border border-[var(--admin-border)] shadow-sm shrink-0"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              )}

              {/* Price Tag Row */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border)]/40 mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[16px] font-extrabold text-[var(--admin-text-primary)]">
                    ₹{Number(formData.rentalPrice || 0).toLocaleString()}
                  </span>
                  <span className="text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]/80">
                    / event
                  </span>
                </div>

                <div className="flex items-center gap-0.5 text-[var(--admin-text-secondary)] text-[11px] font-medium">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  {formData.setupTimeHours}h Setup
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Apple-level SaaS AI Curation HUD Overlay Modal */}
      {showAIHUD && aiAnalysisResult && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-md p-4 sm:p-6 animate-fade-in font-sans">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white/90 border border-white/40 shadow-[0_30px_60px_rgba(0,0,0,0.12)] rounded-[32px] overflow-hidden relative backdrop-blur-xl">
            {/* Elegant Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200/50 relative">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[18px] text-[#007AFF]">
                    auto_awesome
                  </span>
                  <h3 className="text-[14px] font-semibold tracking-tight text-gray-900">
                    Groq Vision Analysis
                  </h3>
                </div>
                <p className="text-[12px] font-medium text-gray-500 tracking-tight">
                  Multimodal Showcase Curation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAIHUD(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-8 overflow-y-auto space-y-6">
              {/* Concept & Confidence */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    Detected Concept
                  </p>
                  <h4 className="text-[22px] font-bold tracking-tight text-gray-900 leading-tight">
                    {aiAnalysisResult.title || 'Unidentified Design'}
                  </h4>
                  <p className="text-[14px] font-medium text-gray-500 mt-1">
                    {aiAnalysisResult.subtitle}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="bg-[#E5F2FF] text-[#007AFF] px-4 py-2 rounded-2xl flex items-center gap-1.5 font-bold tracking-tight">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    92% Match
                  </div>
                </div>
              </div>

              {/* Grid Data */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Category Mapped
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-gray-900 font-semibold text-[14px] tracking-tight">
                    <span className="material-symbols-outlined text-[16px] text-[#007AFF]">
                      category
                    </span>
                    {aiAnalysisResult.category || 'Event Decor'}
                  </div>
                </div>

                {/* Setup Time */}
                <div className="p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Setup Time
                  </p>
                  <div className="text-gray-900 font-semibold text-[14px] tracking-tight">
                    {aiAnalysisResult.setupTimeHours || 2} Hours
                  </div>
                </div>

                {/* Inclusions */}
                <div className="col-span-2 p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Key Inclusions
                  </p>
                  <p className="text-[13px] font-medium text-gray-700 leading-relaxed">
                    {aiAnalysisResult.inclusionsText}
                  </p>
                </div>

                {/* Props */}
                <div className="col-span-2 p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Suggested Props
                  </p>
                  <p className="text-[13px] font-medium text-gray-700 leading-relaxed">
                    {aiAnalysisResult.suggestedProps}
                  </p>
                </div>

                {/* Palette */}
                <div className="col-span-2 p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    Color Palette
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(aiAnalysisResult.colorPalette || '').split(',').map((c, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-gray-200 px-3 py-1.5 rounded-full text-[12px] font-semibold text-gray-700 shadow-sm tracking-tight"
                      >
                        {c.trim()}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="col-span-2 p-5 bg-gray-50/50 border border-gray-100 rounded-[20px]">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    Narrative Description
                  </p>
                  <p className="text-[13.5px] text-gray-600 leading-relaxed font-medium">
                    {aiAnalysisResult.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Input Area (Spotlight style) */}
            <div className="px-8 pb-4">
              <form
                onSubmit={handleAiChatSubmit}
                className="flex items-center gap-2 bg-gray-100/80 hover:bg-gray-100 transition-colors rounded-[18px] p-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#007AFF]/30 focus-within:shadow-sm"
              >
                <div className="pl-3">
                  {isAILearning ? (
                    <span className="material-symbols-outlined text-[20px] text-gray-400 animate-spin">
                      refresh
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px] text-gray-400">
                      chat_bubble
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  placeholder="Ask AI to change title, category, props..."
                  className="flex-1 bg-transparent border-none text-[14px] text-gray-900 placeholder-gray-400 font-medium px-2 py-2 focus:outline-none focus:ring-0"
                  disabled={isAILearning}
                />
                <button
                  type="submit"
                  disabled={!aiChatInput.trim() || isAILearning}
                  className="bg-[#007AFF] text-white w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50 cursor-pointer hover:bg-[#0066D6] transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px] translate-x-px">
                    arrow_upward
                  </span>
                </button>
              </form>
            </div>

            {/* Footer Action */}
            <div className="px-8 py-5 border-t border-gray-200/50 flex items-center justify-between bg-gray-50/30">
              <span className="text-[12px] text-gray-500 font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Rental price remains unchanged
              </span>
              <button
                type="button"
                onClick={handleApplyAISpecs}
                className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-full text-[13px] font-semibold tracking-wide flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.15)] transition-all active:scale-95 cursor-pointer"
              >
                Apply AI Curation
              </button>
            </div>
          </div>
        </div>
      )}

      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Showcases"
        lastSavedAt={lastSavedAt}
      />

      <UnsavedChangesGuard blocker={blocker} />
    </div>
  );
}
