import { m as motion } from 'framer-motion';
import { SkeletonDashboard, fadeUp } from '../../components/AdminUIKit';
import { DraftStatusIndicator } from '../../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../../components/UnsavedChangesGuard';
import { useCreateCoupon } from './useCreateCoupon';
import { STEPS } from './constants';
import { WizardHeader } from './components/WizardHeader';
import { CouponPreview } from './components/CouponPreview';
import { MetadataStep } from './steps/MetadataStep';
import { TargetingStep } from './steps/TargetingStep';
import { ControlsStep } from './steps/ControlsStep';
import { PublishStep } from './steps/PublishStep';

export function AdminCreateCoupon() {
  const {
    isEdit,
    loading,
    saving,
    mobileTab,
    setMobileTab,
    currentStep,
    setCurrentStep,
    products,
    availableCategories,
    formData,
    setFormData,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    lastSavedAt,
    blocker,
    handleSubmit,
    handleCancelAction,
  } = useCreateCoupon();

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-6 pb-20 p-4 sm:p-6 md:p-8">
        <SkeletonDashboard />
      </div>
    );
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const formElement = (
    <div className={`flex-1 min-w-0 ${mobileTab === 'form' ? 'block' : 'hidden lg:block'}`}>
      <div className="admin-card">
        <WizardHeader steps={STEPS} currentStep={currentStep} setCurrentStep={setCurrentStep} />

        <motion.form
          onSubmit={(e) => {
            e.preventDefault();
            if (currentStep === STEPS.length - 1) {
              handleSubmit(e);
            } else {
              handleNext();
            }
          }}
          variants={fadeUp}
          className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 min-h-[450px]"
        >
          {currentStep === 0 && (
            <MetadataStep formData={formData} setFormData={setFormData} isEdit={isEdit} />
          )}
          {currentStep === 1 && (
            <TargetingStep
              formData={formData}
              setFormData={setFormData}
              products={products}
              availableCategories={availableCategories}
            />
          )}
          {currentStep === 2 && <ControlsStep formData={formData} setFormData={setFormData} />}
          {currentStep === 3 && <PublishStep formData={formData} setFormData={setFormData} />}

          <div className="pt-6 flex items-center justify-between border-t border-[var(--admin-border-subtle)]">
            <button
              type="button"
              onClick={currentStep === 0 ? handleCancelAction : handlePrev}
              className="admin-btn admin-btn-outline"
            >
              {currentStep === 0 ? 'Cancel' : 'Previous'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="admin-btn admin-btn-primary disabled:opacity-50"
            >
              {currentStep === STEPS.length - 1
                ? saving
                  ? 'Saving...'
                  : isEdit
                    ? 'Update Coupon'
                    : 'Publish Campaign'
                : 'Next Step'}
            </button>
          </div>
        </motion.form>
      </div>

      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Coupons"
        lastSavedAt={lastSavedAt}
      />

      <UnsavedChangesGuard blocker={blocker} />
    </div>
  );

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-20 sm:pb-0 px-0 sm:px-6 md:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancelAction}
            className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-none mb-1.5 flex items-center gap-2">
              {isEdit ? 'Edit Campaign' : 'New Campaign'}
              <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
            </h2>
          </div>
        </div>
      </div>

      <div className="lg:hidden flex bg-[var(--admin-surface)] rounded-full p-1 border border-[var(--admin-border)] shadow-sm mx-0">
        <button
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 text-[12px] font-bold rounded-full transition-all ${
            mobileTab === 'form'
              ? 'bg-[var(--admin-accent)] text-white shadow-md'
              : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          Editor Form
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-[12px] font-bold rounded-full transition-all ${
            mobileTab === 'preview'
              ? 'bg-[var(--admin-accent)] text-white shadow-md'
              : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          Live Preview
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 relative items-start">
        {formElement}

        <div
          className={`lg:w-[340px] xl:w-[400px] shrink-0 lg:sticky lg:top-24 space-y-6 w-full ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}
        >
          <CouponPreview formData={formData} />
        </div>
      </div>
    </div>
  );
}
