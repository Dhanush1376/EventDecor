import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { couponService, productService } from '../../services/domainServices';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorHelpers';
import { AdminToggle, SkeletonDashboard, fadeUp } from '../components/AdminUIKit';
import { useDraft } from '../hooks/useDraft';
import { DraftStatusIndicator } from '../components/DraftStatusIndicator';
import { DraftRestoreModal } from '../components/DraftRestoreModal';
import { UnsavedChangesGuard } from '../components/UnsavedChangesGuard';

import logger from '../../utils/logger';

const AVAILABLE_CATEGORIES = [
  'Wedding Curation',
  'Flower Decor',
  'Mandap Props',
  'Backdrops',
  'Lights & Candles',
  'Table Settings',
  'Festive Decor',
  'Luxury Scapes',
];

const AVAILABLE_TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum'];

const DISPLAY_LOCATIONS = [
  { value: 'checkout', label: 'Checkout Coupon Choice Tray' },
  { value: 'cart', label: 'Cart Drawer Promotions Panel' },
  { value: 'banner', label: 'Homepage Countdown Banner' },
  { value: 'floating', label: 'Floating App Offer Card' },
  { value: 'wallet', label: 'Loyalty Wallet Dashboard' },
];

export function AdminCreateCoupon() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState('form');
  const [currentStep, setCurrentStep] = useState(0);
  const [products, setProducts] = useState([]);

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
    draftKey: isEdit ? `admin:coupons:edit:${id}` : 'admin:coupons:add',
    module: 'Coupons',
    pageTitle: isEdit ? `Edit Coupon ${id}` : 'New Coupon',
    initialData: {
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
    },
    initialPageState: { activeStep: 0, mobileTab: 'form' },
    enabled: true,
  });

  // Keep these synced with pageState for UI if necessary
  useEffect(() => {
    if (pageState.activeStep !== undefined) setCurrentStep(pageState.activeStep);
    if (pageState.mobileTab !== undefined) setMobileTab(pageState.mobileTab);
  }, [pageState]);

  // Fetch active products on mount to allow granular targeting
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
                // Enterprise properties load
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
  }, [id, isEdit, navigate]);

  const toggleProductSelect = (productId) => {
    setFormData((prev) => {
      const current = [...prev.targetProductIds];
      const index = current.indexOf(productId);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(productId);
      }
      return { ...prev, targetProductIds: current };
    });
  };

  const toggleCategorySelect = (category) => {
    setFormData((prev) => {
      const current = [...prev.targetCategories];
      const index = current.indexOf(category);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(category);
      }
      return { ...prev, targetCategories: current };
    });
  };

  const toggleTierSelect = (tier) => {
    setFormData((prev) => {
      const current = [...prev.targetUserTiers];
      const index = current.indexOf(tier);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(tier);
      }
      return { ...prev, targetUserTiers: current };
    });
  };

  const toggleDisplayLocation = (location) => {
    setFormData((prev) => {
      const current = [...prev.displayLocations];
      const index = current.indexOf(location);
      if (index > -1) {
        current.splice(index, 1);
      } else {
        current.push(location);
      }
      return { ...prev, displayLocations: current };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        // Enterprise setting options
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
        await deleteDraft(); // Clear draft on success
        toast.success(isEdit ? 'Coupon updated' : 'Campaign published');
        handleSuccessAction();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save coupon campaign'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAction = () => {
    navigate('/admin/coupons');
  };

  const handleSuccessAction = () => {
    navigate('/admin/coupons');
  };

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-6 pb-20 p-6">
        <SkeletonDashboard />
      </div>
    );
  }

  const STEPS = [
    { label: 'Metadata', icon: 'sell' },
    { label: 'Targeting', icon: 'groups' },
    { label: 'Controls', icon: 'rule' },
    { label: 'Publish', icon: 'verified' },
  ];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const formElement = (
    <div className={`flex-1 min-w-0 ${mobileTab === 'form' ? 'block' : 'hidden lg:block'}`}>
      <div className="admin-card">
        {/* Wizard Header */}
        <div className="flex border-b border-[var(--admin-border-subtle)]">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStep;
            const isPast = idx < currentStep;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`flex-1 py-4 flex flex-col items-center justify-center gap-1 relative transition-all ${isActive ? 'bg-[var(--admin-surface)]' : 'hover:bg-[var(--admin-surface-muted)]'}`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-[var(--admin-accent)]' : isPast ? 'text-success' : 'text-[var(--admin-text-tertiary)]'}`}
                >
                  {isPast ? 'check_circle' : step.icon}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-[var(--admin-accent)]' : 'text-[var(--admin-text-secondary)]'}`}
                >
                  {step.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeStepIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--admin-accent)]"
                  />
                )}
              </button>
            );
          })}
        </div>

        <motion.form
          onSubmit={(e) => {
            e.preventDefault();
            if (currentStep === STEPS.length - 1) {
              handleSubmit(e);
            } else {
              handleNext();
            }
          }}
          variants={fadeUp}
          className="p-6 md:p-8 space-y-8 min-h-[450px]"
        >
          {/* STEP 1: METADATA */}
          {currentStep === 0 && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
                <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                  sell
                </span>
                1. Campaign Metadata
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="admin-label">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    disabled={isEdit}
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., FESTIVE40"
                    className="admin-input font-mono tracking-wider uppercase disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="admin-label">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="admin-select"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="admin-label">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder="e.g. 15 for 15% or 500 for flat discount"
                    className="admin-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="admin-label">Minimum Purchase Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    placeholder="e.g. 500"
                    className="admin-input"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="admin-label">Maximum Discount Cap (₹)</label>
                <input
                  type="number"
                  value={formData.maxDiscount}
                  disabled={formData.discountType === 'fixed'}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  placeholder={
                    formData.discountType === 'fixed' ? 'N/A (Flat Discount)' : 'Unlimited'
                  }
                  className="admin-input disabled:opacity-40"
                />
              </div>
            </div>
          )}

          {/* STEP 2: CUSTOMER & CATALOG TARGETING */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
                <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                  groups
                </span>
                2. Customer & Catalog Segment Targeting
              </h2>
              <div className="space-y-1.5">
                <label className="admin-label">Segmentation Rules Model</label>
                <select
                  value={formData.targetType}
                  onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                  className="admin-select"
                >
                  <option value="all">Apply to All Products & All Customers</option>
                  <option value="products">Apply ONLY to Selected Products</option>
                  <option value="categories">Apply ONLY to Selected Categories</option>
                  <option value="tiers">Apply ONLY to Specific Loyalty Tiers</option>
                </select>
              </div>

              {/* Targeted Products Checklist */}
              {formData.targetType === 'products' && (
                <div className="admin-card-inset p-4 space-y-3">
                  <label className="admin-label">
                    Select Eligible Catalog Products ({formData.targetProductIds.length} Selected)
                  </label>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {products.length === 0 ? (
                      <p className="text-[12px] text-[var(--admin-text-tertiary)] italic">
                        No products found in database
                      </p>
                    ) : (
                      products.map((p) => {
                        const isChecked = formData.targetProductIds.includes(p._id || p.id);
                        return (
                          <label
                            key={p._id || p.id}
                            className="flex items-center gap-3 p-2.5 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] cursor-pointer transition-all text-[13px]"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleProductSelect(p._id || p.id)}
                              className="w-4 h-4 rounded accent-[var(--admin-accent)]"
                            />
                            <div className="flex items-center gap-2">
                              <img
                                src={p.imageSrc}
                                alt={p.title}
                                className="w-8 h-8 rounded-[var(--admin-radius-md)] object-cover border border-[var(--admin-border-subtle)]"
                              />
                              <div>
                                <span className="font-semibold text-[var(--admin-text-primary)]">
                                  {p.title}
                                </span>
                                <span className="text-[11px] text-[var(--admin-text-tertiary)] ml-2">
                                  ₹{p.price}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Targeted Categories Checklist */}
              {formData.targetType === 'categories' && (
                <div className="admin-card-inset p-4 space-y-3">
                  <label className="admin-label">
                    Select Eligible Storefront Categories ({formData.targetCategories.length}{' '}
                    Selected)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {AVAILABLE_CATEGORIES.map((cat) => {
                      const isChecked = formData.targetCategories.includes(cat);
                      return (
                        <label
                          key={cat}
                          className="flex items-center gap-3 p-2.5 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] cursor-pointer transition-all text-[13px]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCategorySelect(cat)}
                            className="w-4 h-4 rounded accent-[var(--admin-accent)]"
                          />
                          <span className="font-semibold text-[var(--admin-text-primary)]">
                            {cat}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Targeted Loyalty Tiers Checklist */}
              {formData.targetType === 'tiers' && (
                <div className="admin-card-inset p-4 space-y-3">
                  <label className="admin-label">
                    Select Eligible Loyalty Membership Tiers ({formData.targetUserTiers.length}{' '}
                    Selected)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {AVAILABLE_TIERS.map((tier) => {
                      const isChecked = formData.targetUserTiers.includes(tier);
                      return (
                        <label
                          key={tier}
                          className="flex items-center gap-3 p-3 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] cursor-pointer transition-all text-[13px]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTierSelect(tier)}
                            className="w-4 h-4 rounded accent-[var(--admin-accent)]"
                          />
                          <span className="font-semibold text-[var(--admin-text-primary)]">
                            {tier} Member
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CONTROLS, SCHEDULING & CASHBACK */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div className="space-y-5">
                <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                    visibility
                  </span>
                  3. Storefront Visibility & Auto-Apply Settings
                </h2>
                <div className="admin-card-inset p-4 space-y-4">
                  <label className="admin-label">Where should this coupon be displayed?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DISPLAY_LOCATIONS.map((loc) => {
                      const isChecked = formData.displayLocations.includes(loc.value);
                      return (
                        <label
                          key={loc.value}
                          className="flex items-center gap-3 p-2.5 bg-[var(--admin-surface)] rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-subtle)] hover:border-[var(--admin-border-strong)] cursor-pointer transition-all text-[12px]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDisplayLocation(loc.value)}
                            className="w-4 h-4 rounded accent-[var(--admin-accent)]"
                          />
                          <span className="text-[var(--admin-text-primary)] font-semibold">
                            {loc.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-4 p-4 admin-card-inset rounded-[var(--admin-radius-lg)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 rounded accent-[var(--admin-accent)]"
                    />
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--admin-text-primary)]">
                        Mark as Featured Offer
                      </p>
                      <p className="text-[11px] text-[var(--admin-text-tertiary)]">
                        Highlighted on promotion banners
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-4 p-4 admin-card-inset rounded-[var(--admin-radius-lg)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAutoApply}
                      onChange={(e) => setFormData({ ...formData, isAutoApply: e.target.checked })}
                      className="w-4 h-4 rounded accent-[var(--admin-accent)]"
                    />
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--admin-text-primary)]">
                        Auto-Apply at Checkout
                      </p>
                      <p className="text-[11px] text-[var(--admin-text-tertiary)]">
                        Applies automatically if conditions match
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-5 pt-5 border-t border-[var(--admin-border-subtle)]">
                <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                    payments
                  </span>
                  4. Loyalty Wallet Cashback Perks
                </h2>
                <p className="text-[11px] text-[var(--admin-text-tertiary)]">
                  Give customers promotional Siri Cash directly in their store wallets upon placing
                  their orders. Admins can configure percentages, fixed credits, or hybrid reward
                  perks!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="admin-label">Cashback Rate (%)</label>
                    <input
                      type="number"
                      value={formData.cashbackPercentage}
                      onChange={(e) =>
                        setFormData({ ...formData, cashbackPercentage: e.target.value })
                      }
                      placeholder="e.g. 5 for 5% cashback"
                      className="admin-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="admin-label">Flat Wallet Cashback Credits (₹)</label>
                    <input
                      type="number"
                      value={formData.cashbackFixed}
                      onChange={(e) => setFormData({ ...formData, cashbackFixed: e.target.value })}
                      placeholder="e.g. ₹100 flat cashback"
                      className="admin-input"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-5 pt-5 border-t border-[var(--admin-border-subtle)]">
                <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
                  <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">
                    rule
                  </span>
                  5. Exclusions & Campaign Rules
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="admin-label">Validity Start Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="admin-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="admin-label">Campaign Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="admin-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1 space-y-1.5">
                    <label className="admin-label">Global Limit</label>
                    <input
                      type="number"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                      placeholder="Unlimited"
                      className="admin-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="admin-label">Stacking Rules</label>
                    <select
                      value={formData.stackingRule}
                      onChange={(e) => setFormData({ ...formData, stackingRule: e.target.value })}
                      className="admin-select"
                    >
                      <option value="exclusive">Standalone Exclusive (Cannot Stack)</option>
                      <option value="stackable">Stackable (Can Combine Offers)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="admin-label">Campaign Priority Level</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      placeholder="e.g. 1"
                      className="admin-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PUBLISH STATUS & REVIEW */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="admin-card-inset p-4 rounded-[var(--admin-radius-lg)] max-w-sm">
                <AdminToggle
                  label="Publishing Campaign Status"
                  description="Enable to activate this promotional offer in production"
                  checked={formData.isActive}
                  onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
                />
              </div>
            </div>
          )}

          {/* SUBMIT ACTIONS */}
          <div className="pt-6 flex items-center justify-between border-t border-[var(--admin-border-subtle)]">
            <button
              type="button"
              onClick={currentStep === 0 ? handleCancelAction : handlePrev}
              className="admin-btn admin-btn-outline"
            >
              {currentStep === 0 ? 'Cancel' : 'Previous'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="admin-btn admin-btn-primary disabled:opacity-50"
            >
              {currentStep === STEPS.length - 1
                ? saving
                  ? 'Saving...'
                  : isEdit
                    ? 'Update Coupon'
                    : 'Publish Campaign'
                : 'Next Step'}
            </button>
          </div>
        </motion.form>
      </div>

      <DraftRestoreModal
        isOpen={showRestoreModal}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
        moduleName="Coupons"
        lastSavedAt={lastSavedAt}
      />

      <UnsavedChangesGuard blocker={blocker} />
    </div>
  );

  return (
    <div className="max-w-[1280px] mx-auto space-y-6 pb-20 sm:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleCancelAction}
            className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] border border-[var(--admin-border)] hover:bg-[var(--admin-surface-muted)] text-[var(--admin-text-primary)] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[20px] font-bold text-[var(--admin-text-primary)] leading-none mb-1.5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-[var(--admin-accent)]">
                {isEdit ? 'edit_note' : 'campaign'}
              </span>
              {isEdit ? 'Edit Campaign' : 'New Campaign'}
              <DraftStatusIndicator status={draftStatus} lastSavedAt={lastSavedAt} />
            </h2>
            <p className="text-[12px] text-[var(--admin-text-secondary)] font-medium">
              {isEdit
                ? 'Update coupon rules and targeting parameters'
                : 'Create a new discount code or promotional campaign'}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex bg-[var(--admin-surface)] rounded-full p-1 border border-[var(--admin-border)] sticky top-20 z-30 shadow-sm mx-4 sm:mx-0">
        <button
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 text-[12px] font-bold rounded-full transition-all ${
            mobileTab === 'form'
              ? 'bg-[var(--admin-accent)] text-white shadow-md'
              : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          Editor Form
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-[12px] font-bold rounded-full transition-all ${
            mobileTab === 'preview'
              ? 'bg-[var(--admin-accent)] text-white shadow-md'
              : 'text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]'
          }`}
        >
          Live Preview
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 relative items-start">
        {/* LEFT COLUMN: FORM */}
        {formElement}

        {/* RIGHT COLUMN: LIVE PREVIEW */}
        <div
          className={`lg:w-[340px] xl:w-[400px] shrink-0 lg:sticky lg:top-24 space-y-6 w-full ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}
        >
          <div className="admin-card overflow-hidden">
            <div className="bg-[var(--admin-bg-subtle)] px-4 py-3 border-b border-[var(--admin-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[var(--admin-text-secondary)]">
                  preview
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                  Live Preview
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-error" />
                <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                <span className="w-2.5 h-2.5 rounded-full bg-success" />
              </div>
            </div>

            <div className="p-8 bg-white flex flex-col items-center justify-center min-h-[400px] border-b border-[var(--admin-border-subtle)] relative">
              <div className="relative group cursor-pointer w-full max-w-sm">
                {/* Storefront Coupon Card Simulation */}
                <div
                  className={`rounded-xl transition-all duration-300 overflow-hidden relative shadow-[var(--admin-shadow-lg)] ${formData.isActive ? 'bg-white border-2 border-[var(--admin-accent)]' : 'bg-gray-50 border-2 border-dashed border-[var(--admin-text-placeholder)] grayscale opacity-70'}`}
                >
                  {/* Coupon Header/Design */}
                  <div className="bg-[var(--admin-accent)]/10 px-6 py-5 flex items-center justify-between relative overflow-hidden">
                    <div
                      className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-inner"
                      style={{ borderRight: '1px solid var(--admin-border-subtle)' }}
                    />
                    <div
                      className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white shadow-inner"
                      style={{ borderLeft: '1px solid var(--admin-border-subtle)' }}
                    />

                    <div className="z-10 text-center w-full">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--admin-accent)] block mb-1">
                        {formData.isFeatured ? '⭐ Featured Offer' : 'Special Offer'}
                      </span>
                      <h3 className="text-3xl font-black text-[var(--admin-text-primary)] tracking-tight">
                        {formData.discountType === 'percentage'
                          ? `${formData.discountValue || '0'}% OFF`
                          : `₹${formData.discountValue || '0'} OFF`}
                      </h3>
                    </div>
                  </div>

                  {/* Coupon Details */}
                  <div className="px-6 py-5 space-y-4 border-t border-dashed border-[var(--admin-border)]">
                    <div className="text-center">
                      <div className="inline-block border-2 border-dashed border-[var(--admin-text-tertiary)] rounded-lg px-4 py-2 bg-[var(--admin-surface-muted)]">
                        <span className="font-mono text-lg font-bold tracking-widest text-[var(--admin-text-primary)]">
                          {formData.code || 'CODE'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 text-center">
                      {formData.minOrderAmount > 0 && (
                        <p className="text-[11px] text-[var(--admin-text-secondary)] font-medium">
                          On minimum purchase of ₹{formData.minOrderAmount}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--admin-text-tertiary)]">
                        Valid till{' '}
                        {formData.expiryDate
                          ? new Date(formData.expiryDate).toLocaleDateString()
                          : 'TBD'}
                      </p>
                    </div>
                  </div>

                  {/* Target Scope Indicator */}
                  <div className="bg-[var(--admin-surface-muted)] px-4 py-2 text-center border-t border-[var(--admin-border-subtle)]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--admin-text-secondary)]">
                      {formData.targetType === 'all'
                        ? 'Valid Storewide'
                        : formData.targetType === 'products'
                          ? `Valid on ${formData.targetProductIds.length} Products`
                          : formData.targetType === 'categories'
                            ? `Valid on ${formData.targetCategories.length} Categories`
                            : `For ${formData.targetUserTiers.length} VIP Tiers`}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {formData.isActive ? (
                      <span className="bg-success/10 text-success text-[9px] font-bold px-2 py-0.5 rounded-full border border-success/20">
                        Active
                      </span>
                    ) : (
                      <span className="bg-error/10 text-error text-[9px] font-bold px-2 py-0.5 rounded-full border border-error/20">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[var(--admin-surface)] space-y-3">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--admin-text-tertiary)] font-medium">
                  Internal Setup Progress
                </span>
                <span className="text-[var(--admin-accent)] font-bold">
                  {formData.code && formData.discountValue && formData.expiryDate
                    ? 'Ready to Publish'
                    : 'Drafting'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--admin-border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--admin-accent)] rounded-full transition-all"
                  style={{
                    width:
                      (formData.code ? 33 : 0) +
                      (formData.discountValue ? 33 : 0) +
                      (formData.expiryDate ? 34 : 0) +
                      '%',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminCreateCoupon;
