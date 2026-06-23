import { useState } from 'react';
import toast from 'react-hot-toast';
import { cmsService } from '../../services/domainServices';
import logger from '../../utils/core/logger';

export function useShowcaseAI({ formData, setFormData, setCategories, setCurrentStep }) {
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [showAIHUD, setShowAIHUD] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAILearning, setIsAILearning] = useState(false);
  const [isApplyingFields, setIsApplyingFields] = useState(false);
  const [focusedField, setFocusedField] = useState('');

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
      if (index === 4) setCurrentStep((prev) => (prev < 2 ? 2 : prev));
      if (index === 8) setCurrentStep((prev) => (prev < 4 ? 4 : prev));

      index++;
    }, 400); // Staggered animation
  };

  return {
    aiAnalysisResult,
    showAIHUD,
    setShowAIHUD,
    aiChatInput,
    setAiChatInput,
    isAILearning,
    isApplyingFields,
    focusedField,
    handleAiAutofill,
    handleAiChatSubmit,
    handleApplyAISpecs,
  };
}
