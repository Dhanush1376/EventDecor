import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { customOrderService } from '../services/domainServices';

export function useCustomOrderSubmission({
  user,
  runProtectedAction,
  wizardDraft,
  linkedProduct,
  customizationFields,
  setWizardDraft,
  setCustomOccasionText,
  setCustomProductTypeText,
  setPastedLink,
  setCustomizationFields,
  setCurrentStep,
  loadWorkspaceData,
  setActiveTab,
}) {
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleWizardSubmit = async () => {
    if (isSubmittingRef.current) return;

    runProtectedAction(async () => {
      // Validation checks
      if (!wizardDraft.occasion || wizardDraft.occasion === 'Other') {
        return toast.error('Please select or specify your occasion');
      }
      if (!wizardDraft.productType || wizardDraft.productType === 'Other') {
        return toast.error('Please select or specify your product category');
      }
      if (!wizardDraft.customerName) {
        return toast.error('Please fill in your contact name');
      }
      if (!wizardDraft.customerPhone) {
        return toast.error('Please fill in your contact phone number');
      }

      isSubmittingRef.current = true;
      setLoading(true);

      try {
        const payload = {
          ...wizardDraft,
          budget: Number((wizardDraft.budget || '').toString().replace(/[^0-9]/g, '')) || undefined,
        };

        // If the user context is stale due to a fresh login modal, the backend automatically
        // resolves the email from token claims, but let's pass it if available.
        if (user?.email) {
          payload.customerEmail = user.email;
        }

        if (linkedProduct) {
          payload.productId = linkedProduct._id || linkedProduct.id;
          payload.productSnapshot = {
            productId: linkedProduct._id || linkedProduct.id,
            title: linkedProduct.title,
            imageSrc: linkedProduct.imageSrc,
            category: linkedProduct.category,
            price: linkedProduct.price,
            description: linkedProduct.description,
          };
          payload.customizationData = Object.entries(customizationFields || {}).map(
            ([key, value]) => {
              let fieldType = 'text';
              if (key.toLowerCase().includes('color')) {
                fieldType = 'color';
              } else if (Array.isArray(value)) {
                fieldType = 'multiselect';
              } else if (typeof value === 'number') {
                fieldType = 'number';
              }
              return {
                fieldName: key,
                fieldType,
                value: value,
              };
            },
          );
        }

        const res = await customOrderService.create(payload);
        if (res.success) {
          toast.success('Your custom order request has been submitted successfully!');
          setWizardDraft({
            occasion: '',
            productType: '',
            inspirationImages: [],
            customRequirements: '',
            budget: '',
            quantity: 1,
            eventDate: '',
            city: '',
            bookingType: 'Video Meet',
            customerName: '',
            customerPhone: '',
            customerEmail: '',
          });
          setCustomOccasionText('');
          setCustomProductTypeText('');
          if (typeof setPastedLink === 'function') setPastedLink('');
          setCustomizationFields({});
          setCurrentStep(1);
          loadWorkspaceData();
          setActiveTab('tracker');
        } else {
          toast.error(res.message || 'Failed to submit request');
        }
      } catch (err) {
        toast.error('Failed to submit custom order request');
      } finally {
        isSubmittingRef.current = false;
        setLoading(false);
      }
    });
  };

  return {
    loading,
    isSubmittingRef,
    handleWizardSubmit,
  };
}
