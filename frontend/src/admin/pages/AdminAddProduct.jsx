import React, { useState, useEffect, useMemo } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ProductMediaStep } from './steps/ProductMediaStep';
import { ProductInfoStep } from './steps/ProductInfoStep';
import { ProductVariantsStep } from './steps/ProductVariantsStep';
import { ProductSeoStep } from './steps/ProductSeoStep';
import { ProductPricingStep } from './steps/ProductPricingStep';
import { ProductReturnStep } from './steps/ProductReturnStep';
import { ProductReviewStep } from './steps/ProductReviewStep';
import { SkeletonWizard } from '../components/AdminUIKit';
import { LivePreviewCard } from '../components/LivePreviewCard';
import { AiCurationOverlay } from '../components/AiCurationOverlay';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { DraftConflictViewer } from '../components/DraftConflictViewer';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductForm } from '../hooks/useProductForm';
import toast from 'react-hot-toast';

import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import { useAdmin } from '../context/AdminContext';
import { useProductAI } from '../hooks/useProductAI';
import { useProductValidation } from '../hooks/useProductValidation';
import { useProductSubmission } from '../hooks/useProductSubmission';
import { useQueryClient } from '@tanstack/react-query';

const _fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
const slideIn = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const WIZARD_STEPS = [
  { id: 'images', label: 'Media', icon: 'photo_library' },
  { id: 'basics', label: 'Basic Info', icon: 'info' },
  { id: 'variants', label: 'Variants', icon: 'style' },
  { id: 'pricing', label: 'Pricing', icon: 'payments' },
  { id: 'policies', label: 'Policies', icon: 'assignment_return' },
  { id: 'seo', label: 'SEO', icon: 'search' },
  { id: 'review', label: 'Publish', icon: 'publish' },
];

