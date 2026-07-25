import { useState, useEffect } from 'react';
import { productService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { aiService } from '../../services/api/aiService';
import logger from '../../utils/core/logger';

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
  const [aiError, setAiError] = useState(null);
  const [globalAiConfig, setGlobalAiConfig] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await aiService.getSettings();
        setGlobalAiConfig(res.data);
      } catch (err) {
        logger.warn('Failed to load Global AI Settings', err);
      }
    };
    fetchConfig();
  }, []);

  const handleAIFill = async (customTitle, selectedProviderId = null) => {
    if (!customTitle || typeof customTitle !== 'string') {
      toast.error('Please enter a title for AI generation.');
      return;
    }

    setIsAIGenerating(true);
    setAiError(null);
    try {
      const categoryList = categoriesList;

      const generatedData = await productService.aiAutofill(
        customTitle,
        null,
        categoryList,
        selectedProviderId,
      );

      if (generatedData?.success && generatedData?.data) {
        setAiAnalysisResult(generatedData.data);
        setShowAIHUD(true);
      }
    } catch (err) {
      const errMsg =
        err?.response?.data?.message || err?.message || 'AI Auto-fill failed. Please try again.';
      toast.error('AI Auto-fill failed. Please try again.');
      setAiError(errMsg);
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

    const baseVariants = [...(aiAnalysisResult.suggested_variants || [])];

    // Auto-map top-level materials and colors to variants for storefront filtering!
    if (aiAnalysisResult.materials?.length > 0) {
      aiAnalysisResult.materials.forEach((m) => {
        if (!baseVariants.some((v) => v.name.toLowerCase() === 'material' && v.value === m)) {
          baseVariants.push({ name: 'Material', value: m, price: 0 });
        }
      });
    }

    if (aiAnalysisResult.colors?.length > 0) {
      aiAnalysisResult.colors.forEach((c) => {
        if (!baseVariants.some((v) => v.name.toLowerCase() === 'color' && v.value === c)) {
          baseVariants.push({ name: 'Color', value: c, price: 0 });
        }
      });
    }

    const fieldsToFill = [
      { key: 'title', value: aiAnalysisResult.english_title },
      { key: 'teluguTitle', value: aiAnalysisResult.telugu_title },
      { key: 'slug', value: aiAnalysisResult.slug },
      { key: 'primaryCategory', value: aiAnalysisResult.primary_category },
      { key: 'secondaryCategories', value: aiAnalysisResult.secondary_categories || [] },
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
      // Personalization config (from AI)
      { key: '_personalization', value: aiAnalysisResult.personalization_enabled },
      // Customer note (from AI)
      { key: 'customerNote', value: aiAnalysisResult.customer_note },
      // Variants (from AI + manual mapping)
      { key: '_variants', value: baseVariants },
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
      if (field.key === 'tags') {
        setCurrentStep(2); // Attributes step (new index 2)
      } else if (field.key === 'seoTitle') {
        setCurrentStep(3); // SEO step (new index 3)
      } else if (field.key === 'price') {
        setCurrentStep(4); // Pricing & Stock step
      } else if (field.key === '_personalization' || field.key === 'customerNote') {
        setCurrentStep(1); // Back to Product Info step to show note filling
      }

      setFocusedField(field.key);

      // Dynamic categories aggregator
      if (field.key === 'primaryCategory' && field.value && !categoriesList.includes(field.value)) {
        setCategoriesList((prev) => [...prev, field.value].sort());
      }
      if (field.key === 'secondaryCategories' && Array.isArray(field.value)) {
        field.value.forEach((cat) => {
          if (cat && !categoriesList.includes(cat)) {
            setCategoriesList((prev) => [...prev, cat].sort());
          }
        });
      }

      // Apply personalization config from AI
      if (field.key === '_personalization') {
        const enabled = Boolean(aiAnalysisResult.personalization_enabled);
        setFormData((prev) => ({
          ...prev,
          customizationConfig: {
            ...prev.customizationConfig,
            enabled: enabled,
            required: enabled,
            label:
              aiAnalysisResult.personalization_label ||
              prev.customizationConfig?.label ||
              'Customization Note',
            placeholder: (
              aiAnalysisResult.personalization_placeholder ||
              prev.customizationConfig?.placeholder ||
              'Enter customization details'
            ).replace(/\\n/g, '\n'),
            helperText:
              aiAnalysisResult.personalization_helper || prev.customizationConfig?.helperText || '',
          },
        }));
      } else if (field.key === 'customerNote') {
        // Build a rich customer note including quantity estimation
        let note = (field.value || '').replace(/\\n/g, '\n');

        // Append quantity estimation if available
        if (
          aiAnalysisResult.estimated_quantity &&
          aiAnalysisResult.estimated_quantity > 1 &&
          aiAnalysisResult.estimated_quantity_unit
        ) {
          const quantityLine = `• Contains approximately ${aiAnalysisResult.estimated_quantity} ${aiAnalysisResult.estimated_quantity_unit}`;
          if (
            !note.includes('approximately') &&
            !note.includes(aiAnalysisResult.estimated_quantity_unit)
          ) {
            note = note ? quantityLine + '\n' + note : quantityLine;
          }
        }

        setFormData((prev) => ({
          ...prev,
          customerNote: note || prev.customerNote,
        }));
      } else if (
        field.key === '_variants' &&
        Array.isArray(field.value) &&
        field.value.length > 0
      ) {
        setFormData((prev) => {
          if (prev.variants && prev.variants.length > 0) return prev; // don't overwrite if user already added variants
          return {
            ...prev,
            variants: field.value.map((v, i) => ({ ...v, id: Date.now() + i })),
          };
        });
      } else if (!field.key.startsWith('_')) {
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
    aiError,
    setAiError,
    globalAiConfig,
  };
}
