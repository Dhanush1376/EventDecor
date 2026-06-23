import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { SkeletonForm } from '../components/AdminUIKit';
import { ProductCard } from '../../components/shared/ProductCard';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

// Extracted Wizard Steps
import { MediaStep } from '../components/showcase-wizard/MediaStep';
import { DetailsStep } from '../components/showcase-wizard/DetailsStep';
import { AestheticsStep } from '../components/showcase-wizard/AestheticsStep';
import { DescriptionStep } from '../components/showcase-wizard/DescriptionStep';
import { SeoStep } from '../components/showcase-wizard/SeoStep';
import { ReviewStep } from '../components/showcase-wizard/ReviewStep';
import { AIVisionHUD } from '../components/showcase-wizard/AIVisionHUD';

// Custom Hooks
import { useShowcaseForm, WIZARD_STEPS } from '../hooks/useShowcaseForm';
import { useShowcaseAI } from '../hooks/useShowcaseAI';
import { useShowcaseSubmission } from '../hooks/useShowcaseSubmission';

const slideIn = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export function AdminAddShowcase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  // 1. Form & Draft Orchestration
  const {
    formData,
    setFormData,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
    currentStep,
    setCurrentStep,
    mobileTab,
    setMobileTab,
    isLoading,
    categories,
    setCategories,
    isStepValid,
    handleNext,
    handlePrev,
  } = useShowcaseForm({ id, isEditMode, navigate });

  // 2. AI Vision Logic
  const {
    aiAnalysisResult,
    showAIHUD,
    setShowAIHUD,
    aiChatInput,
    setAiChatInput,
    isAILearning,
    focusedField,
    handleAiAutofill,
    handleAiChatSubmit,
    handleApplyAISpecs,
  } = useShowcaseAI({ formData, setFormData, setCategories, setCurrentStep });

  // 3. Submission Logic
  const { isSaving, handleSubmit } = useShowcaseSubmission({
    isEditMode,
    id,
    formData,
    deleteDraft,
    navigate,
  });

  // Local Component State (Media compression only)
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionStats, setCompressionStats] = useState([]);

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
  }, [currentStep, formData, handleNext, handlePrev]);

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
                {currentStep === 0 && (
                  <MediaStep
                    formData={formData}
                    setFormData={setFormData}
                    setIsCompressing={setIsCompressing}
                    setCompressionProgress={setCompressionProgress}
                    setCompressionStats={setCompressionStats}
                  />
                )}
                {currentStep === 1 && (
                  <DetailsStep
                    formData={formData}
                    setFormData={setFormData}
                    focusedField={focusedField}
                    categories={categories}
                    handleAiAutofill={handleAiAutofill}
                  />
                )}
                {currentStep === 2 && (
                  <AestheticsStep
                    formData={formData}
                    setFormData={setFormData}
                    focusedField={focusedField}
                  />
                )}
                {currentStep === 3 && (
                  <DescriptionStep
                    formData={formData}
                    setFormData={setFormData}
                    focusedField={focusedField}
                  />
                )}
                {currentStep === 4 && (
                  <SeoStep
                    formData={formData}
                    setFormData={setFormData}
                    focusedField={focusedField}
                  />
                )}
                {currentStep === 5 && (
                  <ReviewStep formData={formData} setFormData={setFormData} colors={colors} />
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

          {/* Luxury Card Rendering using real ProductCard */}
          <div className="w-full max-w-[340px] mx-auto bg-white rounded-2xl shadow-[var(--admin-shadow-sm)] border border-[var(--admin-border)]/60 p-2">
            <ProductCard
              title={formData.title || 'Traditional Sanskriti Masterpiece'}
              rentalPrice={Number(formData.rentalPrice || 0)}
              imageSrc={formData.image}
              category={formData.category?.replace('_', ' ') || 'Category Unassigned'}
              setupTimeHours={Number(formData.setupTimeHours || 2)}
              inclusions={
                formData.inclusionsText
                  ? formData.inclusionsText
                      .split(',')
                      .map((i) => i.trim())
                      .filter(Boolean)
                  : []
              }
              itemType="event"
              rating={4.9}
              onQuickView={(e) => e.preventDefault()}
            />
          </div>
        </div>
      </div>

      <AIVisionHUD
        showAIHUD={showAIHUD}
        setShowAIHUD={setShowAIHUD}
        aiAnalysisResult={aiAnalysisResult}
        aiChatInput={aiChatInput}
        setAiChatInput={setAiChatInput}
        handleAiChatSubmit={handleAiChatSubmit}
        isAILearning={isAILearning}
        handleApplyAISpecs={handleApplyAISpecs}
      />

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

export default AdminAddShowcase;
