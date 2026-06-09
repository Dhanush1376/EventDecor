import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { productCategories } from '../data/adminData';
import { productService, uploadService } from '../../services/domainServices';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';
import { AdminToggle, SkeletonForm } from '../components/AdminUIKit';
import { compressImage, formatBytes } from '../../utils/imageCompressor';
import { useDraft } from '../hooks/useDraft';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { DraftConflictViewer } from '../components/DraftConflictViewer';

import logger from '../../utils/logger';
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
const slideIn = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const calculateRentalPricing = (price, category) => {
  const numPrice = Number(price);
  if (numPrice <= 0) return null;
  const cat = String(category || '').toLowerCase();

  let dailyRate;
  let depositRate;

  if (cat.includes('furniture')) {
    dailyRate = 0.04;
    depositRate = 0.3;
  } else if (cat.includes('electronic')) {
    dailyRate = 0.06;
    depositRate = 0.5;
  } else if (cat.includes('wedding decoration') || cat.includes('wedding')) {
    dailyRate = 0.08;
    depositRate = 0.4;
  } else if (cat.includes('camera')) {
    dailyRate = 0.1;
    depositRate = 0.6;
  } else {
    dailyRate = 0.05;
    if (numPrice <= 5000) depositRate = 0.3;
    else if (numPrice <= 25000) depositRate = 0.4;
    else if (numPrice <= 100000) depositRate = 0.5;
    else depositRate = 0.6;
  }

  return {
    daily: Math.round(numPrice * dailyRate),
    weekly: Math.round(numPrice * dailyRate * 6),
    monthly: Math.round(numPrice * dailyRate * 16),
    securityDeposit: Math.round(numPrice * depositRate),
  };
};

const WIZARD_STEPS = [
  { id: 'media', label: 'Media & Imagery', icon: 'photo_library' },
  { id: 'details', label: 'Product Info', icon: 'info' },
  { id: 'variants', label: 'Attributes & Variants', icon: 'tune' },
  { id: 'seo', label: 'SEO Settings', icon: 'search' },
  { id: 'pricing', label: 'Pricing & Stock', icon: 'payments' },
  { id: 'review', label: 'Review & Publish', icon: 'verified' },
];

