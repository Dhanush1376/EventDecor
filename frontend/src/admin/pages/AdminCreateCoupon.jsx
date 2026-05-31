import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { couponService, productService } from "../../services/domainServices";
import toast from "react-hot-toast";
import {
  PageHeader,
  SectionHeader,
  AdminToggle,
  SkeletonDashboard,
  fadeUp,
  stagger,
} from "../components/AdminUIKit";

import logger from '../../utils/logger';

const AVAILABLE_CATEGORIES = ["Wedding Curation","Flower Decor","Mandap Props","Backdrops","Lights & Candles","Table Settings","Festive Decor","Luxury Scapes"
];

const AVAILABLE_TIERS = ["Bronze","Silver","Gold","Platinum"];

const DISPLAY_LOCATIONS = [
  { value:"checkout", label:"Checkout Coupon Choice Tray" },
  { value:"cart", label:"Cart Drawer Promotions Panel" },
  { value:"banner", label:"Homepage Countdown Banner" },
  { value:"floating", label:"Floating App Offer Card" },
  { value:"wallet", label:"Loyalty Wallet Dashboard" }
];

export function AdminCreateCoupon() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    code:"",
    discountType:"percentage",
    discountValue:"",
    minOrderAmount:"",
    maxDiscount:"",
    startDate: new Date().toISOString().split("T")[0],
    expiryDate:"",
    usageLimit:"",
    isActive: true,
    // Enterprise Extensions
    targetType:"all",
    targetProductIds: [],
    targetCategories: [],
    targetUserTiers: [],
    displayLocations: ["checkout"],
    isFeatured: false,
    isAutoApply: false,
    cashbackPercentage:"",
    cashbackFixed:"",
    stackingRule:"exclusive",
    priority:"1",
  });

  // Fetch active products on mount to allow granular targeting
  useEffect(() => {
    productService.getAll({ limit: 150 }).then((res) => {
      if (res.success && res.data) {
        const list = res.data.data || res.data.items || (Array.isArray(res.data) ? res.data : []);
        setProducts(list);
      }
    }).catch((err) => {
      logger.warn("Failed to load catalog products for targeting selection:", err);
    });
  }, []);

  useEffect(() => {
    if (isEdit) {
      const loadCoupon = async () => {
        setLoading(true);
        try {
          const res = await couponService.getAll();
          if (res.success) {
            const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
            const coupon = list.find((c) => (c._id || c.id) === id);
            if (coupon) {
              setFormData({
                code: coupon.code ||"",
                discountType: coupon.discountType ||"percentage",
                discountValue: coupon.discountValue ||"",
                minOrderAmount: coupon.minOrderAmount ||"",
                maxDiscount: coupon.maxDiscount ||"",
                startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split("T")[0] :"",
                usageLimit: coupon.usageLimit ||"",
                isActive: coupon.isActive !== undefined ? coupon.isActive : true,
                // Enterprise properties load
                targetType: coupon.targetType ||"all",
                targetProductIds: coupon.targetProductIds || [],
                targetCategories: coupon.targetCategories || [],
                targetUserTiers: coupon.targetUserTiers || [],
                displayLocations: coupon.displayLocations || ["checkout"],
                isFeatured: coupon.isFeatured || false,
                isAutoApply: coupon.isAutoApply || false,
                cashbackPercentage: coupon.cashbackPercentage ||"",
                cashbackFixed: coupon.cashbackFixed ||"",
                stackingRule: coupon.stackingRule ||"exclusive",
                priority: String(coupon.priority ||"1"),
              });
            } else {
              toast.error("Coupon not found in catalog");
              navigate("/admin/coupons");
            }
          }
        } catch (err) {
          toast.error(getErrorMessage(err, "Failed to load coupon details"));
        } finally {
          setLoading(false);
        }
      };
      loadCoupon();
    }
  }, [id, isEdit, navigate]);

  useEffect(() => {
    if (!isEdit) {
      setFormData({
        code:"",
        discountType:"percentage",
        discountValue:"",
        minOrderAmount:"",
        maxDiscount:"",
        startDate: new Date().toISOString().split("T")[0],
        expiryDate:"",
        usageLimit:"",
        isActive: true,
        targetType:"all",
        targetProductIds: [],
        targetCategories: [],
        targetUserTiers: [],
        displayLocations: ["checkout"],
        isFeatured: false,
        isAutoApply: false,
        cashbackPercentage:"",
        cashbackFixed:"",
        stackingRule:"exclusive",
        priority:"1",
      });
    }
  }, [id, isEdit]);

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
      return toast.error("Please fill in all required fields (Code, Value, and Expiry Date)");
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
        targetProductIds: formData.targetType ==="products" ? formData.targetProductIds : [],
        targetCategories: formData.targetType ==="categories" ? formData.targetCategories : [],
        targetUserTiers: formData.targetType ==="tiers" ? formData.targetUserTiers : [],
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
        toast.success(isEdit ? "Coupon updated" : "Campaign published");
        handleSuccessAction();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save coupon campaign"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAction = () => {
    navigate("/admin/coupons");
  };

  const handleSuccessAction = () => {
    navigate("/admin/coupons");
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  const formElement = (
    <motion.form
      onSubmit={handleSubmit}
      variants={fadeUp}
      className="admin-card p-6 md:p-8 space-y-8"
    >
        {/* SECTION 1: BASIC DETAILS */}
        <div className="space-y-5">
          <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">sell</span>
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
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
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
              disabled={formData.discountType ==="fixed"}
              onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
              placeholder={formData.discountType ==="fixed" ?"N/A (Flat Discount)" :"Unlimited"}
              className="admin-input disabled:opacity-40"
            />
          </div>
        </div>

        {/* SECTION 2: CUSTOMER & CATALOG TARGETING */}
        <div className="space-y-5">
          <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">groups</span>
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
          {formData.targetType ==="products" && (
            <div className="admin-card-inset p-4 space-y-3">
              <label className="admin-label">
                Select Eligible Catalog Products ({formData.targetProductIds.length} Selected)
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {products.length === 0 ? (
                  <p className="text-[12px] text-[var(--admin-text-tertiary)] italic">No products found in database</p>
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
                            <span className="font-semibold text-[var(--admin-text-primary)]">{p.title}</span>
                            <span className="text-[11px] text-[var(--admin-text-tertiary)] ml-2">₹{p.price}</span>
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
          {formData.targetType ==="categories" && (
            <div className="admin-card-inset p-4 space-y-3">
              <label className="admin-label">
                Select Eligible Storefront Categories ({formData.targetCategories.length} Selected)
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
                      <span className="font-semibold text-[var(--admin-text-primary)]">{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Targeted Loyalty Tiers Checklist */}
          {formData.targetType ==="tiers" && (
            <div className="admin-card-inset p-4 space-y-3">
              <label className="admin-label">
                Select Eligible Loyalty Membership Tiers ({formData.targetUserTiers.length} Selected)
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
                      <span className="font-semibold text-[var(--admin-text-primary)]">{tier} Member</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: DISPLAY CONTROLS */}
        <div className="space-y-5">
          <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">visibility</span>
            3. Storefront Visibility & Auto-Apply Settings
          </h2>
          <div className="admin-card-inset p-4 space-y-4">
            <label className="admin-label">
              Where should this coupon be displayed?
            </label>
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
                    <span className="text-[var(--admin-text-primary)] font-semibold">{loc.label}</span>
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
                <p className="text-[13px] font-semibold text-[var(--admin-text-primary)]">Mark as Featured Offer</p>
                <p className="text-[11px] text-[var(--admin-text-tertiary)]">Highlighted on promotion banners</p>
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
                <p className="text-[13px] font-semibold text-[var(--admin-text-primary)]">Auto-Apply at Checkout</p>
                <p className="text-[11px] text-[var(--admin-text-tertiary)]">Applies automatically if conditions match</p>
              </div>
            </label>
          </div>
        </div>

        {/* SECTION 4: LOYALTY WALLET CASHBACK */}
        <div className="space-y-5">
          <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">payments</span>
            4. Loyalty Wallet Cashback Perks
          </h2>
          <p className="text-[11px] text-[var(--admin-text-tertiary)]">
            Give customers promotional Siri Cash directly in their store wallets upon placing their orders. Admins can configure percentages, fixed credits, or hybrid reward perks!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="admin-label">Cashback Rate (%)</label>
              <input
                type="number"
                value={formData.cashbackPercentage}
                onChange={(e) => setFormData({ ...formData, cashbackPercentage: e.target.value })}
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

        {/* SECTION 5: SCHEDULING, LIMITS & STACKING */}
        <div className="space-y-5">
          <h2 className="text-[14px] font-bold text-[var(--admin-text-primary)] flex items-center gap-2 border-b border-[var(--admin-border-subtle)] pb-3">
            <span className="material-symbols-outlined text-[18px] text-[var(--admin-text-secondary)]">rule</span>
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

        {/* SECTION 6: PUBLISHING STATUS */}
        <div className="admin-card-inset p-4 rounded-[var(--admin-radius-lg)] max-w-sm">
          <AdminToggle
            label="Publishing Campaign Status"
            description="Enable to activate this promotional offer in production"
            checked={formData.isActive}
            onChange={() => setFormData({ ...formData, isActive: !formData.isActive })}
          />
        </div>

        {/* SUBMIT ACTIONS */}
        <div className="pt-6 flex items-center justify-end gap-3 border-t border-[var(--admin-border-subtle)]">
          <button
            type="button"
            onClick={handleCancelAction}
            className="admin-btn admin-btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="admin-btn admin-btn-primary disabled:opacity-50"
          >
            {saving ?"Saving..." : isEdit ?"Update Coupon" :"Create Coupon"}
          </button>
        </div>
      </motion.form>
    );


    return (
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="max-w-[850px] mx-auto space-y-6 pb-16"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center gap-4">
          <button
            onClick={handleCancelAction}
            className="admin-btn-icon w-10 h-10 min-h-0 bg-[var(--admin-surface)] border border-[var(--admin-border)]"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-[22px] font-bold text-[var(--admin-text-primary)] tracking-tight">
              {isEdit ?"Edit Coupon" :"Create Coupon"}
            </h2>
            <p className="text-[13px] text-[var(--admin-text-secondary)] mt-0.5">
              {isEdit ?"Update coupon settings" :"Set up a new coupon"}
            </p>
          </div>
        </motion.div>

        {formElement}
      </motion.div>
    );
}
