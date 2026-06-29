import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCategories } from '../../hooks/useProductQueries';
import { useDraft } from './useDraft';
import { productService } from '../../services/domainServices';
import toast from 'react-hot-toast';

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

export function useProductForm({ id, isEditMode }) {
  const { data: dbCategories = [] } = useCategories();
  const [categoriesList, setCategoriesList] = useState([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRentalSettings, setShowRentalSettings] = useState(false);

  const initialData = useMemo(
    () => ({
      title: '',
      teluguTitle: '',
      customerNote: '',
      complimentaryGift: {
        enabled: false,
        name: '',
        quantity: 1,
        description: '',
        displayBadge: '',
      },
      slug: '',
      primaryCategory: '',
      secondaryCategories: [],
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
      returnSettings: {
        isReturnable: false,
        returnWindowDays: 7,
        restockingFeePercentage: 0,
        isExchangeable: false,
        exchangeWindowDays: 7,
        requiresInspection: true,
      },
    }),
    [],
  );

  const initialPageState = useMemo(() => ({ activeStep: 0 }), []);

  const draftConfig = useDraft({
    draftKey: isEditMode ? `admin:products:edit:${id}` : 'admin:products:add',
    module: 'Products',
    pageTitle: isEditMode ? `Edit Product ${id}` : 'New Product',
    initialData,
    initialPageState,
    enabled: true,
  });

  const { formData, setFormData, pageState, setPageState } = draftConfig;
  const currentStep = pageState.activeStep || 0;
  const setCurrentStep = useCallback(
    (step) => setPageState((prev) => ({ ...prev, activeStep: step })),
    [setPageState],
  );

  useEffect(() => {
    if (dbCategories.length > 0) {
      setCategoriesList([...dbCategories].sort());
    }
  }, [dbCategories]);

  useEffect(() => {
    if (isEditMode) {
      const fetchProduct = async () => {
        setIsLoading(true);
        try {
          const res = await productService.getById(id);
          if (res.success) {
            const p = res.data;
            const pCatName = p.primaryCategory?.name || p.primaryCategory || '';
            if (pCatName && !dbCategories.includes(pCatName)) {
              setCategoriesList((prev) => Array.from(new Set([...prev, pCatName])).sort());
            }
            const pSecCats = (p.secondaryCategories || []).map((c) => c.name || c);
            const dbImages = Array.isArray(p.images) ? p.images : [];
            const allImages = [p.imageSrc, ...dbImages].filter(
              (img) => typeof img === 'string' && img.trim() !== '',
            );
            const finalImages = Array.from(new Set(allImages)); // Remove duplicates
            const finalImageSrc = finalImages[0] || '';

            setFormData({
              title: p.title || p.name || '',
              teluguTitle: p.teluguTitle || p.nameTE || '',
              customerNote: p.customerNote || '',
              complimentaryGift: p.complimentaryGift || {
                enabled: false,
                name: '',
                quantity: 1,
                description: '',
                displayBadge: '',
              },
              slug: p.slug || '',
              primaryCategory: pCatName,
              secondaryCategories: pSecCats,
              material: p.material || '',
              tags: p.tags ? p.tags.join(',') : '',
              price: p.price || '',
              oldPrice: p.oldPrice || '',
              stock: p.stock !== undefined ? p.stock : '',
              imageSrc: finalImageSrc,
              images: finalImages,
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
              returnSettings: p.returnSettings || {
                isReturnable: false,
                returnWindowDays: 7,
                restockingFeePercentage: 0,
                isExchangeable: false,
                exchangeWindowDays: 7,
                requiresInspection: true,
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
    } else {
      setFormData(initialData);
      setCurrentStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditMode, dbCategories]);

  // Smart Rental Pricing Auto-calculation
  useEffect(() => {
    if (!formData.isManualRentalPricing && formData.rentalEnabled && formData.price) {
      const calculated = calculateRentalPricing(formData.price, formData.primaryCategory);
      if (calculated) {
        setFormData((prev) => {
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
  }, [
    formData.price,
    formData.primaryCategory,
    formData.isManualRentalPricing,
    formData.rentalEnabled,
    setFormData,
  ]);

  return {
    isLoading,
    setIsLoading,
    categoriesList,
    setCategoriesList,
    isCustomCategory,
    setIsCustomCategory,
    showRentalSettings,
    setShowRentalSettings,
    currentStep,
    setCurrentStep,
    ...draftConfig,
  };
}