export function AdminAddProduct({ editId }) {
  const { id: routeId } = useParams();
  const id = editId || routeId;
  const navigate = useNavigate();
  const { refreshProducts } = useAdmin();
  const isEditMode = Boolean(id);

  const [mobileTab, setMobileTab] = useState('form');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionStats, setCompressionStats] = useState([]);
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  const [categoriesList, setCategoriesList] = useState(productCategories);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [showAIHUD, setShowAIHUD] = useState(false);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAILearning, setIsAILearning] = useState(false);
  const [isApplyingFields, setIsApplyingFields] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  // Draft System Integration
  const {
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
  } = useDraft({
    draftKey: isEditMode ? `admin:products:edit:${id}` : 'admin:products:add',
    module: 'Products',
    pageTitle: isEditMode ? `Edit Product ${id}` : 'New Product',
    initialData: {
      title: '',
      teluguTitle: '',
      slug: '',
      category: '',
      material: '',
      tags: '',
      price: '',
      oldPrice: '',
      stock: '',
      imageSrc: '',
      images: [],
      badges: '',
      description: '',
      dimensions: '',
      weight: '',
      seoTitle: '',
      seoDescription: '',
      featured: false,
      isActive: true,
      isNonRefundable: false,
      showInGallery: false,
      variants: [],
      rentalEnabled: false,
      availabilityMode: 'purchase_only',
      rentalPricing: {
        daily: '',
        weekly: '',
        monthly: '',
        customDurationEnabled: false,
        customPricePerDay: '',
      },
      securityDeposit: '',
      isDepositRefundable: true,
      rentalStock: '',
      rentalMinDays: '1',
      rentalMaxDays: '365',
      isManualRentalPricing: false,
      customizationConfig: {
        enabled: false,
        required: false,
        label: 'Customization Note',
        placeholder: 'Enter customization details',
        maxLength: 500,
        helperText: '',
      },
    },
    initialPageState: { activeStep: 0 },
    enabled: true,
  });

  const currentStep = pageState.activeStep || 0;
  const setCurrentStep = (step) => setPageState((prev) => ({ ...prev, activeStep: step }));

  const [showRentalSettings, setShowRentalSettings] = useState(false);
  const [serverData, setServerData] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);

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
      { key: 'tags', value: (aiAnalysisResult.tags || []).join(',') },
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

  // Variant input local state
  const [newVariant, setNewVariant] = useState({ name: '', value: '', price: '', stock: '' });

  // Load dynamic categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await productService.getAll({ limit: 150 });
        if (res.success && res.data && res.data.products) {
          const dbCategories = res.data.products.map((p) => p.category).filter(Boolean);
          setCategoriesList((prev) => {
            const combined = new Set([...productCategories, ...dbCategories]);
            return Array.from(combined).sort();
          });
        }
      } catch (err) {
        logger.error('Failed to load dynamic categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Restoration and Fetching
  useEffect(() => {
    if (isEditMode) {
      const fetchProduct = async () => {
        setIsLoading(true);
        try {
          const res = await productService.getById(id);
          if (res.success) {
            const p = res.data;
            if (p.category && !productCategories.includes(p.category)) {
              setCategoriesList((prev) => Array.from(new Set([...prev, p.category])).sort());
            }
            setFormData({
              title: p.title || p.name || '',
              teluguTitle: p.teluguTitle || p.nameTE || '',
              slug: p.slug || '',
              category: p.category || '',
              material: p.material || '',
              tags: p.tags ? p.tags.join(',') : '',
              price: p.price || '',
              oldPrice: p.oldPrice || '',
              stock: p.stock !== undefined ? p.stock : '',
              imageSrc: p.imageSrc || (p.images && p.images[0]) || '',
              images: p.images || [],
              badges: p.badges ? p.badges.join(',') : '',
              description: p.description || '',
              dimensions: p.dimensions || '',
              weight: p.weight || '',
              seoTitle: p.seoTitle || '',
              seoDescription: p.seoDescription || '',
              featured: p.featured || false,
              isActive: p.isActive !== undefined ? p.isActive : true,
              isNonRefundable: p.isNonRefundable || false,
              showInGallery: p.showInGallery || false,
              variants: Array.isArray(p.variants) ? p.variants : [],
              // Rental fields
              rentalEnabled: p.rentalEnabled || false,
              availabilityMode: p.availabilityMode || 'purchase_only',
              rentalPricing: p.rentalPricing || {
                daily: '',
                weekly: '',
                monthly: '',
                customDurationEnabled: false,
                customPricePerDay: '',
              },
              securityDeposit: p.securityDeposit || '',
              isDepositRefundable:
                p.isDepositRefundable !== undefined ? p.isDepositRefundable : true,
              rentalStock: p.rentalStock !== undefined ? p.rentalStock : '',
              rentalMinDays: p.rentalMinDays || '1',
              rentalMaxDays: p.rentalMaxDays || '365',
              isManualRentalPricing: p.isManualRentalPricing || false,
              customizationConfig: p.customizationConfig || {
                enabled: false,
                required: false,
                label: 'Customization Note',
                placeholder: 'Enter customization details',
                maxLength: 500,
                helperText: '',
              },
            });
            if (p.rentalEnabled) setShowRentalSettings(true);
          }
        } catch (err) {
          toast.error(
            err?.response?.data?.message || err?.message || 'Failed to load product details',
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEditMode]);

  useEffect(() => {
    if (!isEditMode) {
      setFormData({
        title: '',
        teluguTitle: '',
        slug: '',
        category: '',
        material: '',
        tags: '',
        price: '',
        oldPrice: '',
        stock: '',
        imageSrc: '',
        images: [],
        badges: '',
        description: '',
        dimensions: '',
        weight: '',
        seoTitle: '',
        seoDescription: '',
        featured: false,
        isActive: true,
        showInGallery: false,
        variants: [],
        // Rental fields
        rentalEnabled: false,
        availabilityMode: 'purchase_only',
        rentalPricing: {
          daily: '',
          weekly: '',
          monthly: '',
          customDurationEnabled: false,
          customPricePerDay: '',
        },
        securityDeposit: '',
        isDepositRefundable: true,
        rentalStock: '',
        rentalMinDays: '1',
        rentalMaxDays: '365',
        isManualRentalPricing: false,
        customizationConfig: {
          enabled: false,
          required: false,
          label: 'Customization Note',
          placeholder: 'Enter customization details',
          maxLength: 500,
          helperText: '',
        },
      });
      setCurrentStep(0);
    }
  }, [id, isEditMode]);

  const handleCancelAction = () => {
    navigate('/admin/products');
  };

  const handleSuccessAction = () => {
    navigate('/admin/products');
  };

  // Auto-save status tracking (in-memory only)
  const [lastDraftSaved, setLastDraftSaved] = useState(null);

  // Local Autosave (in-memory only)
  useEffect(() => {
    if (!isEditMode && formData.title) {
      const timeoutId = setTimeout(() => {
        setLastDraftSaved(new Date());
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, isEditMode]);

  // Smart Rental Pricing Auto-calculation
  useEffect(() => {
    if (!formData.isManualRentalPricing && formData.rentalEnabled && formData.price) {
      const calculated = calculateRentalPricing(formData.price, formData.category);
      if (calculated) {
        setFormData((prev) => {
          // Check if it's already the same to avoid unnecessary re-renders
          if (
            prev.rentalPricing?.daily === calculated.daily &&
            prev.rentalPricing?.weekly === calculated.weekly &&
            prev.rentalPricing?.monthly === calculated.monthly &&
            prev.securityDeposit === calculated.securityDeposit
          ) {
            return prev;
          }
          return {
            ...prev,
            rentalPricing: {
              ...(prev.rentalPricing || {}),
              daily: calculated.daily,
              weekly: calculated.weekly,
              monthly: calculated.monthly,
            },
            securityDeposit: calculated.securityDeposit,
          };
        });
      }
    }
  }, [formData.price, formData.category, formData.isManualRentalPricing, formData.rentalEnabled]);

  // Form Validation per step
  const getStepErrors = () => {
    const errors = {};
    if (currentStep === 0) {
      // Check if we have any images in the array or as a primary image string
      const hasAnyImage = formData.images.length > 0 || !!formData.imageSrc;

      if (formData.images.length > 0 && !formData.imageSrc) {
        setFormData((prev) => ({ ...prev, imageSrc: prev.images[0] }));
      }

      if (!hasAnyImage) {
        errors.imageSrc = 'At least one product image is required';
      }
    }
    if (currentStep === 1) {
      if (!formData.title.trim()) errors.title = 'Product title is required';
      if (!formData.category) errors.category = 'Category is required';
    }
    if (currentStep === 4) {
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
  }, [currentStep, formData, showAIHUD]);

  // Image Helper Actions
  const swapPrimaryImage = (index) => {
    const newImages = [...formData.images];
    const oldPrimary = formData.imageSrc;
    const newPrimary = newImages[index];

    if (newPrimary) {
      newImages[index] = oldPrimary;
      setFormData({
        ...formData,
        imageSrc: newPrimary,
        images: newImages.filter(Boolean),
      });
      toast.success('Updated primary listing image');
    }
  };

  // Add Variants
  const handleAddVariant = () => {
    if (!newVariant.name || !newVariant.value) {
      return toast.error('Please fill in Variant attribute name & value');
    }
    setFormData({
      ...formData,
      variants: [...formData.variants, { ...newVariant, id: Date.now() }],
    });
    setNewVariant({ name: '', value: '', price: '', stock: '' });
    toast.success('Added variant');
  };

  const handleRemoveVariant = (vid) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((v) => v.id !== vid),
    });
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (formData.images.length > 0 && !formData.imageSrc) {
      setFormData((prev) => ({ ...prev, imageSrc: prev.images[0] }));
      formData.imageSrc = formData.images[0]; // also set locally for the check below
    }
    if (!formData.title || !formData.price || !formData.category || !formData.imageSrc) {
      return toast.error('Please fill in all mandatory fields before publishing');
    }

    setIsLoading(true);
    try {
      const payload = {
        title: formData.title,
        teluguTitle: formData.teluguTitle || undefined,
        slug:
          formData.slug ||
          formData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        category: formData.category,
        material: formData.material || undefined,
        tags:
          typeof formData.tags === 'string'
            ? formData.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : formData.tags,
        price: Number(formData.price),
        oldPrice: formData.oldPrice ? Number(formData.oldPrice) : undefined,
        stock: Number(formData.stock),
        imageSrc: formData.imageSrc,
        images: Array.from(new Set([formData.imageSrc, ...formData.images].filter(Boolean))),
        badges:
          typeof formData.badges === 'string'
            ? formData.badges
                .split(',')
                .map((b) => b.trim())
                .filter(Boolean)
            : formData.badges,
        description: formData.description,
        dimensions: formData.dimensions || undefined,
        weight: formData.weight || undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        featured: Boolean(formData.featured),
        isActive: Boolean(formData.isActive),
        isNonRefundable: Boolean(formData.isNonRefundable),
        showInGallery: Boolean(formData.showInGallery),
        variants: formData.variants,
        // Rental fields
        rentalEnabled: Boolean(formData.rentalEnabled),
        availabilityMode: formData.availabilityMode || 'purchase_only',
        rentalPricing: {
          daily: Number(formData.rentalPricing?.daily) || 0,
          weekly: Number(formData.rentalPricing?.weekly) || 0,
          monthly: Number(formData.rentalPricing?.monthly) || 0,
          customDurationEnabled: Boolean(formData.rentalPricing?.customDurationEnabled),
          customPricePerDay: Number(formData.rentalPricing?.customPricePerDay) || 0,
        },
        securityDeposit: Number(formData.securityDeposit) || 0,
        isDepositRefundable: Boolean(formData.isDepositRefundable),
        rentalStock: Number(formData.rentalStock) || 0,
        rentalMinDays: Number(formData.rentalMinDays) || 1,
        rentalMaxDays: Number(formData.rentalMaxDays) || 365,
        isManualRentalPricing: Boolean(formData.isManualRentalPricing),
        customizationConfig: {
          enabled: Boolean(formData.customizationConfig?.enabled),
          required: Boolean(formData.customizationConfig?.required),
          label: formData.customizationConfig?.label || 'Customization Note',
          placeholder: formData.customizationConfig?.placeholder || 'Enter customization details',
          maxLength: Number(formData.customizationConfig?.maxLength) || 500,
          helperText: formData.customizationConfig?.helperText || '',
        },
      };

      const res = isEditMode
        ? await productService.update(id, payload)
        : await productService.create(payload);

      if (res.success) {
        await deleteDraft(); // Delete draft on success
        toast.success(isEditMode ? 'Product updated' : 'Product published');
        if (refreshProducts) {
          try {
            await refreshProducts();
          } catch (err) {
            logger.error('Failed to refresh products state', err);
          }
        }
        handleSuccessAction();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save product listing');
    } finally {
      setIsLoading(false);
    }
  };

  // Category Suggesters
  const suggestedCategories = useMemo(() => {
    if (!formData.category) return categoriesList;
    return categoriesList.filter((c) => c.toLowerCase().includes(formData.category.toLowerCase()));
  }, [formData.category, categoriesList]);

  if (isLoading && isEditMode && !formData.title) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-6 pb-20 p-6">
        <SkeletonForm fields={6} />
      </div>
    );
  }

  const mainLayout = (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/products')}
            className="w-10 h-10 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)] hover:border-[var(--admin-accent)] cursor-pointer transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)]">
              {isEditMode ? 'Edit Product' : 'New Product'}
            </h2>
            <p className="text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]">
              {isEditMode
                ? `Modifying #${id.substring(id.length - 8).toUpperCase()}`
                : 'Add or update product'}
            </p>
          </div>
        </div>

        {/* Keyboard Shortcut Banner + Auto-save */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex">
            <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-[var(--admin-text-secondary)] font-semibold bg-[var(--admin-surface)] border border-[var(--admin-border)] px-3 py-1.5 rounded-full uppercase tracking-wider">
            <span className="px-1.5 py-0.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded text-[11px] sm:text-[11px] sm:text-[11px]">
              Alt + →
            </span>
            <span>Next</span>
            <span className="text-[#E5E7EB]">|</span>
            <span className="px-1.5 py-0.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded text-[11px] sm:text-[11px] sm:text-[11px]">
              Ctrl+S
            </span>
            <span>Save</span>
            <span className="text-[#E5E7EB]">|</span>
            <span className="px-1.5 py-0.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded text-[11px] sm:text-[11px] sm:text-[11px]">
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
                      className={`text-[11px] sm:text-[11px] sm:text-[11px] font-bold uppercase tracking-wider ${
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
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
            mobileTab === 'form'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-text-primary)] shadow-sm border border-[var(--admin-border)]/40'
              : 'text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          Edit Product
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
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
                  Compressing imagery for lightning-fast storefront delivery.
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
                {/* STEP 1: MEDIA */}
                {currentStep === 0 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                        Product Media
                      </h2>
                      <p className="text-[11px] text-[var(--admin-text-secondary)]">
                        Upload images or paste URLs. The first image acts as the primary cover.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* URL Paste Box */}
                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-widest">
                          Paste Image URLs
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            id="directUrlInput"
                            placeholder="Image URL"
                            className="flex-1 min-w-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-[11px] outline-none focus:border-[var(--admin-accent)]/40"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const input = document.getElementById('directUrlInput');
                              if (input.value) {
                                setIsCompressing(true);
                                try {
                                  const uploadData = new FormData();
                                  uploadData.append('urls', input.value);
                                  const res = await uploadService.uploadImages(
                                    uploadData,
                                    'products',
                                  );
                                  if (res.success && res.images) {
                                    setFormData((prev) => {
                                      const combined = [...prev.images, ...res.images];
                                      if (combined.length > 4) {
                                        toast.error(
                                          'Maximum 4 images allowed. Only the first 4 were kept.',
                                        );
                                      }
                                      const limitedImages = combined.slice(0, 4);
                                      return {
                                        ...prev,
                                        images: limitedImages,
                                        imageSrc: limitedImages[0] || '',
                                      };
                                    });
                                    toast.success('Image fetched & optimized!');
                                    input.value = '';
                                  }
                                } catch (err) {
                                  toast.error('Failed to upload from URL');
                                } finally {
                                  setIsCompressing(false);
                                }
                              }
                            }}
                            className="shrink-0 bg-[var(--admin-accent)] text-white hover:brightness-110 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
                          >
                            Add URL
                          </button>
                        </div>
                      </div>

                      {/* Multi Upload Box */}
                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-widest flex justify-between items-center">
                          <span>Upload Files</span>
                          {isCompressing && (
                            <span className="text-[var(--admin-accent)] text-[11px] animate-pulse">
                              Uploading...
                            </span>
                          )}
                        </label>
                        <input
                          type="file"
                          multiple
                          accept="image/*,.heic,.heif"
                          onChange={async (e) => {
                            const rawFiles = Array.from(e.target.files);
                            if (rawFiles.length === 0) return;
                            setIsCompressing(true);
                            setCompressionProgress(0);
                            setCompressionStats([]);
                            try {
                              const uploadData = new FormData();
                              const newStats = [];

                              for (let i = 0; i < rawFiles.length; i++) {
                                const file = rawFiles[i];
                                const optimizedFile = await compressImage(file);
                                uploadData.append('images', optimizedFile);

                                newStats.push({
                                  name: file.name,
                                  originalSize: formatBytes(file.size),
                                  optimizedSize: formatBytes(optimizedFile.size),
                                  reduction:
                                    file.size > 0
                                      ? ((1 - optimizedFile.size / file.size) * 100).toFixed(1)
                                      : 0,
                                });
                              }
                              setCompressionStats(newStats);

                              const onProgress = (filename, percent) => {
                                setCompressionProgress(percent);
                              };

                              const res = await uploadService.uploadImages(
                                uploadData,
                                'products',
                                onProgress,
                              );
                              if (res.success && res.images) {
                                setFormData((prev) => {
                                  const combined = [...prev.images, ...res.images];
                                  if (combined.length > 4) {
                                    toast.error(
                                      'Maximum 4 images allowed. Only the first 4 were kept.',
                                    );
                                  }
                                  const limitedImages = combined.slice(0, 4);
                                  return {
                                    ...prev,
                                    images: limitedImages,
                                    imageSrc: limitedImages[0] || '',
                                  };
                                });
                                toast.success(`Photos uploaded successfully!`);
                              }
                            } catch (err) {
                              let msg =
                                err?.response?.status === 401
                                  ? 'Upload failed: Please log in again or refresh the page'
                                  : err?.response?.data?.message ||
                                    err?.message ||
                                    'Upload failed. Please try again.';

                              if (err?.message === 'Network Error') {
                                msg = `Network Error! URL: ${err?.config?.url || 'unknown'}. Check if CORS or AdBlocker is blocking it.`;
                              }
                              toast.error(msg);
                            } finally {
                              setTimeout(() => {
                                setIsCompressing(false);
                                setCompressionProgress(0);
                                setCompressionStats([]);
                              }, 1500);
                            }
                          }}
                          className="w-full text-[11px] text-[var(--admin-text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:uppercase file:tracking-wider file:bg-[var(--admin-accent)] file:text-white hover:file:bg-[var(--admin-accent-hover)] cursor-pointer shadow-sm border border-[var(--admin-border)] rounded-xl p-2 bg-[var(--admin-surface)] focus:border-[var(--admin-accent)] focus:outline-none transition-all"
                        />
                      </div>

                      {/* Gallery Grid */}
                      {formData.images.length > 0 && (
                        <div className="pt-2">
                          <h4 className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)] uppercase tracking-widest mb-3">
                            Media Gallery ({formData.images.length}/4)
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {formData.images.map((img, idx) => (
                              <div
                                key={idx}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', idx.toString());
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  const fromIdx = parseInt(
                                    e.dataTransfer.getData('text/plain'),
                                    10,
                                  );
                                  const toIdx = idx;
                                  if (fromIdx === toIdx || isNaN(fromIdx)) return;
                                  setFormData((prev) => {
                                    const newImages = [...prev.images];
                                    const [movedItem] = newImages.splice(fromIdx, 1);
                                    newImages.splice(toIdx, 0, movedItem);
                                    return {
                                      ...prev,
                                      images: newImages,
                                      imageSrc: newImages[0] || '',
                                    };
                                  });
                                  toast.success('Images reordered');
                                }}
                                className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing ${idx === 0 ? 'border-[var(--admin-accent)]' : 'border-[var(--admin-border)]'} group`}
                              >
                                <img
                                  src={img}
                                  className="w-full h-full object-cover"
                                  alt="Gallery"
                                />
                                {idx === 0 && (
                                  <div className="absolute top-1 left-1 bg-[var(--admin-accent)] text-white text-[11px] sm:text-[11px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 pointer-events-none">
                                    Primary
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  {idx !== 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData((prev) => {
                                          const newImages = [...prev.images];
                                          const [movedItem] = newImages.splice(idx, 1);
                                          newImages.unshift(movedItem);
                                          return {
                                            ...prev,
                                            images: newImages,
                                            imageSrc: newImages[0],
                                          };
                                        });
                                        toast.success('Updated primary listing image');
                                      }}
                                      className="w-7 h-7 bg-[var(--admin-surface)] text-[var(--admin-accent)] rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                                      title="Make Primary"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        star
                                      </span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => {
                                        const newImages = prev.images.filter((_, i) => i !== idx);
                                        return {
                                          ...prev,
                                          images: newImages,
                                          imageSrc: newImages[0] || '',
                                        };
                                      });
                                    }}
                                    className="w-7 h-7 bg-[var(--admin-error)] text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                                    title="Delete"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2: CORE DETAILS */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                          Product Info
                        </h2>
                        <p className="text-[11px] text-[var(--admin-text-secondary)]">
                          Detail product info, category, and materials.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAIFill}
                        disabled={isAIGenerating}
                        className="bg-[var(--admin-accent)] text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110 transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
                      >
                        {isAIGenerating ? (
                          <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
                        ) : (
                          <span className="material-symbols-outlined text-[14px]">
                            auto_awesome
                          </span>
                        )}
                        {isAIGenerating ? 'Analyzing Image & Title...' : 'Auto-Fill with AI'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          English Title <span className="text-error">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Product title"
                          className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Telugu Title (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.teluguTitle}
                          onChange={(e) =>
                            setFormData({ ...formData, teluguTitle: e.target.value })
                          }
                          placeholder="సాంప్రదాయ పూజా పీఠం"
                          className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Slug (auto-fills if empty)
                        </label>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          placeholder="vintage-teak-mirror"
                          className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Material
                        </label>
                        <input
                          type="text"
                          value={formData.material}
                          onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                          placeholder="e.g. Teak wood, Pure Brass"
                          className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <div className="flex justify-between items-center h-5 mb-1.5">
                          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                            Category <span className="text-error">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomCategory(!isCustomCategory);
                              setFormData({ ...formData, category: '' });
                            }}
                            className="text-[11px] font-bold text-[var(--admin-accent)] hover:underline cursor-pointer flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              {isCustomCategory ? 'list' : 'add_circle'}
                            </span>
                            {isCustomCategory ? 'Select from list' : 'Add Custom'}
                          </button>
                        </div>
                        {isCustomCategory ? (
                          <input
                            type="text"
                            required
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            placeholder="Traditional Urlis, Brass Lamps"
                            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                          />
                        ) : (
                          <select
                            required
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                          >
                            <option value="">Select Category</option>
                            {categoriesList.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <div className="flex items-center h-5 mb-1.5">
                          <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                            Dimensions (L x W x H)
                          </label>
                        </div>
                        <input
                          type="text"
                          value={formData.dimensions}
                          onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                          placeholder='Dimensions (e.g. 18" x 4" x 24")'
                          className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Product Description
                        </label>
                        <textarea
                          rows={4}
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          placeholder="Enter product description..."
                          className="w-full bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:bg-[var(--admin-surface)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all focus:ring-2 focus:ring-[var(--admin-accent)]/20 resize-none"
                        />
                      </div>
                    </div>

                    {/* Product Personalization Settings */}
                    <div
                      className={`p-4 bg-[var(--admin-bg-subtle)] border rounded-2xl space-y-4 mt-6 transition-all duration-300 ${focusedField === 'isCustomizable' ? 'border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/50 scale-[1.01] shadow-lg' : 'border-[var(--admin-border)]'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
                            Customer Personalization Notes
                          </p>
                          <p className="text-[11px] text-[var(--admin-text-secondary)] mt-1">
                            Allow customers to add custom text (e.g. names, engravings) for this
                            product during checkout.
                          </p>
                        </div>
                        <AdminToggle
                          checked={formData.customizationConfig?.enabled || false}
                          onChange={() =>
                            setFormData((prev) => ({
                              ...prev,
                              customizationConfig: {
                                ...prev.customizationConfig,
                                enabled: !prev.customizationConfig?.enabled,
                              },
                            }))
                          }
                        />
                      </div>

                      {formData.customizationConfig?.enabled && (
                        <div className="space-y-4 pt-2 border-t border-[var(--admin-border)]/50 mt-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                                Input Label
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Name to Print"
                                value={formData.customizationConfig?.label || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    customizationConfig: {
                                      ...prev.customizationConfig,
                                      label: e.target.value,
                                    },
                                  }))
                                }
                                className={`w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border outline-none transition-all duration-300 ${focusedField === 'customizationNote' ? 'border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent)]/50 scale-[1.02] shadow-md' : 'border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40'}`}
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                                Placeholder Text
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Enter name here..."
                                value={formData.customizationConfig?.placeholder || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    customizationConfig: {
                                      ...prev.customizationConfig,
                                      placeholder: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)]/40 transition-all"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                                Max Length (chars)
                              </label>
                              <input
                                type="number"
                                placeholder="500"
                                value={formData.customizationConfig?.maxLength || 500}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    customizationConfig: {
                                      ...prev.customizationConfig,
                                      maxLength: e.target.value,
                                    },
                                  }))
                                }
                                className="w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)]/40 transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                                Required Field?
                              </label>
                              <div className="flex items-center mt-2">
                                <AdminToggle
                                  checked={formData.customizationConfig?.required || false}
                                  onChange={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      customizationConfig: {
                                        ...prev.customizationConfig,
                                        required: !prev.customizationConfig?.required,
                                      },
                                    }))
                                  }
                                />
                                <span className="ml-2 text-[11px] text-[var(--admin-text-secondary)]">
                                  Customers must provide this note to checkout.
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                              Helper Description (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Please double check spelling before submitting."
                              value={formData.customizationConfig?.helperText || ''}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  customizationConfig: {
                                    ...prev.customizationConfig,
                                    helperText: e.target.value,
                                  },
                                }))
                              }
                              className="w-full bg-[var(--admin-surface)] rounded-xl px-4 py-2 text-[12.5px] border border-[var(--admin-border)] outline-none focus:border-[var(--admin-accent)]/40 transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 4: VARIANTS & BADGES */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                          Variants & Tags
                        </h2>
                        <p className="text-[11px] text-[var(--admin-text-secondary)]">
                          Define attributes, variations, and storefront badges.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAIFill}
                        disabled={isAIGenerating}
                        className="bg-[var(--admin-accent)] text-white px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md hover:brightness-110 transition-all active:scale-95 disabled:opacity-70 cursor-pointer"
                      >
                        {isAIGenerating ? (
                          <div className="skeleton-box inline-block w-3.5 h-3.5 rounded-md" />
                        ) : (
                          <span className="material-symbols-outlined text-[14px]">
                            auto_awesome
                          </span>
                        )}
                        {isAIGenerating ? 'Analyzing Curation...' : 'Auto-Fill with AI'}
                      </button>
                    </div>

                    {/* Badge Pill Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Storefront Badges (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={formData.badges}
                          onChange={(e) => setFormData({ ...formData, badges: e.target.value })}
                          placeholder="Best Seller, Heritage Craft"
                          className="w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none border border-transparent focus:border-[var(--admin-accent)]/40 focus:bg-white transition-all "
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          Tags / Collections
                        </label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                          placeholder="e.g. brass, puja, diwali"
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all  ${
                            focusedField === 'tags'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-transparent focus:border-[var(--admin-accent)]/40 focus:bg-white'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Dynamic Variant Constructor */}
                    <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-primary)]">
                        Add Variation Parameter
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <input
                          type="text"
                          placeholder="Attribute (e.g. Wood)"
                          value={newVariant.name}
                          onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                          className="bg-[var(--admin-surface)] rounded-lg px-2.5 py-2.5 text-[12px] border border-[var(--admin-border)] outline-none w-full"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. Rosewood)"
                          value={newVariant.value}
                          onChange={(e) => setNewVariant({ ...newVariant, value: e.target.value })}
                          className="bg-[var(--admin-surface)] rounded-lg px-2.5 py-2.5 text-[12px] border border-[var(--admin-border)] outline-none w-full"
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="+/- Price (₹)"
                          value={newVariant.price}
                          onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
                          className="bg-[var(--admin-surface)] rounded-lg px-2.5 py-2.5 text-[12px] border border-[var(--admin-border)] outline-none w-full"
                        />
                        <button
                          type="button"
                          onClick={handleAddVariant}
                          className="bg-[var(--admin-accent)] text-white text-[11px] sm:text-[11px] font-bold uppercase py-2.5 rounded-lg hover:brightness-110 cursor-pointer w-full transition-transform active:scale-95 shadow-sm"
                        >
                          Add Option
                        </button>
                      </div>

                      {/* Rendered variants list */}
                      {formData.variants.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {formData.variants.map((v) => (
                            <span
                              key={v.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--admin-surface)] border border-[var(--admin-border)] text-[11px] sm:text-[11px] rounded-lg text-[var(--admin-text-primary)] font-medium"
                            >
                              <span className="text-[var(--admin-text-secondary)]">{v.name}:</span>{' '}
                              {v.value}
                              {v.price && (
                                <span className="text-[var(--admin-accent)] font-bold">
                                  (
                                  {Number(v.price) >= 0 ? `+₹${v.price}` : `-₹${Math.abs(v.price)}`}
                                  )
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(v.id)}
                                className="text-[var(--admin-error)] hover:text-[var(--admin-error)] ml-1 flex items-center justify-center cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 5: SEO METADATA */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                        SEO Meta Configuration
                      </h2>
                      <p className="text-[11px] text-[var(--admin-text-secondary)]">
                        Configure title and description for search engines.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          SEO Page Title
                        </label>
                        <input
                          type="text"
                          value={formData.seoTitle}
                          onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                          placeholder="SEO Page Title"
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all  ${
                            focusedField === 'seoTitle'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-transparent focus:border-[var(--admin-accent)]/40 focus:bg-white'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-1.5 block">
                          SEO Meta Description
                        </label>
                        <textarea
                          rows={3}
                          value={formData.seoDescription}
                          onChange={(e) =>
                            setFormData({ ...formData, seoDescription: e.target.value })
                          }
                          placeholder="SEO Meta Description"
                          className={`w-full bg-[var(--admin-bg-subtle)] rounded-xl px-4 py-2.5 text-[12.5px] outline-none transition-all  resize-none ${
                            focusedField === 'seoDescription'
                              ? 'border-2 border-[var(--admin-accent)] shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.01] bg-[var(--admin-surface)]'
                              : 'border border-transparent focus:border-[var(--admin-accent)]/40 focus:bg-white'
                          }`}
                        />
                      </div>

                      {/* Google Search Snippet Live Preview */}
                      <div className="p-4 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-2xl shadow-sm space-y-1.5 text-left font-sans">
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-[11px] text-[#202124]">
                          <span>siriartsandcrafts.com</span>
                          <span className="text-[#5f6368]">
                            {' '}
                            › products › {formData.slug || 'jharokha'}
                          </span>
                        </div>
                        <h4 className="text-[#1a0dab] text-[18px] hover:underline cursor-pointer leading-tight font-medium font-sans">
                          {formData.seoTitle ||
                            formData.title ||
                            'Buy Luxury Handcrafted Traditional Decor Items Online'}
                        </h4>
                        <p className="text-[#4d5156] text-[12.5px] leading-relaxed font-normal">
                          <span className="text-[#70757a]">17 May 2026 — </span>
                          {formData.seoDescription ||
                            formData.description ||
                            'Discover organic handcrafted Urli bowls, Rosewood Jharokha mirrors, traditional brass artifacts for wedding backdrops at Siri Arts.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: PRICING & STOCK */}
                {currentStep === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                        Pricing & Inventory
                      </h2>
                      <p className="text-[11px] text-[var(--admin-text-secondary)]">
                        Define stock and list prices.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                          Curation Price (₹) <span className="text-error">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
                            ₹
                          </span>
                          <input
                            type="number"
                            required
                            min="1"
                            inputMode="decimal"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40 "
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                          Old Striking Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)]/50 text-[13px] font-bold">
                            ₹
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={formData.oldPrice}
                            onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
                            placeholder="Optional list price"
                            className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40 "
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                          Available Stock <span className="text-error">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
                            #
                          </span>
                          <input
                            type="number"
                            required
                            min="0"
                            inputMode="decimal"
                            placeholder="Units"
                            value={formData.stock}
                            onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                            className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-[var(--admin-accent)]/40 "
                          />
                        </div>
                      </div>
                    </div>

                    {formData.stock !== '' && Number(formData.stock) <= 5 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-[11px] sm:text-[11px] text-amber-700 font-semibold">
                        <span className="material-symbols-outlined text-[18px]">warning</span>
                        <span>
                          Stock is below threshold. A 'Low Stock' badge will trigger automatically
                          in the catalog.
                        </span>
                      </div>
                    )}

                    {/* ═══ RENTAL SETTINGS SECTION ═══ */}
                    <div className="border-t border-[var(--admin-border)]/60 pt-5 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowRentalSettings(!showRentalSettings);
                          if (!showRentalSettings && !formData.rentalEnabled)
                            setFormData((prev) => ({ ...prev, rentalEnabled: true }));
                        }}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px] text-indigo-600">
                              event_available
                            </span>
                          </div>
                          <div className="text-left">
                            <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                              Rental Settings
                            </p>
                            <p className="text-[11px] text-[var(--admin-text-secondary)]">
                              {formData.rentalEnabled
                                ? 'Rental is enabled — click to configure'
                                : 'Enable rental for this product'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {formData.rentalEnabled && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                              Active
                            </span>
                          )}
                          <span
                            className={`material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)] transition-transform ${showRentalSettings ? 'rotate-180' : ''}`}
                          >
                            expand_more
                          </span>
                        </div>
                      </button>

                      <AnimatePresence>
                        {showRentalSettings && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 space-y-4">
                              {/* Enable Rental Toggle */}
                              <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between">
                                <div>
                                  <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                                    Enable Rental
                                  </p>
                                  <p className="text-[11px] text-[var(--admin-text-secondary)]">
                                    Allow customers to rent this product
                                  </p>
                                </div>
                                <AdminToggle
                                  checked={formData.rentalEnabled}
                                  onChange={() =>
                                    setFormData({
                                      ...formData,
                                      rentalEnabled: !formData.rentalEnabled,
                                      availabilityMode: !formData.rentalEnabled
                                        ? 'both'
                                        : 'purchase_only',
                                    })
                                  }
                                />
                              </div>

                              {formData.rentalEnabled && (
                                <>
                                  {/* Availability Mode */}
                                  <div className="p-5 bg-white/50 backdrop-blur-sm border border-[var(--admin-border)] rounded-2xl shadow-sm">
                                    <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-3 block flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-[16px]">
                                        category
                                      </span>
                                      Availability Mode
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                      {[
                                        {
                                          v: 'purchase_only',
                                          l: 'Purchase Only',
                                          i: 'shopping_bag',
                                        },
                                        { v: 'rent_only', l: 'Rent Only', i: 'event_available' },
                                        { v: 'both', l: 'Both', i: 'join' },
                                      ].map((opt) => (
                                        <button
                                          key={opt.v}
                                          type="button"
                                          onClick={() =>
                                            setFormData({ ...formData, availabilityMode: opt.v })
                                          }
                                          className={`p-4 rounded-xl border-2 text-center transition-all duration-300 cursor-pointer group ${
                                            formData.availabilityMode === opt.v
                                              ? 'border-transparent bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-200/50 scale-[1.02]'
                                              : 'border-[var(--admin-border)] bg-white text-[var(--admin-text-secondary)] hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5'
                                          }`}
                                        >
                                          <span
                                            className={`material-symbols-outlined text-[24px] block mb-1 transition-transform duration-300 group-hover:scale-110 ${formData.availabilityMode === opt.v ? 'text-white' : ''}`}
                                          >
                                            {opt.i}
                                          </span>
                                          <span
                                            className={`text-[10.5px] font-extrabold uppercase tracking-widest ${formData.availabilityMode === opt.v ? 'text-indigo-50' : ''}`}
                                          >
                                            {opt.l}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Enable Smart Pricing Toggle */}
                                  <div
                                    className={`p-5 rounded-2xl flex items-center justify-between transition-all duration-500 border ${!formData.isManualRentalPricing ? 'bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-200 shadow-inner' : 'bg-white border-[var(--admin-border)]'}`}
                                  >
                                    <div>
                                      <p
                                        className={`text-[13px] font-extrabold flex items-center gap-1.5 ${!formData.isManualRentalPricing ? 'text-indigo-700' : 'text-[var(--admin-text-primary)]'}`}
                                      >
                                        <span
                                          className={`material-symbols-outlined text-[18px] ${!formData.isManualRentalPricing ? 'text-indigo-600 animate-pulse' : ''}`}
                                        >
                                          auto_awesome
                                        </span>{' '}
                                        Smart Rental Pricing
                                      </p>
                                      <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                                        Auto-calculate prices & deposits from product selling price
                                      </p>
                                      {formData.isManualRentalPricing && (
                                        <div className="mt-3 flex items-center gap-3">
                                          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 shadow-sm flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">
                                              warning
                                            </span>{' '}
                                            Manual Override Enabled
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFormData((prev) => ({
                                                ...prev,
                                                isManualRentalPricing: false,
                                              }));
                                              toast.success(
                                                'Smart Pricing re-enabled. Values will auto-calculate based on price.',
                                              );
                                            }}
                                            className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors hover:underline"
                                          >
                                            <span className="material-symbols-outlined text-[14px]">
                                              restart_alt
                                            </span>{' '}
                                            Reset to Smart Pricing
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="scale-110">
                                      <AdminToggle
                                        checked={!formData.isManualRentalPricing}
                                        onChange={() =>
                                          setFormData((prev) => ({
                                            ...prev,
                                            isManualRentalPricing: !prev.isManualRentalPricing,
                                          }))
                                        }
                                      />
                                    </div>
                                  </div>

                                  {/* Rental Pricing */}
                                  <div className="p-5 bg-white border border-[var(--admin-border)] rounded-2xl space-y-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">
                                          payments
                                        </span>
                                        Rental Pricing
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!formData.price)
                                            return toast.error(
                                              'Please enter Product Selling Price first',
                                            );
                                          const calculated = calculateRentalPricing(
                                            formData.price,
                                            formData.category,
                                          );
                                          if (calculated) {
                                            setFormData((prev) => ({
                                              ...prev,
                                              rentalPricing: {
                                                ...prev.rentalPricing,
                                                daily: calculated.daily,
                                                weekly: calculated.weekly,
                                                monthly: calculated.monthly,
                                              },
                                            }));
                                            toast.success('Rental prices auto-calculated');
                                          }
                                        }}
                                        className="text-[10.5px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg shadow-indigo-200/50 px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all transform hover:-translate-y-0.5 active:scale-95"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">
                                          bolt
                                        </span>{' '}
                                        Auto Calculate
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      {[
                                        { k: 'daily', l: 'Daily Rate (₹/day)' },
                                        { k: 'weekly', l: 'Weekly Rate (₹/week)' },
                                        { k: 'monthly', l: 'Monthly Rate (₹/month)' },
                                      ].map((field) => (
                                        <div key={field.k} className="group">
                                          <label className="text-[10.5px] font-extrabold text-[var(--admin-text-tertiary)] uppercase tracking-wider mb-1.5 block">
                                            {field.l}
                                          </label>
                                          <div className="relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-gray-50 border-r border-[var(--admin-border)] rounded-l-xl">
                                              <span className="text-[var(--admin-text-secondary)] text-[14px] font-bold">
                                                ₹
                                              </span>
                                            </div>
                                            <input
                                              type="number"
                                              min="0"
                                              inputMode="decimal"
                                              value={formData.rentalPricing?.[field.k] || ''}
                                              onChange={(e) =>
                                                setFormData((prev) => ({
                                                  ...prev,
                                                  isManualRentalPricing: true,
                                                  rentalPricing: {
                                                    ...prev.rentalPricing,
                                                    [field.k]: e.target.value,
                                                  },
                                                }))
                                              }
                                              placeholder="0"
                                              className="w-full bg-white rounded-xl pl-12 pr-4 py-2.5 text-[14px] font-semibold text-[var(--admin-text-primary)] outline-none border-2 border-[var(--admin-border)] focus:border-indigo-500 transition-colors group-hover:border-indigo-300"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Security Deposit + Refundable */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-5 bg-white border border-[var(--admin-border)] rounded-2xl relative shadow-sm hover:shadow-md transition-shadow group">
                                      <div className="flex items-center justify-between mb-3">
                                        <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider block flex items-center gap-1.5">
                                          <span className="material-symbols-outlined text-[16px]">
                                            lock
                                          </span>
                                          Security Deposit (₹)
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (!formData.price)
                                              return toast.error(
                                                'Please enter Product Selling Price first',
                                              );
                                            const calculated = calculateRentalPricing(
                                              formData.price,
                                              formData.category,
                                            );
                                            if (calculated) {
                                              setFormData((prev) => ({
                                                ...prev,
                                                securityDeposit: calculated.securityDeposit,
                                              }));
                                              toast.success('Security deposit auto-calculated');
                                            }
                                          }}
                                          className="text-[10.5px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md hover:shadow-lg shadow-amber-200/50 px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all transform hover:-translate-y-0.5 active:scale-95"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">
                                            lock_reset
                                          </span>{' '}
                                          Auto Calculate
                                        </button>
                                      </div>
                                      <div className="relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center bg-gray-50 border-r border-[var(--admin-border)] rounded-l-xl">
                                          <span className="text-[var(--admin-text-secondary)] text-[14px] font-bold">
                                            ₹
                                          </span>
                                        </div>
                                        <input
                                          type="number"
                                          min="0"
                                          inputMode="decimal"
                                          value={formData.securityDeposit}
                                          onChange={(e) =>
                                            setFormData((prev) => ({
                                              ...prev,
                                              isManualRentalPricing: true,
                                              securityDeposit: e.target.value,
                                            }))
                                          }
                                          placeholder="e.g. 500"
                                          className="w-full bg-white rounded-xl pl-12 pr-4 py-2.5 text-[14px] font-semibold text-[var(--admin-text-primary)] outline-none border-2 border-[var(--admin-border)] focus:border-amber-500 transition-colors group-hover:border-amber-300"
                                        />
                                      </div>
                                    </div>
                                    <div className="p-5 bg-white border border-[var(--admin-border)] rounded-2xl flex items-center justify-between shadow-sm">
                                      <div>
                                        <p className="text-[13px] font-extrabold text-[var(--admin-text-primary)] flex items-center gap-1.5">
                                          <span className="material-symbols-outlined text-[18px] text-emerald-600">
                                            currency_exchange
                                          </span>{' '}
                                          Refundable Deposit
                                        </p>
                                        <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
                                          Refund deposit back to customer after successful return
                                        </p>
                                      </div>
                                      <div className="scale-110">
                                        <AdminToggle
                                          checked={formData.isDepositRefundable}
                                          onChange={() =>
                                            setFormData({
                                              ...formData,
                                              isDepositRefundable: !formData.isDepositRefundable,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Rental Inventory + Duration Limits */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                                      <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                                        Rental Stock
                                      </label>
                                      <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-secondary)] text-[13px] font-bold">
                                          #
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          inputMode="numeric"
                                          value={formData.rentalStock}
                                          onChange={(e) =>
                                            setFormData({
                                              ...formData,
                                              rentalStock: e.target.value,
                                            })
                                          }
                                          placeholder="Units for rent"
                                          className="w-full bg-[var(--admin-surface)] rounded-xl pl-7 pr-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-indigo-400"
                                        />
                                      </div>
                                    </div>
                                    <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                                      <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                                        Min Rental Days
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        inputMode="numeric"
                                        value={formData.rentalMinDays}
                                        onChange={(e) =>
                                          setFormData({
                                            ...formData,
                                            rentalMinDays: e.target.value,
                                          })
                                        }
                                        className="w-full bg-[var(--admin-surface)] rounded-xl px-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-indigo-400"
                                      />
                                    </div>
                                    <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl">
                                      <label className="text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2 block">
                                        Max Rental Days
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        inputMode="numeric"
                                        value={formData.rentalMaxDays}
                                        onChange={(e) =>
                                          setFormData({
                                            ...formData,
                                            rentalMaxDays: e.target.value,
                                          })
                                        }
                                        className="w-full bg-[var(--admin-surface)] rounded-xl px-3 py-2 text-[13px] outline-none border border-[var(--admin-border)] focus:border-indigo-400"
                                      />
                                    </div>
                                  </div>

                                  {/* Smart Recommendation Panel */}
                                  {formData.price && (
                                    <div className="p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-100 rounded-2xl mt-6 shadow-sm overflow-hidden relative">
                                      {/* Decorative blur elements */}
                                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-200/40 rounded-full blur-3xl"></div>
                                      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-200/40 rounded-full blur-3xl"></div>

                                      <div className="relative z-10">
                                        <div className="flex items-center gap-2.5 mb-4">
                                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-emerald-700 text-[18px]">
                                              workspace_premium
                                            </span>
                                          </div>
                                          <h4 className="text-[14px] font-extrabold text-emerald-900 tracking-wide">
                                            Smart Rental Recommendations
                                          </h4>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                          {(() => {
                                            const rec = calculateRentalPricing(
                                              formData.price,
                                              formData.category,
                                            );
                                            if (!rec) return null;
                                            const roi =
                                              ((rec.monthly * 12) / Number(formData.price)) * 100;
                                            let profitCategory = 'Fair';
                                            if (roi >= 200) profitCategory = 'Excellent';
                                            else if (roi >= 100) profitCategory = 'Good';
                                            return (
                                              <>
                                                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 text-center shadow-sm hover:shadow-md transition-shadow">
                                                  <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mb-0.5">
                                                    Daily
                                                  </p>
                                                  <p className="text-[15px] font-black text-emerald-950">
                                                    ₹{rec.daily.toLocaleString()}
                                                  </p>
                                                </div>
                                                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 text-center shadow-sm hover:shadow-md transition-shadow">
                                                  <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mb-0.5">
                                                    Weekly
                                                  </p>
                                                  <p className="text-[15px] font-black text-emerald-950">
                                                    ₹{rec.weekly.toLocaleString()}
                                                  </p>
                                                </div>
                                                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 text-center shadow-sm hover:shadow-md transition-shadow">
                                                  <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mb-0.5">
                                                    Monthly
                                                  </p>
                                                  <p className="text-[15px] font-black text-emerald-950">
                                                    ₹{rec.monthly.toLocaleString()}
                                                  </p>
                                                </div>
                                                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 text-center shadow-sm hover:shadow-md transition-shadow">
                                                  <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mb-0.5">
                                                    Deposit
                                                  </p>
                                                  <p className="text-[15px] font-black text-emerald-950">
                                                    ₹{rec.securityDeposit.toLocaleString()}
                                                  </p>
                                                </div>
                                                <div className="col-span-2 sm:col-span-4 bg-white/90 p-3 rounded-xl text-center mt-2 flex justify-center items-center gap-3 border border-white shadow-sm">
                                                  <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-widest">
                                                    Estimated Profitability:
                                                  </span>
                                                  <span
                                                    className={`text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-widest shadow-sm border ${profitCategory === 'Excellent' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white border-emerald-500' : profitCategory === 'Good' ? 'bg-gradient-to-r from-teal-400 to-teal-500 text-white border-teal-500' : 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 border-gray-300'}`}
                                                  >
                                                    {profitCategory}
                                                  </span>
                                                </div>
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* STEP 6: REVIEW & PUBLISH */}
                {currentStep === 5 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                        Validation & Curation
                      </h2>
                      <p className="text-[11px] text-[var(--admin-text-secondary)]">
                        Review details and set visibility preferences before publishing.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Visibility Status Toggle */}
                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                            Visibility Status
                          </p>
                          <p className="text-[11px] text-[var(--admin-text-secondary)]">
                            Controls visible storefront availability
                          </p>
                        </div>
                        <select
                          value={formData.isActive ? 'active' : 'draft'}
                          onChange={(e) =>
                            setFormData({ ...formData, isActive: e.target.value === 'active' })
                          }
                          className="bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl px-3 py-1.5 text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)] cursor-pointer outline-none"
                        >
                          <option value="active">Active (Visible)</option>
                          <option value="draft">Draft (Private)</option>
                        </select>
                      </div>

                      {/* Curation Highlight Toggle */}
                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                            Featured Collection
                          </p>
                          <p className="text-[11px] text-[var(--admin-text-secondary)]">
                            Pin to Homepage Hero Carousel
                          </p>
                        </div>
                        <AdminToggle
                          checked={formData.featured}
                          onChange={() =>
                            setFormData({ ...formData, featured: !formData.featured })
                          }
                        />
                      </div>

                      {/* Show in Gallery Toggle */}
                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between col-span-1 sm:col-span-2">
                        <div>
                          <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                            Show in Gallery Also
                          </p>
                          <p className="text-[11px] text-[var(--admin-text-secondary)]">
                            Automatically sync and display this product in the Inspiration Gallery
                          </p>
                        </div>
                        <AdminToggle
                          checked={formData.showInGallery}
                          onChange={() =>
                            setFormData({ ...formData, showInGallery: !formData.showInGallery })
                          }
                        />
                      </div>

                      {/* Non-Refundable Item Toggle */}
                      <div className="p-4 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl flex items-center justify-between col-span-1 sm:col-span-2">
                        <div>
                          <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                            Non-Refundable Item
                          </p>
                          <p className="text-[11px] text-[var(--admin-text-secondary)]">
                            Customers cannot request returns or refunds for this product after
                            purchase.
                          </p>
                        </div>
                        <AdminToggle
                          checked={formData.isNonRefundable}
                          onChange={() =>
                            setFormData({ ...formData, isNonRefundable: !formData.isNonRefundable })
                          }
                        />
                      </div>

                      {/* Summary Data Review list */}
                      <div className="col-span-1 sm:col-span-2 p-5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] rounded-2xl space-y-4 text-[12px]">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)] border-b border-[var(--admin-border)]/60 pb-1.5 mb-2">
                          Curation Credentials Summary
                        </p>
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              English Title
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              {formData.title}
                            </span>
                          </div>
                          {formData.teluguTitle && (
                            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                                Telugu Title
                              </span>
                              <span className="font-semibold text-[var(--admin-text-primary)] sm:text-right">
                                {formData.teluguTitle}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              Category
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              {formData.category || 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              Retail Price
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              ₹{Number(formData.price || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              Stock Quantity
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              {formData.stock || 0} Units
                            </span>
                          </div>
                          {formData.material && (
                            <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                              <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                                Core Material
                              </span>
                              <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                                {formData.material}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:justify-between border-b border-[var(--admin-border)]/40 pb-2 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              Featured
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              {formData.featured ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between pb-1 gap-1">
                            <span className="font-semibold text-[var(--admin-text-secondary)] uppercase tracking-wider text-[11px]">
                              Show in Gallery
                            </span>
                            <span className="font-bold text-[var(--admin-text-primary)] sm:text-right">
                              {formData.showInGallery ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                disabled={isLoading}
                className="px-7 py-3 bg-[var(--admin-accent)] text-white rounded-full text-[12px] font-bold uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="skeleton-box inline-block w-4 h-4 rounded-md" />
                    Saving Curation...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-white">
                      done_all
                    </span>
                    {isEditMode ? 'Update Curation' : 'Publish to Shop'}
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
              Real-time catalog rendition of your craft product
            </p>
          </div>

          {/* Luxury Card Rendering */}
          <div className="bg-[var(--admin-surface)] rounded-3xl overflow-hidden border border-[var(--admin-border)]/60 shadow-[var(--admin-shadow-sm)] group relative">
            {/* Badges Overlay */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
              {formData.badges &&
                formData.badges
                  .split(',')
                  .map((b) => b.trim())
                  .filter(Boolean)
                  .map((b, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-[11px] sm:text-[11px] font-bold uppercase tracking-widest bg-[var(--admin-accent)] text-white shadow-sm"
                    >
                      {b}
                    </span>
                  ))}
              {formData.featured && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-[11px] sm:text-[11px] font-bold uppercase tracking-widest bg-[var(--admin-accent)] text-white shadow-sm flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[11px] fill-current">star</span>
                  Featured
                </span>
              )}
            </div>

            {/* Availability Badges Overlay */}
            <div className="absolute top-3 right-3 z-10">
              {formData.stock !== '' && Number(formData.stock) === 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-sm">
                  Sold Out
                </span>
              ) : formData.stock !== '' && Number(formData.stock) <= 5 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm">
                  Low Stock
                </span>
              ) : null}
            </div>

            {/* Card Thumbnail */}
            <div className="aspect-[4/3] bg-[var(--admin-bg-subtle)] relative overflow-hidden">
              {formData.imageSrc ? (
                <img
                  src={formData.imageSrc}
                  alt={formData.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--admin-text-secondary)]/40">
                  <span className="material-symbols-outlined text-[36px] mb-2">add_a_photo</span>
                  <span className="text-[11px] sm:text-[11px] sm:text-[11px] font-bold uppercase tracking-widest">
                    Image Preview Canvas
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Gallery Indicators (Tiny previews) */}
            {formData.images.length > 0 && (
              <div className="flex gap-1.5 px-4 pt-3 shrink-0">
                {formData.images.filter(Boolean).map((img, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-lg overflow-hidden border border-[var(--admin-border)] cursor-pointer hover:border-[var(--admin-accent)]"
                  >
                    <img
                      src={img}
                      alt="Traditional wedding event decoration"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Product Body */}
            <div className="p-4 space-y-2">
              <span className="text-[11px] sm:text-[11px] sm:text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--admin-accent)]">
                {formData.category || 'Category Unassigned'}
              </span>

              <div>
                <h3 className="text-[14.5px]  font-bold text-[var(--admin-text-primary)] truncate">
                  {formData.title || 'Traditional Sanskriti Masterpiece'}
                </h3>
                {formData.teluguTitle && (
                  <p className="text-[11px] sm:text-[11px]  text-[var(--admin-text-secondary)]/90 italic mt-0.5 truncate">
                    {formData.teluguTitle}
                  </p>
                )}
              </div>

              {formData.material && (
                <div className="flex items-center gap-1 text-[11px] text-[var(--admin-text-secondary)] font-medium bg-[var(--admin-bg-subtle)] px-2 py-1 rounded-lg w-max border border-[var(--admin-border)]/40">
                  <span className="material-symbols-outlined text-[12px] text-[var(--admin-accent)]">
                    auto_awesome
                  </span>
                  <span>{formData.material}</span>
                </div>
              )}

              {/* Price Tag Row */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--admin-border)]/40 mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[16px]  font-extrabold text-[var(--admin-text-primary)]">
                    ₹{Number(formData.price || 0).toLocaleString()}
                  </span>
                  {formData.oldPrice && (
                    <span className="text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]/50 line-through">
                      ₹{Number(formData.oldPrice).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[13px] text-[var(--admin-accent)] fill-current">
                    star
                  </span>
                  <span className="text-[11px] font-bold text-[var(--admin-text-primary)]">
                    4.9
                  </span>
                  <span className="text-[11px] sm:text-[11px] sm:text-[11px] text-[var(--admin-text-secondary)]">
                    (12 reviews)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SaaS AI Curation HUD Overlay Modal */}
      {showAIHUD && aiAnalysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[var(--admin-bg-subtle)] border border-[var(--admin-accent)]/40 max-w-xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]  relative">
            {/* Luxury Header */}
            <div className="bg-[var(--admin-text-primary)] p-5 text-white flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white animate-pulse">
                  auto_awesome
                </span>
                <div className="text-left">
                  <h3 className="text-[13px] font-bold uppercase tracking-wider text-white">
                    Groq Llama 4 Curation Analysis
                  </h3>
                  <p className="text-[11px] sm:text-[11px] sm:text-[11px] text-[var(--admin-text-tertiary)]">
                    Rigorous 4-Stage Multimodal Craft Curation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAIHUD(false)}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Dashboard Panel */}
            <div className="p-6 overflow-y-auto space-y-5 text-left text-[var(--admin-text-primary)]">
              {/* Top Classification Row: Object + Confidence Score */}
              <div className="flex items-center justify-between bg-[var(--admin-surface)] p-4 rounded-2xl border border-[var(--admin-border)] shadow-sm">
                <div>
                  <p className="text-[11px] sm:text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-secondary)] uppercase tracking-wider">
                    Detected Object Class
                  </p>
                  <h4 className="text-[17px] font-bold text-[var(--admin-text-primary)] flex items-center gap-1.5 mt-0.5">
                    <span className="material-symbols-outlined text-[var(--admin-accent)] text-[18px]">
                      workspace_premium
                    </span>
                    {aiAnalysisResult.detected_object || 'Unidentified Curation'}
                  </h4>
                </div>

                {/* Confidence circular indicator */}
                <div className="flex flex-col items-center">
                  <div className="relative w-14 h-14 flex items-center justify-center rounded-full bg-amber-50 border-2 border-amber-500/30 shadow-inner">
                    <span className="text-[13px] font-extrabold text-amber-600">
                      {aiAnalysisResult.confidence || 85}%
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-amber-600 uppercase tracking-widest mt-1">
                    Confidence
                  </p>
                </div>
              </div>

              {/* Titles Block */}
              <div className="space-y-3">
                <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Generated English Title
                  </span>
                  <p className="text-[12.5px] font-bold text-[var(--admin-text-primary)]">
                    {aiAnalysisResult.english_title}
                  </p>
                </div>
                <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Natural Telugu Curation
                  </span>
                  <p className="text-[13px] font-bold text-[var(--admin-text-primary)]  TeluguScript">
                    {aiAnalysisResult.telugu_title}
                  </p>
                </div>
              </div>

              {/* Attribute Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Category Mapped
                  </span>
                  <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg text-[11px] sm:text-[11px] font-bold border border-purple-200">
                    <span className="material-symbols-outlined text-[11px] sm:text-[11px]">
                      category
                    </span>
                    {aiAnalysisResult.category || 'General Decor'}
                  </div>
                </div>

                {/* Occasion / Style */}
                <div className="p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Style & Theme
                  </span>
                  <p className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)]">
                    {aiAnalysisResult.style || 'Traditional Indian'}
                  </p>
                </div>

                {/* Materials Chips */}
                <div className="col-span-2 p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-2 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Auto-Detected Craft Materials
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(aiAnalysisResult.materials || []).map((m, idx) => (
                      <span
                        key={idx}
                        className="bg-amber-50 text-[var(--admin-accent)] px-2.5 py-0.5 rounded-full text-[11px] sm:text-[11px] font-bold border border-[var(--admin-accent)]/20 flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-accent)]" />
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Color Palette */}
                <div className="col-span-2 p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-2 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Color Palette Extracted
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {(aiAnalysisResult.colors || []).map((c, idx) => {
                      const colorMap = {
                        gold: '#FFD700',
                        green: '#1b4d3e',
                        red: '#c62828',
                        maroon: '#5d001e',
                        ivory: '#fbf6eb',
                        yellow: '#fbc02d',
                        pink: '#f06292',
                        brass: '#000000',
                        bronze: '#cd7f32',
                      };
                      const hex = colorMap[c.toLowerCase()] || '#64748B';
                      const isLight = c.toLowerCase() === 'ivory';
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-[var(--admin-bg-subtle)] border border-[var(--admin-border)] px-2.5 py-1 rounded-xl shadow-sm"
                        >
                          <span
                            className={`w-3 h-3 rounded-full shadow-inner border ${isLight ? 'border-[var(--admin-border-strong)]' : 'border-transparent'}`}
                            style={{ backgroundColor: hex }}
                          />
                          <span className="text-[11px] sm:text-[11px] font-bold text-[var(--admin-text-primary)] capitalize">
                            {c}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Customization Note */}
                {aiAnalysisResult.isCustomizable && (
                  <div className="col-span-2 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wider block">
                        Auto-Detected Personalization
                      </span>
                      <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">check_circle</span>
                        Enabled
                      </span>
                    </div>
                    <p className="text-[12px] text-blue-900 font-medium">
                      Label:{' '}
                      <span className="font-bold italic">
                        "{aiAnalysisResult.customizationNote}"
                      </span>
                    </p>
                  </div>
                )}

                {/* Tags Generation */}
                <div className="col-span-2 p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-2 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    SEO Collections & Search Tags
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(aiAnalysisResult.tags || []).map((t, idx) => (
                      <span
                        key={idx}
                        className="bg-[var(--admin-surface-muted)] text-[var(--admin-text-secondary)] px-2 py-0.5 rounded-lg text-[11px] sm:text-[11px] sm:text-[11px] font-semibold border border-[var(--admin-border)]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="col-span-2 p-3.5 bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl space-y-1.5 shadow-sm">
                  <span className="text-[11px] font-extrabold text-[var(--admin-text-secondary)] uppercase tracking-wider block">
                    Premium Curation Description
                  </span>
                  <p className="text-[11px] sm:text-[11px] text-[#555] leading-relaxed italic">
                    "{aiAnalysisResult.description}"
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Box for AI Refinement */}
            <div className="px-6 pb-2">
              <form
                onSubmit={handleAiChatSubmit}
                className="flex items-center gap-2 bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-xl p-1.5 focus-within:border-[var(--admin-accent)]/50 transition-colors"
              >
                <input
                  type="text"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  placeholder="Ask AI to change title, category, style, etc..."
                  className="flex-1 bg-transparent !border-none text-[12px] text-[var(--admin-text-primary)] placeholder-[var(--admin-text-tertiary)] px-3 py-1.5 focus:outline-none focus:!border-none focus:!outline-none focus:!ring-0"
                  disabled={isAILearning}
                />
                <button
                  type="submit"
                  disabled={!aiChatInput.trim() || isAILearning}
                  className="bg-[var(--admin-accent)] text-white p-1.5 rounded-lg flex items-center justify-center disabled:opacity-50 cursor-pointer hover:brightness-110 transition-all"
                >
                  {isAILearning ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      refresh
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px] pr-0.5">send</span>
                  )}
                </button>
              </form>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-[var(--admin-bg-subtle)] border-t border-[var(--admin-border)] flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowAIHUD(false)}
                className="w-full sm:flex-1 border border-[var(--admin-border)] text-[var(--admin-text-secondary)] py-2.5 rounded-xl text-[11px] sm:text-[11px] font-bold hover:bg-white transition-colors cursor-pointer"
              >
                Manual Correction / Reject
              </button>

              <button
                type="button"
                onClick={handleApplyAISpecs}
                className="w-full sm:flex-1 bg-[var(--admin-accent)] text-white py-2.5 rounded-xl text-[11px] sm:text-[11px] font-bold shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px] animate-bounce">
                  published_with_changes
                </span>
                Apply AI Curation
              </button>
            </div>
          </div>
        </div>
      )}

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
