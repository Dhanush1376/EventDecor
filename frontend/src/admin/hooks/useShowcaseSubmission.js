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
      let finalImage = formData.image;
      let finalGallery = [...(formData.galleryImages || [])].filter(Boolean);

      if (formData.pendingUploads && formData.pendingUploads.length > 0) {
        toast.loading('Uploading images...', { id: 'upload-toast' });
        // Include http/https to catch newly added pending remote URLs
        const activeLocalUrls = [finalImage, ...finalGallery].filter(
          (url) => url && (url.startsWith('blob:') || url.startsWith('http')),
        );

        if (activeLocalUrls.length > 0) {
          const uploadData = new FormData();
          const localUrlMap = {};
          let uploadIndex = 0;

          for (const url of activeLocalUrls) {
            const pending = formData.pendingUploads.find((p) => p.localUrl === url);
            if (pending) {
              if (localUrlMap[url] === undefined) {
                uploadData.append('file', pending.file);
                localUrlMap[url] = uploadIndex++;
              }
            }
          }

          try {
            // Upload all pending files and remote URLs directly to Cloudinary (bypassing backend limits)
            let uploadedImages = [];
            if (uploadIndex > 0) {
              const { uploadDirectToCloudinary } = await import('../../services/api/_shared');
              const res = await uploadDirectToCloudinary(uploadData, false, 'events');

              if (res.success && res.images) {
                uploadedImages = res.images;
              } else {
                throw new Error('Failed to upload images');
              }
            }

            // Replace local blob URLs and pending remote URLs with uploaded Cloudinary URLs
            if (finalImage && localUrlMap[finalImage] !== undefined) {
              finalImage = uploadedImages[localUrlMap[finalImage]];
            }

            for (let i = 0; i < finalGallery.length; i++) {
              if (finalGallery[i] && localUrlMap[finalGallery[i]] !== undefined) {
                finalGallery[i] = uploadedImages[localUrlMap[finalGallery[i]]];
              }
            }
          } catch (uploadErr) {
            toast.dismiss('upload-toast');
            throw uploadErr;
          }
        }
        toast.dismiss('upload-toast');
      }

      const incList =
        formData.inclusions && formData.inclusions.length > 0
          ? formData.inclusions.map((i) => ({
              name: i?.name?.trim() || 'Item',
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
        image: finalImage,
        gallery: finalGallery,
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
        toast.success(
          isEditMode
            ? 'Design updated! (Changes may take 1-2 mins to reflect)'
            : 'Design published! (Changes may take 1-2 mins to reflect)',
        );
        if (!stayOnPage) {
          await deleteDraft(); // Clear draft on success if leaving page
        }

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
      const backendError = err?.response?.data?.message || err?.message;
      const msg =
        err?.response?.status === 401
          ? 'Save failed: Please log in again or refresh the page'
          : backendError || 'Failed to save showcase design.';
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
