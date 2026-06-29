import { useState } from 'react';
import toast from 'react-hot-toast';
import { showcaseService } from '../../services/domainServices';

export function useShowcaseSubmission({
  isEditMode,
  id,
  formData,
  setFormData,
  deleteDraft,
  navigate,
  queryClient,
  refreshProducts,
  setIsLoading,
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [newInclusion, setNewInclusion] = useState({
    name: '',
    defaultQty: 1,
    condition: 'excellent',
  });

  const handleAddInclusion = () => {
    if (!newInclusion.name) return toast.error('Item name is required');
    setFormData({
      ...formData,
      inclusions: [...(formData.inclusions || []), { ...newInclusion, id: Date.now() }],
    });
    setNewInclusion({ name: '', defaultQty: 1, condition: 'excellent' });
  };

  const handleRemoveInclusion = (idToRemove) => {
    setFormData({
      ...formData,
      inclusions: (formData.inclusions || []).filter((i) => i.id !== idToRemove),
    });
  };

  const handleSubmit = async (e, { stayOnPage = false } = {}) => {
    if (e) e.preventDefault();
    if (!formData.title || !formData.image) {
      return toast.error('Title and Cover Image are required before publishing!');
    }

    setIsSaving(true);
    if (setIsLoading) setIsLoading(true);
    try {
      const incList =
        formData.inclusions && formData.inclusions.length > 0
          ? formData.inclusions.map((i) => ({
              name: i.name.trim(),
              defaultQty: Number(i.defaultQty) || 1,
              condition: i.condition || 'excellent',
            }))
          : formData.inclusionsText
            ? formData.inclusionsText
                .split(',')
                .map((item) => ({ name: item.trim(), defaultQty: 1, condition: 'excellent' }))
                .filter((i) => i.name.length > 0)
            : [];

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
        if (!stayOnPage) {
          await deleteDraft(); // Clear draft on success if leaving page
        }
        toast.success(isEditMode ? 'Design updated!' : 'Design published!');

        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: ['adminShowcases'] });
        }
        if (refreshProducts) {
          refreshProducts(); // Adjust context name if needed
        }

        if (!stayOnPage) {
          navigate('/admin/events');
        } else if (!isEditMode && res.data?._id) {
          // If we created a new one but are staying on the page, redirect to the edit mode for the newly created item
          navigate(`/admin/showcases/edit/${res.data._id}`, { replace: true });
        }
      }
    } catch (err) {
      const msg =
        err?.response?.status === 401
          ? 'Save failed: Please log in again or refresh the page'
          : 'Failed to save showcase design.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
      if (setIsLoading) setIsLoading(false);
    }
  };

  return {
    isSaving,
    handleSubmit,
    newInclusion,
    setNewInclusion,
    handleAddInclusion,
    handleRemoveInclusion,
  };
}
