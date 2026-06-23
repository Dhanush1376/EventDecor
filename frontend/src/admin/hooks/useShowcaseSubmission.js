import { useState } from 'react';
import toast from 'react-hot-toast';
import { showcaseService } from '../../services/domainServices';

export function useShowcaseSubmission({ isEditMode, id, formData, deleteDraft, navigate }) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title || !formData.image) {
      return toast.error('Title and Cover Image are required before publishing!');
    }

    setIsSaving(true);
    try {
      const incList = formData.inclusionsText
        .split(',')
        .map((item) => ({ name: item.trim(), defaultQty: 1, condition: 'excellent' }))
        .filter((i) => i.name.length > 0);

      const payload = {
        title: formData.title,
        subtitle: formData.subtitle || undefined,
        category: formData.category,
        rentalPrice: Number(formData.rentalPrice) || 12000,
        description: formData.description,
        image: formData.image,
        gallery: formData.galleryImages.filter(Boolean),
        inclusions: incList,
        colorPalette: formData.colorPalette
          ? formData.colorPalette
              .split(',')
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
        suggestedProps: formData.suggestedProps
          ? formData.suggestedProps
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
        setupTimeHours: Number(formData.setupTimeHours) || 2,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        isActive: Boolean(formData.isActive),
      };

      const res = isEditMode
        ? await showcaseService.update(id, payload)
        : await showcaseService.create(payload);

      if (res.success) {
        await deleteDraft(); // Clear draft on success
        toast.success(isEditMode ? 'Design updated!' : 'Design published!');
        navigate('/admin/events');
      }
    } catch (err) {
      const msg =
        err?.response?.status === 401
          ? 'Save failed: Please log in again or refresh the page'
          : 'Failed to save showcase design.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    handleSubmit,
  };
}
