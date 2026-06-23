import { useState } from 'react';
import { productService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import logger from '../../utils/core/logger';

export function useProductSubmission({
  formData,
  setFormData,
  isEditMode,
  id,
  deleteDraft,
  queryClient,
  refreshProducts,
  handleSuccessAction,
  setIsLoading,
}) {
  const [newVariant, setNewVariant] = useState({ name: '', value: '', price: '', stock: '' });

  const _swapPrimaryImage = (index) => {
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
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
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

  return {
    _swapPrimaryImage,
    handleAddVariant,
    handleRemoveVariant,
    handleSubmit,
    newVariant,
    setNewVariant,
  };
}
