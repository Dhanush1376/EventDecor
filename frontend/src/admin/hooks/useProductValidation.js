import { useEffect } from 'react';
import toast from 'react-hot-toast';

export function useProductValidation({
  currentStep,
  setCurrentStep,
  formData,
  setFormData,
  WIZARD_STEPS,
  showAIHUD,
  handleCancelAction,
  setLastDraftSaved,
}) {
  const getStepErrors = () => {
    const errors = {};
    if (currentStep === 0) {
      // Media step
      const hasAnyImage = formData.images?.length > 0 || !!formData.imageSrc;
      if (formData.images?.length > 0 && !formData.imageSrc) {
        setFormData((prev) => ({ ...prev, imageSrc: prev.images[0] }));
      }
      if (!hasAnyImage) {
        errors.imageSrc = 'At least one product image is required';
      }
    }
    if (currentStep === 1) {
      // Basic Info step
      if (!formData.title || !formData.title.trim()) errors.title = 'Product title is required';
      if (!formData.category && !formData.primaryCategory) errors.category = 'Category is required';
    }
    if (currentStep === 3) {
      // Pricing step
      if (!formData.price || Number(formData.price) <= 0) errors.price = 'Enter a valid price';
      if (formData.stock === '' || Number(formData.stock) < 0)
        errors.stock = 'Enter stock quantity';
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
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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
        setLastDraftSaved(new Date());
        toast.success('Draft saved (in-memory)!', { duration: 1500 });
      }
      // Escape to go back
      if (e.key === 'Escape' && !showAIHUD) {
        handleCancelAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData, showAIHUD]);

  return { getStepErrors, isStepValid, handleNext, handlePrev };
}
