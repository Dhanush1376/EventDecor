import { useState, useEffect } from 'react';
import { useDraft } from './useDraft';
import { showcaseService } from '../../services/domainServices';
import api from '../../services/api';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';

export const WIZARD_STEPS = [
  { id: 'media', label: 'Media & Imagery', icon: 'photo_library' },
  { id: 'details', label: 'Basic Info', icon: 'info' },
  { id: 'aesthetics', label: 'Aesthetics & Props', icon: 'tune' },
  { id: 'description', label: 'Narrative', icon: 'edit_note' },
  { id: 'seo', label: 'SEO Configuration', icon: 'search' },
  { id: 'review', label: 'Review & Publish', icon: 'verified' },
];

export function useShowcaseForm({ id, isEditMode, navigate }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mobileTab, setMobileTab] = useState('form');
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [categories, setCategories] = useState([]);

  const draftContext = useDraft({
    draftKey: isEditMode ? `admin:showcases:edit:${id}` : 'admin:showcases:add',
    module: 'Showcases',
    pageTitle: isEditMode ? `Edit Showcase ${id}` : 'New Showcase',
    initialData: {
      title: '',
      subtitle: '',
      category: '',
      rentalPrice: '',
      description: '',
      image: '',
      galleryImages: ['', ''],
      inclusionsText: '',
      inclusions: [],
      colorPalette: '',
      suggestedProps: '',
      setupTimeHours: '',
      seoTitle: '',
      seoDescription: '',
      featured: false,
      showInGallery: false,
      isActive: true,
    },
    initialPageState: { activeStep: 0, mobileTab: 'form' },
    enabled: true,
  });

  const { formData, setFormData, pageState, setPageState } = draftContext;

  // Sync state
  useEffect(() => {
    if (pageState.activeStep !== undefined) setCurrentStep(pageState.activeStep);
    if (pageState.mobileTab !== undefined) setMobileTab(pageState.mobileTab);
  }, [pageState]);

  // Fetch Existing Data for Edit Mode
  useEffect(() => {
    if (isEditMode) {
      const fetchShowcase = async () => {
        try {
          const res = await showcaseService.getById(id);
          if (res.success && res.data) {
            const sc = res.data;
            setFormData({
              title: sc.title || '',
              subtitle: sc.subtitle || '',
              category: sc.category || 'engagement_gift',
              rentalPrice: sc.rentalPrice || 15000,
              description: sc.description || '',
              image: sc.image || '',
              galleryImages:
                sc.gallery && sc.gallery.length > 0
                  ? [...sc.gallery, '', ''].slice(0, 2)
                  : ['', ''],
              inclusionsText: '',
              inclusions: sc.inclusions
                ? sc.inclusions.map((i, idx) => ({ ...i, id: i._id || i.id || Date.now() + idx }))
                : [],
              colorPalette: sc.colorPalette ? sc.colorPalette.join(', ') : '',
              suggestedProps: sc.suggestedProps ? sc.suggestedProps.join(', ') : '',
              setupTimeHours: sc.setupTimeHours || 2,
              seoTitle: sc.seoTitle || '',
              seoDescription: sc.seoDescription || '',
              featured: sc.featured || false,
              showInGallery: sc.showInGallery || false,
              isActive: sc.isActive !== undefined ? sc.isActive : true,
            });
          } else {
            toast.error('Showcase design not found');
            navigate('/admin/events');
          }
        } catch (_err) {
          toast.error('Failed to load design details');
          navigate('/admin/events');
        } finally {
          setIsLoading(false);
        }
      };
      fetchShowcase();
    }
  }, [id, isEditMode, navigate, setFormData]);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories/active?type=event');
        if (res.data && res.data.success) {
          setCategories(res.data.data);
        }
      } catch (err) {
        logger.error('Failed to fetch categories', err);
      }
    };
    fetchCategories();
  }, []);

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
      setPageState((prev) => ({ ...prev, activeStep: currentStep + 1 }));
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setPageState((prev) => ({ ...prev, activeStep: currentStep - 1 }));
    }
  };

  return {
    ...draftContext,
    currentStep,
    setCurrentStep,
    mobileTab,
    setMobileTab,
    isLoading,
    categories,
    setCategories,
    getStepErrors,
    isStepValid,
    handleNext,
    handlePrev,
  };
}
