import { useState } from 'react';
import { productService, uploadService } from '../../services/domainServices';
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
  const handleSubmit = async (e, options = { stayOnPage: false }) => {
    if (e) e.preventDefault();
    if (formData.images.length > 0 && !formData.imageSrc) {
      setFormData((prev) => ({ ...prev, imageSrc: prev.images[0] }));
      formData.imageSrc = formData.images[0]; // also set locally for the check below
    }
    if (
      !formData.title ||
      !formData.price ||
      (!formData.category && !formData.primaryCategory) ||
      !formData.imageSrc
    ) {
      return toast.error('Please fill in all mandatory fields before publishing');
    }

    setIsLoading(true);
    try {
      let finalImageSrc = formData.imageSrc;
      let finalImages = [...formData.images].filter(Boolean);

      // Upload pending local images and remote URLs
      if (formData.pendingUploads && formData.pendingUploads.length > 0) {
        toast.loading('Uploading images...', { id: 'upload-toast' });
        // Include http/https to catch newly added pending remote URLs
        const activeLocalUrls = [finalImageSrc, ...finalImages].filter(
          (url) => url && (url.startsWith('blob:') || url.startsWith('http')),
        );

        if (activeLocalUrls.length > 0) {
          const uploadData = new FormData();
          const remoteUrlUploadData = new FormData();

          const localUrlMap = {};
          const remoteUrlMap = {};

          let uploadIndex = 0;
          let remoteUploadIndex = 0;

          for (const url of activeLocalUrls) {
            const pending = formData.pendingUploads.find((p) => p.localUrl === url);
            if (pending) {
              if (typeof pending.file === 'string' && remoteUrlMap[url] === undefined) {
                // It's a remote URL that needs to be uploaded to Cloudinary
                remoteUrlUploadData.append('urls', pending.file);
                remoteUrlMap[url] = remoteUploadIndex++;
              } else if (typeof pending.file !== 'string' && localUrlMap[url] === undefined) {
                // It's a File object that goes to the backend media library
                uploadData.append('images', pending.file);
                localUrlMap[url] = uploadIndex++;
              }
            }
          }

          try {
            // Upload local files via backend Media Library
            let uploadedLocalImages = [];
            if (uploadIndex > 0) {
              const res = await uploadService.uploadImages(uploadData, 'products');
              if (res.success && res.images) {
                uploadedLocalImages = res.images;
              } else {
                throw new Error('Failed to upload local images');
              }
            }

            // Upload remote URLs directly to Cloudinary
            let uploadedRemoteImages = [];
            if (remoteUploadIndex > 0) {
              const { uploadDirectToCloudinary } = await import('../../services/api/_shared');
              const res = await uploadDirectToCloudinary(remoteUrlUploadData, false, 'products');
              if (res.success && res.images) {
                uploadedRemoteImages = res.images;
              } else {
                throw new Error('Failed to upload remote URLs');
              }
            }

            // Replace local blob URLs and pending remote URLs with the uploaded Cloudinary URLs
            if (finalImageSrc) {
              if (localUrlMap[finalImageSrc] !== undefined) {
                finalImageSrc = uploadedLocalImages[localUrlMap[finalImageSrc]];
              } else if (remoteUrlMap[finalImageSrc] !== undefined) {
                finalImageSrc = uploadedRemoteImages[remoteUrlMap[finalImageSrc]];
              }
            }

            for (let i = 0; i < finalImages.length; i++) {
              if (finalImages[i]) {
                if (localUrlMap[finalImages[i]] !== undefined) {
                  finalImages[i] = uploadedLocalImages[localUrlMap[finalImages[i]]];
                } else if (remoteUrlMap[finalImages[i]] !== undefined) {
                  finalImages[i] = uploadedRemoteImages[remoteUrlMap[finalImages[i]]];
                }
              }
            }
          } catch (uploadErr) {
            toast.dismiss('upload-toast');
            throw uploadErr;
          }
        }
        toast.dismiss('upload-toast');
      }

      const payload = {
        title: formData.title,
        teluguTitle: formData.teluguTitle || undefined,
        customerNote: formData.customerNote || undefined,
        complimentaryGift: formData.complimentaryGift?.enabled
          ? {
              enabled: true,
              name: formData.complimentaryGift.name || undefined,
              quantity: Number(formData.complimentaryGift.quantity) || 1,
              description: formData.complimentaryGift.description || undefined,
              displayBadge: formData.complimentaryGift.displayBadge || undefined,
            }
          : { enabled: false },
        slug:
          formData.slug ||
          formData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        category: formData.primaryCategory || formData.category,
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
        imageSrc: finalImageSrc,
        images: Array.from(new Set([finalImageSrc, ...finalImages].filter(Boolean))),
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
        isNonRefundable: !formData.returnSettings?.isReturnable,
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
        returnSettings: formData.returnSettings
          ? {
              returnWindow: Number(formData.returnSettings.returnWindowDays) || 0,
              exchangeWindow: Number(formData.returnSettings.exchangeWindowDays) || 0,
              restockingFeePercent: Number(formData.returnSettings.restockingFeePercentage) || 0,
              inspectionRequired: formData.returnSettings.requiresInspection,
            }
          : undefined,
      };

      const idempotencyKey = `product_${isEditMode ? 'update' : 'create'}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const res = isEditMode
        ? await productService.update(
            id,
            { ...payload, __v: formData.__v },
            { headers: { 'X-Idempotency-Key': idempotencyKey } },
          )
        : await productService.create(payload, {
            headers: { 'X-Idempotency-Key': idempotencyKey },
          });

      if (res.success) {
        await deleteDraft(); // Delete draft on success
        toast.success(isEditMode ? 'Product updated' : 'Product published');

        // Use the server-returned entity to update the cache directly
        const returnedProduct = res.data?.product || res.data;
        if (returnedProduct?._id) {
          queryClient.setQueryData(['product', returnedProduct._id], returnedProduct);
        }

        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['product_categories'] });
        queryClient.invalidateQueries({ queryKey: ['gallery'] });
        queryClient.invalidateQueries({ queryKey: ['showcases'] });
        if (refreshProducts) {
          try {
            await refreshProducts();
          } catch (err) {
            logger.error('Failed to refresh products state', err);
          }
        }
        if (!options.stayOnPage) {
          handleSuccessAction();
        } else {
          // If staying on page, update formData with the real Cloudinary URLs and clear pendingUploads
          setFormData((prev) => ({
            ...prev,
            imageSrc: finalImageSrc,
            images: Array.from(new Set([finalImageSrc, ...finalImages].filter(Boolean))),
            pendingUploads: [],
            __v: returnedProduct.__v || prev.__v + 1,
          }));
          if (!isEditMode && res.data?.product?._id) {
            window.history.replaceState(null, '', `/admin/products/edit/${res.data.product._id}`);
          }
        }
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
