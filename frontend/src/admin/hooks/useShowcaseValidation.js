import { useEffect } from 'react';
import toast from 'react-hot-toast';

export function useShowcaseValidation({
  currentStep,
  setCurrentStep,
  formData,
  setFormData,
  WIZARD_STEPS,
  showAIHUD,
  handleCancelAction,
  setLastDraftSaved,
  setPageState,
}) {
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
      if (setPageState) {
        setPageState((prev) => ({ ...prev, activeStep: currentStep + 1 }));
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      if (setPageState) {
        setPageState((prev) => ({ ...prev, activeStep: currentStep - 1 }));
      }
    }
  };

  // Keyboard Navigation: Alt + ArrowRight/Left, Ctrl+S to save, Escape to go back
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
      // Ctrl+S / Cmd+S to save draft
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (setLastDraftSaved) setLastDraftSaved(new Date());
        toast.success('Draft saved (in-memory)!', { duration: 1500 });
      }
      // Escape to go back
      if (e.key === 'Escape' && !showAIHUD) {
        if (handleCancelAction) handleCancelAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData, showAIHUD]);

  return { getStepErrors, isStepValid, handleNext, handlePrev };
}
