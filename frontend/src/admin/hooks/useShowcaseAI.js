import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { cmsService } from '../../services/domainServices';
import { aiService } from '../../services/api/aiService';
import logger from '../../utils/core/logger';

export function useShowcaseAI({ formData, setFormData, setCategories, setCurrentStep }) {
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [showAIHUD, setShowAIHUD] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAILearning, setIsAILearning] = useState(false);
  const [isApplyingFields, setIsApplyingFields] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState(false);
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

  const handleAiAutofill = async (selectedProviderId = null) => {
    if (!formData.image) {
      toast.error('Please upload or paste an image URL first for AI Vision analysis!');
      return;
    }
    const loadId = toast.loading('AI Vision models analyzing floral accents & prop structures...');
    setIsAIGenerating(true);
    setAiError(null);
    try {
      let imageToAnalyze = formData.image;
      if (formData.pendingUploads?.length > 0) {
        const upload = formData.pendingUploads.find((p) => p.localUrl === formData.image);
        if (upload) imageToAnalyze = upload.file;
      }
      if (
        !imageToAnalyze &&
        typeof formData.image === 'string' &&
        formData.image.startsWith('blob:')
      ) {
        try {
          const res = await fetch(formData.image);
          imageToAnalyze = await res.blob();
        } catch (e) {
          logger.error('Failed to fetch blob URL', e);
        }
      }

      let finalImageSrc = typeof imageToAnalyze === 'string' ? imageToAnalyze : null;

      const isFileLike =
        imageToAnalyze instanceof File ||
        imageToAnalyze instanceof Blob ||
        (imageToAnalyze &&
          typeof imageToAnalyze === 'object' &&
          'size' in imageToAnalyze &&
          'type' in imageToAnalyze);

      if (isFileLike) {
        try {
          const blobToRead =
            imageToAnalyze instanceof File || imageToAnalyze instanceof Blob
              ? imageToAnalyze
              : new Blob([imageToAnalyze], { type: imageToAnalyze.type || 'image/jpeg' });

          finalImageSrc = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (!reader.result) {
                resolve(null);
                return;
              }
              // Resize image using canvas to avoid massive payloads
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                  if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                  }
                } else {
                  if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL(imageToAnalyze.type || 'image/jpeg', 0.8));
              };
              img.onerror = () => resolve(reader.result); // Fallback to original
              img.src = reader.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(blobToRead);
          });
        } catch (e) {
          logger.error('Failed to read and resize image', e);
        }
      }

      const res = await cmsService.analyzeShowcaseImage(finalImageSrc, selectedProviderId);
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
        toast.success('AI Vision extracted details successfully');
      }
    } catch (err) {
      const errMsg =
        err?.response?.data?.message || err?.message || 'Failed to analyze image with AI';
      toast.error(errMsg);
      setAiError(errMsg);
    } finally {
      setIsAIGenerating(false);
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
      {
        key: 'inclusions',
        value:
          aiAnalysisResult.inclusions ||
          (aiAnalysisResult.inclusionsText
            ? aiAnalysisResult.inclusionsText
                .split(',')
                .map((item, idx) => ({
                  id: Date.now() + idx,
                  name: item.trim(),
                  defaultQty: 1,
                  condition: 'excellent',
                }))
                .filter((i) => i.name.length > 0)
            : []),
      },
      { key: 'colorPalette', value: aiAnalysisResult.colorPalette },
      { key: 'suggestedProps', value: aiAnalysisResult.suggestedProps },
      {
        key: 'setupTimeHours',
        value: aiAnalysisResult.setupTimeHours ? String(aiAnalysisResult.setupTimeHours) : '',
      },
      {
        key: 'rentalPrice',
        value: aiAnalysisResult.rentalPrice ? String(aiAnalysisResult.rentalPrice) : '',
      },
      {
        key: 'strikingPrice',
        value: aiAnalysisResult.strikingPrice ? String(aiAnalysisResult.strikingPrice) : '',
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
      if (index === 10) setCurrentStep((prev) => (prev < 4 ? 4 : prev));

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
    isAIGenerating,
    isApplyingFields,
    focusedField,
    aiError,
    setAiError,
    globalAiConfig,
    handleAiAutofill,
    handleAiChatSubmit,
    handleApplyAISpecs,
  };
}
