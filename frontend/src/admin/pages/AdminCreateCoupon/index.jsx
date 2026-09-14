import { AdminCreateCouponSkeleton } from '../../components/AdminUIKit';
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
    return <AdminCreateCouponSkeleton />;
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
    <div
      className={`bg-[var(--admin-surface)] rounded-[4px] border border-[var(--admin-border)] shadow-xs p-4 sm:p-6 min-h-0 lg:min-h-[480px] flex-col justify-between relative ${mobileTab === 'form' ? 'flex' : 'hidden lg:flex'}`}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (currentStep === STEPS.length - 1) {
            handleSubmit(e);
          } else {
            handleNext();
          }
        }}
        className="space-y-6 sm:space-y-8 flex-1 flex flex-col justify-between"
      >
        <div className="space-y-6">
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
        </div>

        {/* Footer Controls - Sticky above bottom nav on mobile */}
        <div className="admin-wizard-sticky-footer">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <button
              type="button"
              onClick={currentStep === 0 ? handleCancelAction : handlePrev}
              className="h-9 sm:h-[38px] px-3.5 sm:px-4 bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] text-[var(--admin-text-primary)] rounded-[4px] text-[12px] sm:text-[12.5px] font-bold cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              {currentStep === 0 ? 'Cancel' : 'Back'}
            </button>

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className="h-9 sm:h-[38px] px-3.5 sm:px-5 bg-[var(--admin-accent)] hover:opacity-95 text-white rounded-[4px] text-[12px] sm:text-[12.5px] font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs disabled:opacity-50"
              >
                <span>Continue</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="h-9 sm:h-[38px] px-4 sm:px-6 bg-[var(--admin-accent)] hover:opacity-95 text-white rounded-[4px] text-[12px] sm:text-[12.5px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                {saving ? (
                  <>
                    <div className="skeleton-box inline-block w-4 h-4 rounded-[2px]" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-white">
                      done_all
                    </span>
                    <span>{isEdit ? 'Update Coupon' : 'Publish Coupon'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

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
    <div className="flex flex-col gap-4 sm:gap-6 max-w-7xl mx-auto pb-36 lg:pb-8">
      {/* Mobile Merged Header & Progress Card */}
      <div className="lg:hidden bg-[var(--admin-surface)] p-3 rounded-[4px] border border-[var(--admin-border)] shadow-xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleCancelAction}
              className="w-8 h-8 rounded-[4px] bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] cursor-pointer transition-all active:scale-95 shadow-xs shrink-0"
              title="Back to Coupons"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold text-[var(--admin-text-primary)] tracking-tight leading-tight whitespace-nowrap">
                {isEdit ? 'Edit Coupon' : 'New Coupon'}
              </h2>
              <p className="text-[11.5px] text-[var(--admin-text-secondary)] font-medium truncate mt-0.5 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-[var(--admin-accent)]">
                  {STEPS[currentStep].icon}
                </span>
                <span className="font-semibold text-[var(--admin-text-primary)]">
                  {STEPS[currentStep].label}
                </span>
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end justify-center gap-1">
            <span className="text-[10px] font-bold text-[var(--admin-accent)] bg-[var(--admin-surface-muted)] px-2 py-0.5 rounded-[3px] border border-[var(--admin-border)] tracking-wider uppercase">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} compact />
          </div>
        </div>

        {/* Integrated Progress Bar */}
        <div className="w-full bg-[var(--admin-surface-muted)] h-1.5 rounded-[2px] overflow-hidden border border-[var(--admin-border)]">
          <div
            className="bg-[var(--admin-accent)] h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancelAction}
            className="w-8 h-8 rounded-[4px] bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] cursor-pointer transition-all active:scale-95 shadow-xs shrink-0"
            title="Back to Coupons"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[16px] sm:text-[18px] font-bold text-[var(--admin-text-primary)] tracking-tight leading-tight">
              {isEdit ? 'Edit Coupon' : 'New Coupon'}
            </h2>
            <p className="text-[11px] sm:text-[12px] text-[var(--admin-text-secondary)] mt-0.5">
              {isEdit
                ? `Configuring ${formData.code || 'coupon'}`
                : 'Create targeted promotional offers, discounts, and vouchers'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Guided Progress Bar (Desktop) */}
      <WizardHeader steps={STEPS} currentStep={currentStep} setCurrentStep={setCurrentStep} />

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
          Edit Coupon
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
        {formElement}

        <div
          className={`lg:sticky lg:top-24 w-full ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}
        >
          <CouponPreview formData={formData} />
        </div>
      </div>
    </div>
  );
}
