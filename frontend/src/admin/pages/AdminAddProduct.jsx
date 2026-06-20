import React, { useState, useEffect, useMemo } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ProductMediaStep } from './steps/ProductMediaStep';
import { ProductInfoStep } from './steps/ProductInfoStep';
import { ProductPricingStep } from './steps/ProductPricingStep';
import { AdminToggle, SkeletonForm } from '../components/AdminUIKit';
import { LivePreviewCard } from '../components/LivePreviewCard';
import { AiCurationOverlay } from '../components/AiCurationOverlay';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';
import { DraftConflictViewer } from '../components/DraftConflictViewer';
import { useNavigate, useParams } from 'react-router-dom';
import { productCategories } from '../data/adminData';
import { productService, uploadService } from '../../services/domainServices';
import { useAdmin } from '../context/AdminContext';
import toast from 'react-hot-toast';
import { compressImage, formatBytes } from '../../utils/imageCompressor';
import { useDraft } from '../hooks/useDraft';
import { useProductAI } from '../hooks/useProductAI';
import { useProductValidation } from '../hooks/useProductValidation';
import { useProductSubmission } from '../hooks/useProductSubmission';
import { useQueryClient } from '@tanstack/react-query';
import logger from '../../utils/logger';

const _fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
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
  const queryClient = useQueryClient();
  const id = editId || routeId;
  const navigate = useNavigate();
  const { refreshProducts } = useAdmin();
  const isEditMode = Boolean(id);

  const [mobileTab, setMobileTab] = useState('form');
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionStats, setCompressionStats] = useState([]);

  const [categoriesList, setCategoriesList] = useState(productCategories);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

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
  } = useProductAI({ formData, setFormData, categoriesList, setCategoriesList, setCurrentStep });

  // Load dynamic categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await productService.getAll({ limit: 150 });
        if (res.success && res.data && res.data.products) {
          const dbCategories = res.data.products.map((p) => p.category).filter(Boolean);
          setCategoriesList((_prev) => {
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
                {/* STEP 2: CORE DETAILS */}
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
                  />
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
                  <ProductPricingStep
                    formData={formData}
                    setFormData={setFormData}
                    showRentalSettings={showRentalSettings}
                    setShowRentalSettings={setShowRentalSettings}
                  />
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
      </div>

      <LivePreviewCard formData={formData} mobileTab={mobileTab} />

      <AiCurationOverlay
        showAIHUD={showAIHUD}
        setShowAIHUD={setShowAIHUD}
        aiAnalysisResult={aiAnalysisResult}
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
