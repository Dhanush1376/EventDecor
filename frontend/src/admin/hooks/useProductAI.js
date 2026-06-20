import { useState } from 'react';
import { productService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../utils/logger';

export function useProductAI({
  formData,
  setFormData,
  categoriesList,
  setCategoriesList,
  setCurrentStep,
}) {
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [showAIHUD, setShowAIHUD] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAILearning, setIsAILearning] = useState(false);
  const [_isApplyingFields, setIsApplyingFields] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  const handleAIFill = async (fileObj) => {
    // If fileObj is a React synthetic event, ignore it
    const isEvent = fileObj && fileObj.nativeEvent;
    const actualFile = isEvent ? null : fileObj;

    if (!actualFile && !formData.imageSrc) {
      toast.error('Please add an image first');
      return;
    }

    setIsAIGenerating(true);
    try {
      let imageToAnalyze = actualFile;
      if (!imageToAnalyze && formData.imageSrc && typeof formData.imageSrc === 'string') {
        imageToAnalyze = formData.imageSrc;
      }

      const categoryList = categoriesList;
      const title = formData.title || '';

      const generatedData = await productService.aiAutofill(
        title,
        typeof imageToAnalyze === 'string' ? imageToAnalyze : null,
        categoryList,
      );

      if (generatedData?.success && generatedData?.data) {
        setAiAnalysisResult(generatedData.data);
        setShowAIHUD(true);
      }
    } catch (err) {
      toast.error('AI Auto-fill failed. Please try again.');
      logger.error('AI Error:', err);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleAiChatSubmit = async (e) => {
    e.preventDefault();
    if (!aiChatInput.trim() || !aiAnalysisResult) return;
    setIsAILearning(true);
    try {
      const result = await productService.refineAiProduct(aiAnalysisResult, aiChatInput);
      if (result.success && result.data) {
        setAiAnalysisResult(result.data);
        setAiChatInput('');
        toast.success('AI updated the curation successfully!');
      }
    } catch (err) {
      toast.error('AI refinement failed.');
      logger.error('AI refinement error:', err);
    } finally {
      setIsAILearning(false);
    }
  };

  const handleApplyAISpecs = () => {
    if (!aiAnalysisResult) return;

    setIsApplyingFields(true);
    setShowAIHUD(false);

    const fieldsToFill = [
      { key: 'title', value: aiAnalysisResult.english_title },
      { key: 'teluguTitle', value: aiAnalysisResult.telugu_title },
      { key: 'slug', value: aiAnalysisResult.slug },
      { key: 'category', value: aiAnalysisResult.category },
      { key: 'material', value: (aiAnalysisResult.materials || []).join(',') },
      {
        key: 'tags',
        value: [
          ...new Set([
            ...(aiAnalysisResult.tags || []),
            ...(aiAnalysisResult.telugu_keywords || []),
            ...(aiAnalysisResult.search_aliases || []),
            ...(aiAnalysisResult.event_associations || []),
          ]),
        ].join(','),
      },
      { key: 'badges', value: (aiAnalysisResult.badges || []).join(', ') },
      { key: 'description', value: aiAnalysisResult.description },
      { key: 'price', value: aiAnalysisResult.price ? String(aiAnalysisResult.price) : '' },
      { key: 'seoTitle', value: aiAnalysisResult.english_title + ' | Siri Arts & Crafts' },
      {
        key: 'seoDescription',
        value: aiAnalysisResult.description
          ? aiAnalysisResult.description.substring(0, 155) + '...'
          : '',
      },
      { key: 'isCustomizable', value: aiAnalysisResult.isCustomizable },
      { key: 'customizationNote', value: aiAnalysisResult.customizationNote },
    ];

    let index = 0;

    // Jump straight to details step (Step 2) to show the animation visually!
    setCurrentStep(1);

    const interval = setInterval(() => {
      if (index >= fieldsToFill.length) {
        clearInterval(interval);
        setIsApplyingFields(false);
        setFocusedField('');
        toast.success('AI filled product details');
        return;
      }

      const field = fieldsToFill[index];

      // Navigate/Scroll to different steps if they are on a different page for visual polish!
      if (field.key === 'tags' || field.key === 'isCustomizable') {
        setCurrentStep(2); // Attributes step (new index 2)
      } else if (field.key === 'seoTitle') {
        setCurrentStep(3); // SEO step (new index 3)
      } else if (field.key === 'price') {
        setCurrentStep(4); // Pricing & Stock step
      }

      setFocusedField(field.key);

      // Dynamic dynamic categories aggregator
      if (field.key === 'category' && field.value && !categoriesList.includes(field.value)) {
        setCategoriesList((prev) => [...prev, field.value].sort());
      }

      if (field.key === 'isCustomizable' && field.value) {
        setFormData((prev) => ({
          ...prev,
          customizationConfig: {
            ...prev.customizationConfig,
            enabled: true,
            required: true,
          },
        }));
      } else if (field.key === 'customizationNote' && field.value) {
        setFormData((prev) => ({
          ...prev,
          customizationConfig: {
            ...prev.customizationConfig,
            label: field.value,
          },
        }));
      } else if (field.key !== 'isCustomizable' && field.key !== 'customizationNote') {
        setFormData((prev) => ({
          ...prev,
          [field.key]: field.value || prev[field.key],
        }));
      }

      index++;
    }, 550); // Beautiful, smooth sequential populating delay!
  };

  return {
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
  };
}
