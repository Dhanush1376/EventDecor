import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { couponService, productService } from '../../../services/domainServices';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../../utils/core/errorHelpers';
import { useDraft } from '../../hooks/useDraft';
import logger from '../../../utils/core/logger';

const INITIAL_COUPON_DATA = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  minOrderAmount: '',
  maxDiscount: '',
  startDate: new Date().toISOString().split('T')[0],
  expiryDate: '',
  usageLimit: '',
  isActive: true,
  targetType: 'all',
  targetProductIds: [],
  targetCategories: [],
  targetUserTiers: [],
  displayLocations: ['checkout'],
  isFeatured: false,
  isAutoApply: false,
  cashbackPercentage: '',
  cashbackFixed: '',
  stackingRule: 'exclusive',
  priority: '1',
};

export function useCreateCoupon() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState('form');
  const [currentStep, setCurrentStep] = useState(0);
  const [products, setProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  const {
    formData,
    setFormData,
    pageState,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    deleteDraft,
    lastSavedAt,
    blocker,
  } = useDraft({
    draftKey: isEdit ? `admin:coupons:edit:${id}` : 'admin:coupons:add',
    module: 'Coupons',
    pageTitle: isEdit ? `Edit Coupon ${id}` : 'New Coupon',
    initialData: INITIAL_COUPON_DATA,
    initialPageState: { activeStep: 0, mobileTab: 'form' },
    enabled: true,
  });

  useEffect(() => {
    if (pageState.activeStep !== undefined) setCurrentStep(pageState.activeStep);
    if (pageState.mobileTab !== undefined) setMobileTab(pageState.mobileTab);
  }, [pageState]);

  useEffect(() => {
    productService
      .getAll({ limit: 150 })
      .then((res) => {
        if (res.success && res.data) {
          const list = res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
          setProducts(list);
        }
      })
      .catch((err) => {
        logger.warn('Failed to load catalog products for targeting selection:', err);
      });

    productService
      .getCategories()
      .then((res) => {
        if (res.success && res.data) {
          // Assuming data is array of objects with name, or array of strings
          const list = Array.isArray(res.data) ? res.data : res.data.data || [];
          setAvailableCategories(
            list.map((c) => (typeof c === 'string' ? c : c.name)).filter(Boolean),
          );
        }
      })
      .catch((err) => {
        logger.warn('Failed to load categories for targeting selection:', err);
      });
  }, []);

  useEffect(() => {
    if (isEdit) {
      const loadCoupon = async () => {
        setLoading(true);
        try {
          const res = await couponService.getAll();
          if (res.success) {
            const list =
              res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
            const coupon = list.find((c) => (c._id || c.id) === id);
            if (coupon) {
              setFormData({
                code: coupon.code || '',
                discountType: coupon.discountType || 'percentage',
                discountValue: coupon.discountValue || '',
                minOrderAmount: coupon.minOrderAmount || '',
                maxDiscount: coupon.maxDiscount || '',
                startDate: coupon.startDate
                  ? new Date(coupon.startDate).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0],
                expiryDate: coupon.expiryDate
                  ? new Date(coupon.expiryDate).toISOString().split('T')[0]
                  : '',
                usageLimit: coupon.usageLimit || '',
                isActive: coupon.isActive !== undefined ? coupon.isActive : true,
                targetType: coupon.targetType || 'all',
                targetProductIds: coupon.targetProductIds || [],
                targetCategories: coupon.targetCategories || [],
                targetUserTiers: coupon.targetUserTiers || [],
                displayLocations: coupon.displayLocations || ['checkout'],
                isFeatured: coupon.isFeatured || false,
                isAutoApply: coupon.isAutoApply || false,
                cashbackPercentage: coupon.cashbackPercentage || '',
                cashbackFixed: coupon.cashbackFixed || '',
                stackingRule: coupon.stackingRule || 'exclusive',
                priority: String(coupon.priority || '1'),
              });
            } else {
              toast.error('Coupon not found in catalog');
              navigate('/admin/coupons');
            }
          }
        } catch (err) {
          toast.error(getErrorMessage(err, 'Failed to load coupon details'));
        } finally {
          setLoading(false);
        }
      };
      loadCoupon();
    }
  }, [id, isEdit, navigate, setFormData]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.code || !formData.discountValue || !formData.expiryDate) {
      return toast.error('Please fill in all required fields (Code, Value, and Expiry Date)');
    }

    setSaving(true);
    try {
      const payload = {
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: formData.minOrderAmount ? Number(formData.minOrderAmount) : 0,
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        startDate: new Date(formData.startDate),
        expiryDate: new Date(formData.expiryDate),
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
        isActive: formData.isActive,
        targetType: formData.targetType,
        targetProductIds: formData.targetType === 'products' ? formData.targetProductIds : [],
        targetCategories: formData.targetType === 'categories' ? formData.targetCategories : [],
        targetUserTiers: formData.targetType === 'tiers' ? formData.targetUserTiers : [],
        displayLocations: formData.displayLocations,
        isFeatured: formData.isFeatured,
        isAutoApply: formData.isAutoApply,
        cashbackPercentage: formData.cashbackPercentage ? Number(formData.cashbackPercentage) : 0,
        cashbackFixed: formData.cashbackFixed ? Number(formData.cashbackFixed) : 0,
        stackingRule: formData.stackingRule,
        priority: Number(formData.priority || 1),
      };

      const res = isEdit
        ? await couponService.update(id, payload)
        : await couponService.create(payload);

      if (res.success) {
        await deleteDraft();
        toast.success(isEdit ? 'Coupon updated' : 'Campaign published');
        navigate('/admin/coupons');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save coupon campaign'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAction = () => navigate('/admin/coupons');

  return {
    isEdit,
    loading,
    saving,
    mobileTab,
    setMobileTab,
    currentStep,
    setCurrentStep,
    products,
    availableCategories,
    formData,
    setFormData,
    draftStatus,
    showRestoreModal,
    restoreDraft,
    discardDraft,
    lastSavedAt,
    blocker,
    handleSubmit,
    handleCancelAction,
  };
}