export function AdminAddProduct({ editId }) {
  const { id: routeId } = useParams();
  const queryClient = useQueryClient();
  const id = editId || routeId;
  const navigate = useNavigate();
  const { refreshProducts } = useAdmin();
  const isEditMode = Boolean(id);

  const [mobileTab, setMobileTab] = useState('form');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionStats, setCompressionStats] = useState([]);

  // Form State & Logic
  const {
    isLoading,
    setIsLoading,
    categoriesList,
    setCategoriesList,
    isCustomCategory,
    setIsCustomCategory,
    showRentalSettings,
    setShowRentalSettings,
    currentStep,
    setCurrentStep,
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
  } = useProductForm({ id, isEditMode });
  const [serverData, _setServerData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

  const {
    handleAIFill,
    handleAiChatSubmit,
    handleApplyAISpecs,
    isAIGenerating,
    aiAnalysisResult,
    setAiAnalysisResult,
    showAIHUD,
    setShowAIHUD,
    aiChatInput,
    setAiChatInput,
    isAILearning,
    focusedField,
    aiError,
    globalAiConfig,
  } = useProductAI({ formData, setFormData, categoriesList, setCategoriesList, setCurrentStep });

  const handleCancelAction = () => {
    navigate('/admin/products');
  };

  const handleSuccessAction = () => {
    navigate('/admin/products');
  };

  // Auto-save status tracking (in-memory only)
  const [_lastDraftSaved, setLastDraftSaved] = useState(null);

  // Local Autosave (in-memory only)
  useEffect(() => {
    if (!isEditMode && formData.title) {
      const timeoutId = setTimeout(() => {
        setLastDraftSaved(new Date());
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, isEditMode]);

  const { getStepErrors, isStepValid, handleNext, handlePrev } = useProductValidation({
    currentStep,
    setCurrentStep,
    formData,
    setFormData,
    WIZARD_STEPS,
    showAIHUD,
    handleCancelAction,
    setLastDraftSaved,
  });

  // Image Helper Actions
  const {
    _swapPrimaryImage,
    handleAddVariant,
    handleRemoveVariant,
    handleSubmit,
    newVariant,
    setNewVariant,
  } = useProductSubmission({
    formData,
    setFormData,
    isEditMode,
    id,
    deleteDraft,
    queryClient,
    refreshProducts,
    handleSuccessAction,
    setIsLoading,
  });

  // Category Suggesters
  const _suggestedCategories = useMemo(() => {
    if (!formData.category) return categoriesList;
    return categoriesList.filter((c) => c.toLowerCase().includes(formData.category.toLowerCase()));
  }, [formData.category, categoriesList]);

  if (isLoading && isEditMode && !formData.title) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-5 pb-2 sm:pb-0 px-2 sm:px-4">
        <SkeletonWizard steps={WIZARD_STEPS.length} />
      </div>
    );
  }

  const mainLayout = (
    <div className="flex flex-col gap-4 sm:gap-6 max-w-7xl mx-auto pb-36 lg:pb-8">
      {/* Mobile Merged Header & Progress Card */}
      <div className="lg:hidden bg-[var(--admin-surface)] p-3 rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="w-8 h-8 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] cursor-pointer transition-all active:scale-95 shadow-xs shrink-0"
              title="Back to Products"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-[var(--admin-text-primary)] tracking-tight leading-tight whitespace-nowrap">
                {isEditMode ? 'Edit Product' : 'New Product'}
              </h2>
              <p className="text-[11.5px] text-[var(--admin-text-secondary)] font-medium truncate mt-0.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-[var(--admin-accent)]">
                  {WIZARD_STEPS[currentStep].icon}
                </span>
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {WIZARD_STEPS[currentStep].label}
                </span>
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end justify-center gap-1">
            <span className="text-[10px] font-bold text-[var(--admin-accent)] bg-[var(--admin-surface-muted)] px-2 py-0.5 rounded-[3px] border border-[var(--admin-border)] tracking-wider uppercase">
              Step {currentStep + 1} of {WIZARD_STEPS.length}
            </span>
            <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} compact />
          </div>
        </div>

        {/* Integrated Progress Bar */}
        <div className="w-full bg-[var(--admin-surface-muted)] h-1.5 rounded-[2px] overflow-hidden border border-[var(--admin-border)]">
          <div
            className="bg-[var(--admin-accent)] h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/products')}
            className="w-8 h-8 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] cursor-pointer transition-all active:scale-95 shadow-xs shrink-0"
            title="Back to Products"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight leading-tight">
              {isEditMode ? 'Edit Product' : 'New Product'}
            </h2>
            <p className="text-[11px] sm:text-[12px] text-[var(--admin-text-secondary)] mt-0.5">
              {isEditMode
                ? `Modifying #${id.substring(id.length - 8).toUpperCase()}`
                : 'Add or update product'}
            </p>
          </div>
        </div>

        {/* Keyboard Shortcut Banner + Auto-save */}
        <div className="flex items-center gap-3">
          {globalAiConfig && !globalAiConfig.selectedProviderId && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              AI Offline
            </div>
          )}
          <div className="hidden md:flex">
            <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-[var(--admin-text-secondary)] font-semibold bg-[var(--admin-surface)] border border-[var(--admin-border)] px-2.5 py-1 rounded-[4px] uppercase tracking-wider">
            <span className="px-1.5 py-0.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[3px] text-[11px]">
              Alt + →
            </span>
            <span>Next</span>
            <span className="text-[var(--admin-border)]">|</span>
            <span className="px-1.5 py-0.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[3px] text-[11px]">
              Ctrl+S
            </span>
            <span>Save</span>
            <span className="text-[var(--admin-border)]">|</span>
            <span className="px-1.5 py-0.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-[3px] text-[11px]">
              Esc
            </span>
            <span>Back</span>
          </div>
        </div>
      </div>

      {/* Guided Progress Bar (Desktop & Mobile Responsive) */}
      <div className="bg-[var(--admin-surface)] p-3 sm:p-4 rounded-[4px] border border-[var(--admin-border)] shadow-xs lg:block hidden overflow-x-auto">
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
                  className="flex items-center gap-2.5 group cursor-pointer text-left outline-none"
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-[4px] flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[var(--admin-accent)] text-white shadow-xs font-bold'
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
                      className={`text-[10.5px] font-bold uppercase tracking-wider ${
                        isActive
                          ? 'text-[var(--admin-accent)]'
                          : 'text-[var(--admin-text-tertiary)]'
                      }`}
                    >
                      Step {index + 1}
                    </p>
                    <p
                      className={`text-[12px] font-bold ${
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
                    className={`flex-1 h-[2px] mx-3 ${
                      isCompleted ? 'bg-[var(--admin-accent)]' : 'bg-[var(--admin-border-subtle)]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile Form/Preview Tab Switcher */}
      <div className="flex items-center gap-1 lg:hidden bg-[var(--admin-surface-muted)] p-1 rounded-[4px] border border-[var(--admin-border)] h-[42px] min-h-[42px] max-h-[42px] box-border w-full">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 h-[32px] min-h-[32px] max-h-[32px] rounded-[3px] text-[11px] font-bold uppercase tracking-wider flex items-center justify-center transition-all box-border ${
            mobileTab === 'form'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-xs border border-[var(--admin-border)]'
              : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-transparent'
          }`}
        >
          Edit Product
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 h-[32px] min-h-[32px] max-h-[32px] rounded-[3px] text-[11px] font-bold uppercase tracking-wider flex items-center justify-center transition-all box-border ${
            mobileTab === 'preview'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-xs border border-[var(--admin-border)]'
              : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] border border-transparent'
          }`}
        >
          Live Preview
        </button>
      </div>

      {/* Main Grid: Form wizard on left, real-time preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        {/* Form Wizard Frame */}
        <div
          className={`bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs p-4 sm:p-6 min-h-0 lg:min-h-[480px] flex-col justify-between relative overflow-hidden ${mobileTab === 'form' ? 'flex' : 'hidden lg:flex'}`}
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
                  Compressing imagery for lightning-fast storefront delivery.
                </p>

                {compressionStats.length > 0 && (
                  <div className="w-full max-w-sm mt-6 text-left space-y-2 bg-[var(--admin-surface)] p-3 rounded-[4px] border border-[var(--admin-border)] shadow-xs">
                    {compressionStats.map((stat, i) => (
                      <div
                        key={i}
                        className="flex flex-col gap-1 text-[10px] font-mono text-[var(--admin-text-secondary)]"
                      >
                        <div className="font-bold text-[var(--admin-text-primary)] truncate">
                          {stat.name}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-black font-semibold ml-1">
                            {stat.originalSize}{' '}
                            <ArrowRight className="w-3 h-3 inline-block mx-1 text-black/40" />{' '}
                            {stat.optimizedSize}
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
                <div className="w-full max-w-sm bg-[#E5E7EB] h-1.5 rounded-[2px] overflow-hidden">
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
                {/* STEP 0: IMAGES */}
                {currentStep === 0 && (
                  <ProductMediaStep
                    formData={formData}
                    setFormData={setFormData}
                    isCompressing={isCompressing}
                    setIsCompressing={setIsCompressing}
                    compressionProgress={compressionProgress}
                    setCompressionProgress={setCompressionProgress}
                    compressionStats={compressionStats}
                    setCompressionStats={setCompressionStats}
                  />
                )}

                {/* STEP 1: BASICS */}
                {currentStep === 1 && (
                  <ProductInfoStep
                    formData={formData}
                    setFormData={setFormData}
                    categoriesList={categoriesList}
                    isAIGenerating={isAIGenerating}
                    isCustomCategory={isCustomCategory}
                    setIsCustomCategory={setIsCustomCategory}
                    focusedField={focusedField}
                    handleAIFill={handleAIFill}
                    aiError={aiError}
                  />
                )}

                {/* STEP 2: VARIANTS */}
                {currentStep === 2 && (
                  <ProductVariantsStep
                    formData={formData}
                    setFormData={setFormData}
                    isAIGenerating={isAIGenerating}
                    handleAIFill={handleAIFill}
                    focusedField={focusedField}
                    newVariant={newVariant}
                    setNewVariant={setNewVariant}
                    handleAddVariant={handleAddVariant}
                    handleRemoveVariant={handleRemoveVariant}
                  />
                )}

                {/* STEP 3: PRICING & INVENTORY */}
                {currentStep === 3 && (
                  <ProductPricingStep
                    formData={formData}
                    setFormData={setFormData}
                    showRentalSettings={showRentalSettings}
                    setShowRentalSettings={setShowRentalSettings}
                    focusedField={focusedField}
                    handleAIFill={handleAIFill}
                    isAIGenerating={isAIGenerating}
                  />
                )}

                {/* STEP 4: RETURN POLICIES */}
                {currentStep === 4 && (
                  <ProductReturnStep formData={formData} setFormData={setFormData} />
                )}

                {/* STEP 5: SEO */}
                {currentStep === 5 && (
                  <ProductSeoStep
                    formData={formData}
                    setFormData={setFormData}
                    focusedField={focusedField}
                    handleAIFill={handleAIFill}
                    isAIGenerating={isAIGenerating}
                  />
                )}

                {/* STEP 6: REVIEW */}
                {currentStep === 6 && (
                  <ProductReviewStep formData={formData} setFormData={setFormData} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Controls: Back & Next / Save - Sticky above bottom nav on mobile */}
          <div className="admin-wizard-sticky-footer">
            <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0 || isCompressing || isLoading}
                className="h-9 sm:h-[38px] px-3.5 sm:px-4 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-[4px] text-[12px] sm:text-[12.5px] font-bold cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 shadow-xs"
              >
                Back
              </button>

              {currentStep < WIZARD_STEPS.length - 1 ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, { stayOnPage: true })}
                    disabled={isLoading || isCompressing}
                    className="h-9 sm:h-[38px] px-3 sm:px-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-[4px] text-[12px] sm:text-[12.5px] font-bold hover:bg-[var(--admin-surface-muted)] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-xs"
                  >
                    {isLoading ? (
                      <>
                        <div className="skeleton-box inline-block w-4 h-4 rounded-[2px]" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">
                          {isEditMode ? 'save' : 'publish'}
                        </span>
                        <span>{isEditMode ? 'Update Draft' : 'Save Draft'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isCompressing || isLoading}
                    className="h-9 sm:h-[38px] px-3.5 sm:px-5 bg-[var(--admin-accent)] hover:opacity-95 text-white rounded-[4px] text-[12px] sm:text-[12.5px] font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span>Continue</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, { stayOnPage: false })}
                  disabled={isLoading || isCompressing}
                  className="h-9 sm:h-[38px] px-4 sm:px-6 bg-[var(--admin-accent)] hover:opacity-95 text-white rounded-[4px] text-[12px] sm:text-[12.5px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  {isLoading ? (
                    <>
                      <div className="skeleton-box inline-block w-4 h-4 rounded-[2px]" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px] text-white">
                        done_all
                      </span>
                      <span>{isEditMode ? 'Update Product' : 'Publish Product'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <LivePreviewCard
          formData={formData}
          mobileTab={mobileTab}
          categoriesList={categoriesList}
        />
      </div>

      <AiCurationOverlay
        showAIHUD={showAIHUD}
        setShowAIHUD={setShowAIHUD}
        aiAnalysisResult={aiAnalysisResult}
        setAiAnalysisResult={setAiAnalysisResult}
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
        moduleName="Products"
        lastSavedAt={lastSavedAt}
      />

      <DraftConflictViewer
        isOpen={showConflictModal}
        serverData={serverData}
        draftData={formData}
        onKeepServer={() => {
          setFormData(serverData);
          setShowConflictModal(false);
        }}
        onKeepDraft={() => setShowConflictModal(false)}
        moduleName="Product"
      />

      <UnsavedChangesGuard blocker={blocker} />
    </div>
  );

  return mainLayout;
}
